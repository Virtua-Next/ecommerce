import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from 'jose';
import { getEnv } from '@/lib/cloudflare/context';
import { confirmPassword, getUserByEmail } from '@/lib/db/user';
import { hashString } from '@/lib/cryptography';
import { jsonNoStore } from '@/lib/utils';


const schema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
    try {
        const env = getEnv();
        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid data', code: 'VALIDATION_ERROR' }, 400);

        const { token, newPassword } = parsed.data;

        let payload: { uuid: string; email: string; pwv: string };
        try {
            const { payload: verified } = await jwtVerify(token, new TextEncoder().encode(env.JWT));
            payload = verified as any;
        } catch {
            return jsonNoStore({ success: false, error: 'Invalid or expired link.', code: 'INVALID_TOKEN' }, 400);
        }

        const user = await getUserByEmail(payload.email);
  
        if (!user || (await hashString(user.user_password)) !== payload.pwv) return jsonNoStore({ success: false, error: 'Invalid or expired link', code: 'INVALID_TOKEN' }, 400);

        const result = await confirmPassword(user.uuid, newPassword);
        if (!result.success) return jsonNoStore({ success: false, error: 'Failed to update user password', code: 'INTERNAL_ERROR' }, 500);

        return jsonNoStore({ success: true, message: 'Password reset successfully.' }, 200);

    } catch (err) {
        console.error('POST auth reset confirm route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
