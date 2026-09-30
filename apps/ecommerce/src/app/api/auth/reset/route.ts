import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getEnv, getCtx } from '@/lib/cloudflare/context';
import { MailSender } from '@/lib/emailSender';
import { renderResetPassword } from '@/lib/email/templates/account/reset-password';
import { getCachedConfig } from '@/lib/cache/config';
import { getUserByEmail } from '@/lib/db/user';
import { hashString } from '@/lib/cryptography';
import { SignJWT } from 'jose';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { DEFAULT_LANGUAGE, EMAIL_SUBJECTS } from '@/lib/constants';


export async function POST(req: NextRequest) {
    try {
        const env = getEnv();
        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;

        const isProduction = env.NEXTJS_ENV === 'production';
        const schema = z.email();
        const body = await req.json();
        const parsed = schema.safeParse(body);
        const genericResponse = jsonNoStore({ message: 'If the email address exists, we will send a link.' }, 200);

        if (!parsed.success) return genericResponse;

        const email = parsed.data;

        const user = await getUserByEmail(email);
        if (!user) return genericResponse;

        const token = await new SignJWT({
            uuid: user.uuid,
            email: user.email,
            pwv: await hashString(user.user_password),
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('30m')
            .sign(new TextEncoder().encode(env.JWT));

        const locale = resolveLocale(user.preferred_language) ?? requestedLocale;

        const config = await getCachedConfig(locale);
        if (!config) return jsonNoStore({ success: false, error: 'Failed to proccess', code: 'INTERNAL_ERROR' }, 500);

        const domain = isProduction ? `https://${config.domain}` : `https://${process.env.NEXT_PUBLIC_TEST_DOMAIN}`;
        const resetLink = `${domain}/${locale}/reset/password?token=${token}`;

        const html = await renderResetPassword({
            site_name: config.site_name,
            site_description: `${config.site_description ?? ''}`,
            domain: domain,
            resetLink: resetLink,
            user_name: user.user_name.trim().split(/\s+/)[0] ?? '',
            language: user.preferred_language
        });

        const subject = EMAIL_SUBJECTS['password_reset']?.[user.preferred_language] ?? EMAIL_SUBJECTS['password_reset'][DEFAULT_LANGUAGE];

        const ctx = getCtx();
        
        ctx.waitUntil(MailSender.sendEmail({
            type: 'account',
            to: user.email,
            subject,
            html,
        }).catch((err) => console.error('[account] Failed to send reset password email:', err)));

        return genericResponse;

    } catch (err) {
        console.error('POST auth reset route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
