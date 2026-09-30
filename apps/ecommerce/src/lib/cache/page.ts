import { unstable_cache } from "next/cache";
import { getCachedPageBySlug as getCachedPageBySlugDb } from "@/lib/db/page";


// by slug
const getCachedPageBySlugInternal = unstable_cache(
    async (slug: string, locale: string) => getCachedPageBySlugDb(slug, locale),
    ['page-slug'],
    {
        revalidate: 86400,
        tags: ['pages']
    }
);

export async function getCachedPageBySlug(slug: string, locale: string) {
    return getCachedPageBySlugInternal(slug, locale);
}
