import { NextRequest } from 'next/server';
import { createProduct } from '@/lib/cache/catalog-admin';
import { CreateProductRequestSchema } from '@/lib/schemas/product';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { jsonNoStore, resolveLocale } from "@/lib/utils";
import { DEFAULT_LANGUAGE, ADMIN_PAGINATION_DEFAULT, ADMIN_PAGINATION_MAX_LIMIT } from '@/lib/constants';
import { adminAllProducts } from '@/lib/db/product-admin'


export async function GET(req: NextRequest) {
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

    const locale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) ?? 1);
    const limit = Math.min(ADMIN_PAGINATION_MAX_LIMIT, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) ?? ADMIN_PAGINATION_DEFAULT));

    const search = searchParams.get('search') ?? '';

    try {
        const products = await adminAllProducts({ locale, page, limit, search });

        return jsonNoStore(products, 200);

    } catch (err: any) {
        console.error('GET admin product route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

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
        const parsed = CreateProductRequestSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        const result = await createProduct(parsed.data);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'VALIDATION_ERROR' ? 400 : 500);

        return jsonNoStore(result.data, 201)

    } catch (err) {
        console.error('POST admin product route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
