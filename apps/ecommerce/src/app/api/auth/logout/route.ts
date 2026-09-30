import { getEnv } from '@/lib/cloudflare/context';
import { jsonNoStore } from '@/lib/utils';


export async function POST() {
    try {
        const env = getEnv();
        const response = jsonNoStore({ success: true, message: 'Logout successful' }, 200);
        response.headers.set('Cache-Control', 'no-store');
        response.cookies.set('token', '', {
            httpOnly: true,
            secure: env.NEXTJS_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        });

        return response;

    } catch (err) {
        console.error('POST auth logout route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
