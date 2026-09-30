import { ChangePasswordSchema } from '@/lib/schemas/user';
import { changePassword } from '@/lib/db/user';
import { jsonNoStore } from '@/lib/utils';
import { getEnv } from '@/lib/cloudflare/context';
import { NextRequest } from 'next/server';
import { requireLoged } from '@/lib/auth/require-loged';


export async function PUT(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
    try {
        const env = getEnv();
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const { uuid } = await params;
        if (!uuid) return jsonNoStore({ success: false, error: 'Invalid uuid', code: 'VALIDATION_ERROR' }, 400);

        const body = await req.json();
        const parsed = ChangePasswordSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        if (uuid !== user.uuid) {
            const response = jsonNoStore({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, 403);

            response.cookies.set('token', '', {
                httpOnly: true,
                secure: env.NEXTJS_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 0,
            });
            return response;
        }

        const result = await changePassword(user.uuid, parsed.data);

        if (!result.success) {
            const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'NO_CHANGES' ? 409 : 500;
            return jsonNoStore({ success: false, error: result.error, code: result.code }, status);
        }

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('PUT user profile [uuid] password route:', err);
        return jsonNoStore({ success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' }, 500);
    }
}
