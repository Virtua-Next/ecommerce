import { revalidateTag } from 'next/cache';
import { clearStripeInstance } from '@/lib/stripe/stripe';
import { clearMercadoPagoInstance } from '@/lib/mercadopago/mercadopago';
import { ICreatePaymentApiPayload, ICreatePaymentMethodPayload, IUpdatePaymentApiPayload, IUpdatePaymentMethodPayload } from '@/lib/schemas/payment';


// ============ PAYMENT APIS ============


// create
export async function createPaymentAPI(data: ICreatePaymentApiPayload) {
    const { createPaymentAPI } = await import('@/lib/db/payment-admin');
    const result = await createPaymentAPI(data);
    if (result.success) {
        clearStripeInstance();
        clearMercadoPagoInstance();
        revalidateTag('payment-apis', { expire: 0 });
    }
    return result;
}

// update
export async function updatePaymentAPI(id: number, data: IUpdatePaymentApiPayload) {
    const { updatePaymentAPI } = await import('@/lib/db/payment-admin');
    const result = await updatePaymentAPI(id, data);
    if (result.success) {
        clearStripeInstance();
        clearMercadoPagoInstance();
        revalidateTag('payment-apis', { expire: 0 });
        revalidateTag(`payment-api:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deletePaymentAPI(id: number) {
    const { deletePaymentAPI } = await import('@/lib/db/payment-admin');
    const result = await deletePaymentAPI(id);
    if (result.success) {
        clearStripeInstance();
        clearMercadoPagoInstance();
        revalidateTag('payment-apis', { expire: 0 });
        revalidateTag(`payment-api:${id}`, { expire: 0 });
    }
    return result;
}


// ============ PAYMENT METHODS ============


// create
export async function createPaymentMethod(data: ICreatePaymentMethodPayload) {
    const { createPaymentMethod } = await import('@/lib/db/payment-admin');
    const result = await createPaymentMethod(data);
    if (result.success) {
        revalidateTag('payment-methods', { expire: 0 });
        revalidateTag('payment-apis', { expire: 0 });
    }
    return result;
}

// update
export async function updatePaymentMethod(id: number, data: IUpdatePaymentMethodPayload) {
    const { updatePaymentMethod } = await import('@/lib/db/payment-admin');
    const result = await updatePaymentMethod(id, data);
    if (result.success) {
        revalidateTag('payment-methods', { expire: 0 });
        revalidateTag(`payment-method:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deletePaymentMethod(id: number) {
    const { deletePaymentMethod } = await import('@/lib/db/payment-admin');
    const result = await deletePaymentMethod(id);
    if (result.success) {
        revalidateTag('payment-methods', { expire: 0 });
        revalidateTag(`payment-method:${id}`, { expire: 0 });
    }
    return result;
}
