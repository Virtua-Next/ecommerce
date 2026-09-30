import { NextRequest, NextResponse } from 'next/server';
import { getCachedPaginatedProducts } from '@/lib/cache/catalog';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale'));
        const locale = requestedLocale ?? DEFAULT_LANGUAGE;
        const page = parseInt(searchParams.get('page') ?? '1');
        const limit = parseInt(searchParams.get('limit') ?? '12');
        const category = searchParams.get('category') ?? undefined;
        const brand = searchParams.get('brand') ?? undefined;

        const result = await getCachedPaginatedProducts({ locale, page, limit, category, brand });

        return NextResponse.json(
            {
                success: true,
                data: result.products,
                pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' // 60 sec + stale 5 mins
                },
                status: 200
            });

    } catch (err) {
        console.error('GET product route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
