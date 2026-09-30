import { NextRequest } from 'next/server';
import { getProductsByIds } from '@/lib/db/product';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function GET(req: NextRequest) {
    try {
        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;
        const idsParam = req.nextUrl.searchParams.get('ids');

        if (!idsParam) return jsonNoStore({ success: false, error: 'No IDs provided', code: 'VALIDATION_ERROR' }, 400);

        const ids = idsParam.split(',').map((v) => Number(v.trim())).filter((v) => Number.isInteger(v));

        if (ids.length === 0) return jsonNoStore({ success: false, error: 'No valid IDs provided', code: 'VALIDATION_ERROR' }, 400);

        const products = await getProductsByIds(ids, requestedLocale);
        if (!products) return jsonNoStore('products not found', 404);

        return jsonNoStore(products, 200);

    } catch (err) {
        console.error('GET product by-ids route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
