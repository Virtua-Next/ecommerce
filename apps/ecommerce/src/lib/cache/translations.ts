import { unstable_cache } from 'next/cache';
import { translateSlug } from '../db/translation';


// ============ SLUG TRANSLATION ============


const getCachedTranslateSlugInternal = unstable_cache(
    async (entityType: 'product' | 'category' | 'brand' | 'page', slug: string, fromLocale: string, toLocale: string) =>
        translateSlug(entityType, slug, fromLocale, toLocale),
    ['slug-translation'],
    {
        revalidate: 86400, // 24h — slug traduzido raramente muda
        tags: ['translations']
    }
);

export async function getCachedTranslateSlug(
    entityType: 'product' | 'category' | 'brand' | 'page',
    slug: string,
    fromLocale: string,
    toLocale: string
): Promise<string | null> {
    return getCachedTranslateSlugInternal(entityType, slug, fromLocale, toLocale);
}
