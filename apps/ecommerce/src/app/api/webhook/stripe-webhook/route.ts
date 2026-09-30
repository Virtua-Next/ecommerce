import { NextRequest } from 'next/server';
import { jsonNoStore } from '@/lib/utils';
import { getWebhookSecretByProvider } from '@/lib/db/payment-admin';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/stripe';
import { handleStripeEvent } from '@/lib/stripe/handleStripeEvent';
import { revalidateTag } from 'next/cache';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        console.error('[stripe-webhook] Missing stripe-signature header');
        return jsonNoStore({ success: false, error: 'Missing signature' }, 400);
    }

    let stripe: Stripe;
    try {
        stripe = await getStripe();
    } catch (err: any) {
        console.error('POST webhook stripe-webhook route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }

    const webhook_secret = await getWebhookSecretByProvider('stripe');
    if (!webhook_secret) return jsonNoStore({ error: 'Webhook not configured', code: 'INTERNAL_ERROR' }, 500);

    let event: Stripe.Event;
    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhook_secret);
    } catch (err: any) {
        console.error('POST webhook stripe-webhook route:', err);
        return jsonNoStore({ success: false, error: 'Invalid signature', code: 'VALIDATION_ERROR' }, 400);
    }

    try {
        const result = await handleStripeEvent(event);

        if (result.revProdCache) {
            revalidateTag('products', { expire: 0 });
            revalidateTag('admin-products', { expire: 0 });
        }

    } catch (err: any) {
        console.error('[stripe-webhook] Error processing event:', {
            type: event.type,
            id: event.id,
            error: err.message,
        });
    }

    return jsonNoStore({ received: true }, 200);
}
