import { NextRequest } from 'next/server';
import { updateCarrier, deleteCarrier } from '@/lib/cache/carrier-admin';
import { UpdateCarrierRequestSchema } from '@/lib/schemas/carrier';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { jsonNoStore } from '@/lib/utils';
import { adminCarrierById } from '@/lib/db/carrier-admin';


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        const carrierId = Number(id);
        if (!Number.isInteger(carrierId)) return jsonNoStore({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }, 400);

        const carrier = await adminCarrierById(carrierId);
        if (!carrier) return jsonNoStore(carrier, 404);

        return jsonNoStore(carrier, 200);

    } catch (err) {
        console.error('GET admin carrier route', err);
        return jsonNoStore({ success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' }, 500);
    }

}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        const carrierId = Number(id);
        if (!Number.isInteger(carrierId)) return jsonNoStore({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }, 400);

        const body = await req.json();
        const parsed = UpdateCarrierRequestSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        const result = await updateCarrier(carrierId, parsed.data);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'NOT_FOUND' ? 404 : result.code === 'NO_CHANGES' ? 409 : 500);

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('PUT admin carrier route:', err);
        return jsonNoStore({ success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' }, 500);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        const carrierId = Number(id);
        if (!Number.isInteger(carrierId)) return jsonNoStore({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }, 400);

        const result = await deleteCarrier(carrierId);

        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'NOT_FOUND' ? 404 : result.code === 'VALIDATION_ERROR' ? 400 : 500);

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('DELETE admin carrier route:', err);
        return jsonNoStore({ success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' }, 500);
    }
}
