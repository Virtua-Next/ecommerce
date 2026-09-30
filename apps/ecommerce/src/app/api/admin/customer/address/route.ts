import { NextRequest } from 'next/server';
import { jsonNoStore } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { CreateAddressSchema } from '@/lib/schemas/user';
import { adminCreateAddress } from '@/lib/db/user-admin';


export async function POST(req: NextRequest) {
    try {
        const env = getEnv();
        const auth = await requireAdmin(req, env);
        if (!auth.ok) {
            const response = jsonNoStore({ success: false, error: 'Unauthorized' }, 403);
            if (auth.status === 403) {
                response.cookies.set('token', '', {
                    httpOnly: true,
                    secure: env.NEXTJS_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 0,
                });
            }
            return response;
        }

        const body = await req.json();
        const parsed = CreateAddressSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid data', code: 'VALIDATION_ERROR' }, 400);

        const result = await adminCreateAddress(parsed.data);

        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'NOT_FOUND' ? 404 : 500);

        return jsonNoStore(result.data, 201);

    } catch (err) {
        console.error('POST admin customer address route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
