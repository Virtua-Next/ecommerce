import { unstable_cache } from 'next/cache';
import { listPaymentApis, listPaymentMethods } from '@/lib/db/payment';


// ============ PAYMENT APIS ============


// list all
const getCachedPaymentAPIsInternal = unstable_cache(
    async (locale: string) => listPaymentApis(locale),
    ['payment-apis'],
    { revalidate: false, tags: ['payment-apis'] }
);

export async function getCachedPaymentAPIs(locale: string) {
    return getCachedPaymentAPIsInternal(locale);
}


// ============ PAYMENT METHODS ============


// list all
const getCachedPaymentMethodsInternal = unstable_cache(
    async (locale: string) => listPaymentMethods(locale),
    ['payment-methods'],
    { revalidate: false, tags: ['payment-methods'] }
);

export async function getCachedPaymentMethods(locale: string) {
    return getCachedPaymentMethodsInternal(locale);
}
