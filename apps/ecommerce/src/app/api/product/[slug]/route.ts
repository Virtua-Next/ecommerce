import { NextRequest, NextResponse } from 'next/server';
import { getCachedProductBySlug } from '@/lib/cache/catalog';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;

        const product = await getCachedProductBySlug(slug, requestedLocale);
        if (!product) return jsonNoStore({ success: false, error: 'Product not found', code: 'NOT_FOUND' }, 404);

        // 60 sec + stale 5 mins
        return NextResponse.json(product, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });

    } catch (err) {
        console.error('GET product [slug] route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
