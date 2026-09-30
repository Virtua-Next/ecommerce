import { handleMercadoPagoWebhook } from '@/lib/mercadopago/handleMercadopagoEvent';
import { jsonNoStore } from '@/lib/utils';
import { revalidateTag } from 'next/cache';


export async function POST(req: Request) {
    try {
        const { response, revProdCache } = await handleMercadoPagoWebhook(req);

        if (revProdCache) {
            revalidateTag('products', 'max');
            revalidateTag('admin-products', 'max');
        }

        return response;

    } catch (err) {
        console.error('POST Webhook mercadopago-webhook route:', err);
        return jsonNoStore({ error: 'Internal error' }, 500);
    }
}
