import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UpdateUserSchema } from '@/lib/schemas/user';
import { jsonNoStore } from '@/lib/utils';
import { hashPassword } from '@/lib/cryptography';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { adminDeleteCustomer, adminUpdateCustomer } from '@/lib/db/user-admin';


const AdminUpdateSchema = UpdateUserSchema.extend({
    user_password: z.string().min(8).optional(),
});

interface RouteParams {
    params: Promise<{ uuid: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
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

        const { uuid } = await params;
        const body = await req.json();

        const parsed = AdminUpdateSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid data', code: 'VALIDATION_ERROR' }, 400);

        const data = { ...parsed.data };
        if (data.user_password) data.user_password = await hashPassword(data.user_password);

        const result = await adminUpdateCustomer(uuid, data);

        if (!result.success) {
            const constraintErr = ['DUPLICATE_EMAIL', 'DUPLICATE_TAX_ID', 'DUPLICATE_PHONE'].includes(result.code ?? '');
            const status = constraintErr ? 409 : result.code === 'NOT_FOUND' ? 404 : result.code === 'NO_CHANGES' ? 400 : 500;
            return jsonNoStore({ success: false, error: result.error, code: result.code }, status);
        }

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('PUT admin customer [uuid] route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

        const { uuid } = await params;
        const result = await adminDeleteCustomer(uuid);

        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'NOT_FOUND' ? 404 : 500);

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('DELETE admin customer [uuid] route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
