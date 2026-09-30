import { NextRequest } from 'next/server';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { listOrdersAdmin } from '@/lib/db/order-admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE, ADMIN_PAGINATION_DEFAULT } from '@/lib/constants';
export const runtime = 'nodejs';


export async function GET(req: NextRequest) {
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

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') ?? 'all';
        const search = searchParams.get('search') ?? '';
        const page = parseInt(searchParams.get('page') ?? '1');
        const limit = parseInt(searchParams.get('limit') ?? String(ADMIN_PAGINATION_DEFAULT));
        const locale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;

        const result = await listOrdersAdmin({ status, search, page, limit, language: locale });

        return jsonNoStore({
            success: true,
            data: {
                orders: result.orders,
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        }, 200);

    } catch (err: any) {
        console.error('GET admin order route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}