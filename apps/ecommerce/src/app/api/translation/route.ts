import { NextRequest, NextResponse } from 'next/server';
import { getCachedTranslateSlug } from '@/lib/cache/translations';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { TranslationEntityTypes } from '@/lib/types/generic';
import { DEFAULT_LANGUAGE, TRANSLATION_ENTITY_TYPES } from '@/lib/constants';


export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const slug = searchParams.get('slug');
        const entityType = searchParams.get('entityType');
        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;
        const nextLocale = searchParams.get('nextLocale');

        if (!slug || !entityType || !nextLocale) return jsonNoStore({ success: false, error: 'Invalid data', code: 'VALIDATION_ERROR' }, 400);

        if (!TRANSLATION_ENTITY_TYPES.includes(entityType as TranslationEntityTypes)) return jsonNoStore({ success: false, error: `entityType must be one of ${TRANSLATION_ENTITY_TYPES.join(', ')}`, code: 'VALIDATION_ERROR' }, 400);

        const translatedSlug = await getCachedTranslateSlug(entityType as TranslationEntityTypes, slug, requestedLocale, nextLocale);

        if (!translatedSlug) return jsonNoStore({ success: false, error: 'Slug not found', code: 'NOT_FOUND' }, 404);

        return NextResponse.json(
            { slug: translatedSlug },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
                }
            }
        );

    } catch (err) {
        console.error('GET translation route:', err);
        return jsonNoStore({ success: false, error: 'Internal server Error', code: 'INTERNAL_ERROR' }, 500);
    }
}
