import { unstable_cache } from 'next/cache';
import { listCarriers } from '@/lib/db/carrier';


// list all
const getCachedCarriersInternal = unstable_cache(
    async (country: string, locale: string) => listCarriers(country, locale),
    ['carriers'],
    { revalidate: 86400, tags: ['carriers'] }
)
export async function getCachedCarriers(country: string, locale: string) {
    return await getCachedCarriersInternal(country, locale);
}
