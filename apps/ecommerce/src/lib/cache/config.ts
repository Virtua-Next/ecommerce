import { getConfig } from '@/lib/db/config';
import { unstable_cache } from 'next/cache';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


const getCachedConfigInternal = unstable_cache(
    async (locale: string) => getConfig(locale),
    ['config'],
    { revalidate: 86400, tags: ['config'] }
);

export async function getCachedConfig(locale?: string) {
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;
    return getCachedConfigInternal(effectiveLocale);
}
