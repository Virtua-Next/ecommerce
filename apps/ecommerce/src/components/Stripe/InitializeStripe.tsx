'use client';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { apiFetch, extractData } from '@/lib/utils';


export const initializeStripe = async (): Promise<Stripe | null> => {
    const abortController = new AbortController();

    try {
        const result = await apiFetch('/api/payment', { method: 'GET', signal: abortController.signal });
        const data = extractData(result, 'array')

        const stripeApi = data.find((api: any) => api.api_provider === 'stripe');

        if (!stripeApi) {
            console.error('Stripe config not found');
            return null;
        }

        const stripe = await loadStripe(stripeApi.public_key);
        return stripe ?? null;

    } catch (error: any) {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return null;
        console.error('Error on initialize Stripe:', error);
        return null;
    }
};
