import { publicAllSlides } from '@/lib/db/slide';
import { publicAllFooters } from '@/lib/db/footer';
import { unstable_cache } from 'next/cache';


// ============ SLIDES (PUBLIC) ============


const getCachedPublicAllSlidesInternal = unstable_cache(
    async (locale: string) => publicAllSlides(locale),
    ['public-slides'],
    { revalidate: 86400, tags: ['slides'] }
);

export async function getCachedPublicAllSlides(locale: string) {
    return getCachedPublicAllSlidesInternal(locale);
}

// ============ FOOTERS (PUBLIC) ============


const getCachedPublicAllFootersInternal = unstable_cache(
    async (locale: string) => publicAllFooters(locale),
    ['public-footers'],
    { revalidate: 86400, tags: ['footers'] }
);

export async function getCachedPublicAllFooters(locale: string) {
    return getCachedPublicAllFootersInternal(locale);
}
