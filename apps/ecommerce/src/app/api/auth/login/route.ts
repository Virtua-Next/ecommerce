import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { getEnv } from '@/lib/cloudflare/context';
import { authenticateUser } from '@/lib/db/auth';
import { ILogin } from '@/lib/schemas/login';
import { jsonNoStore } from '@/lib/utils';


export async function POST(req: NextRequest) {
    try {
        const env = getEnv();
        const isProduction = env.NEXTJS_ENV === 'production';

        const body = await req.json();

        const { user_email, user_password } = body as ILogin;
        if (!user_email || !user_password) return jsonNoStore({ success: false, error: 'Email and password required', code: 'MISSING_CREDENTIALS' }, 400);


        const user = await authenticateUser(user_email, user_password);

        if (!user) return jsonNoStore({ success: false, error: 'Email or password invalid', code: 'INVALID_CREDENTIALS' }, 401);

        if (!user.active) return jsonNoStore({ success: false, error: 'Inactive user', code: 'INACTIVE_USER' }, 403);

        if (!env.JWT) return jsonNoStore({ success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, 500);

        const token = await new SignJWT({
            uuid: user.uuid,
            profile_id: user.profile_id,
            email: user.email,
            user_name: user.user_name,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(new TextEncoder().encode(env.JWT));

        const cookieStore = await cookies();
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        const userResponse = {
            uuid: user.uuid,
            profile_id: user.profile_id,
            email: user.email,
            user_name: user.user_name,
        };

        return jsonNoStore({ success: true, message: 'Login successful!', data: userResponse, }, 200);

    } catch (err) {
        console.error('POST auth login route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
