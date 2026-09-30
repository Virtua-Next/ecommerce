import { NextRequest } from 'next/server';
import { jsonNoStore } from '@/lib/utils';
import { updateOrderAdmin } from '@/lib/db/order-admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { revalidateTag } from 'next/cache';
export const runtime = 'nodejs';


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
        const orderId = parseInt(id);
        if (!orderId) return jsonNoStore({ success: false, error: 'Invalid order ID', code: 'VALIDATION_ERROR' }, 400);

        const body: any = await req.json();

        const result = await updateOrderAdmin(orderId, body);

        if (!result.success) return jsonNoStore(result, 500);

        if (result.revProdCache) {
            revalidateTag('products', { expire: 0 });
            revalidateTag('admin-products', { expire: 0 });
        }

        return jsonNoStore(result, 200);

    } catch (err: any) {
        console.error('PUT admin order [id] route:', err.message);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
