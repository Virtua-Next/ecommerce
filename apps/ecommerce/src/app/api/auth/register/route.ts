import { NextRequest } from 'next/server';
import { RegisterPayloadSchema } from '@/lib/schemas/user';
import { COUNTRY_CONFIGS } from '@/lib/schemas/country-configs';
import { CountryCode } from '@/lib/types/generic';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { SignJWT } from 'jose';
import { hashPassword } from '@/lib/cryptography';
import { getCachedConfig } from '@/lib/cache/config';
import { DEFAULT_LANGUAGE, EMAIL_SUBJECTS } from '@/lib/constants';
import { renderRegisterTemplate } from '@/lib/email/templates/account/register';
import { MailSender } from '@/lib/emailSender';
import { getEnv, getCtx } from '@/lib/cloudflare/context';


export async function POST(req: NextRequest) {
    try {
        const env = getEnv();
        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;
        const isProduction = env.NEXTJS_ENV === 'production';

        const body = await req.json();
        const parsed = RegisterPayloadSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid data', code: 'VALIDATION_ERROR' }, 400);

        const { newUser, address } = parsed.data;
        const configCountry = COUNTRY_CONFIGS[newUser.country as CountryCode];

        if (newUser.tax_id) {
            if (!configCountry.validateTaxId(newUser.tax_id)) {
                return jsonNoStore({ success: false, error: `Invalid ${configCountry.taxIdLabel}`, code: 'TAX_ID_VALIDATION_ERROR' }, 400);
            }
        } else if (configCountry.taxIdRequired) {
            return jsonNoStore({ success: false, error: `${configCountry.taxIdLabel} required`, code: 'TAX_ID_REQUIRED' }, 400);
        }

        const locale = requestedLocale ?? DEFAULT_LANGUAGE;

        const config = await getCachedConfig(locale);
        if (!config) return jsonNoStore({ success: false, error: 'Failed to process', code: 'INTERNAL_ERROR' }, 500);

        newUser.user_password = await hashPassword(newUser.user_password);

        const safeUser = { ...newUser, profile_id: 2, active: true };

        const token = await new SignJWT({ user: safeUser, address })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(new TextEncoder().encode(env.JWT));

        const domain = isProduction ? `https://${config.domain}` : `https://${process.env.NEXT_PUBLIC_TEST_DOMAIN}`;

        const confirmLink = `${domain}/${locale}/register/confirm?token=${token}`;

        const html = await renderRegisterTemplate({
            site_name: config.site_name,
            site_description: `${config.site_description ?? ''}`,
            domain: domain,
            confirmLink: confirmLink,
            user_name: newUser.user_name.trim().split(/\s+/)[0] ?? '',
            language: newUser.preferred_language
        });

        const subject = EMAIL_SUBJECTS['account_register']?.[safeUser.preferred_language] ?? EMAIL_SUBJECTS['account_register'][DEFAULT_LANGUAGE];

        const ctx = getCtx();
        
        ctx.waitUntil(MailSender.sendEmail({
            type: 'account',
            to: newUser.email,
            html,
            subject,
        }).catch((err) => console.error('[account] Failed to send register confirmation email:', err)));

        return jsonNoStore({ message: 'An e-mail has been sent to confirm.' }, 200);

    } catch (err) {
        console.error('POST auth register route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
