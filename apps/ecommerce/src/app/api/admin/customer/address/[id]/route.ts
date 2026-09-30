import { NextRequest } from 'next/server';
import { jsonNoStore } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth/require-admin'
import { getEnv } from '@/lib/cloudflare/context';
import { UpdateAddressSchema } from '@/lib/schemas/user';
import { adminDeleteAddress, adminUpdateAddress } from '@/lib/db/user-admin';


interface RouteParams {
    params: Promise<{ id: string }>;
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

        const { id } = await params;
        const addressId = Number(id);
        if (!Number.isInteger(addressId) || addressId <= 0) return jsonNoStore({ success: false, error: 'Invalid address id', code: 'VALIDATION_ERROR' }, 400);

        const body = await req.json();
        const parsed = UpdateAddressSchema.safeParse(body);

        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid data', code: 'VALIDATION_ERROR' }, 400);

        const result = await adminUpdateAddress(addressId, parsed.data);
        if (!result.success) {
            const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'NO_CHANGES' ? 400 : result.code === 'MUST_HAVE_PRIMARY' ? 409 : 500;
            return jsonNoStore({ success: false, error: result.error, code: result.code }, status);
        }

        return jsonNoStore(result.data, 200);

    } catch (err) {
        console.error('PUT admin customer address [id] route:', err);
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

        const { id } = await params;
        const addressId = Number(id);
        if (!Number.isInteger(addressId) || addressId <= 0) return jsonNoStore({ success: false, error: 'Invalid address id', code: 'VALIDATION_ERROR' }, 400);

        const result = await adminDeleteAddress(addressId);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'NOT_FOUND' ? 404 : 500);

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('DELETE admin customer address [id] route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
