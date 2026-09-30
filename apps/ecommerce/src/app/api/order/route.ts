import { NextRequest } from 'next/server';
import { createOrder } from '@/lib/db/order';
import { CreateOrderInput } from '@/lib/db/order';
import { requireLoged } from '@/lib/auth/require-loged';
import { jsonNoStore } from '@/lib/utils';
import { getUserIdByUuid } from '@/lib/db/auth';
import { PAYMENT_METHODS } from '@/lib/constants';
import { revalidateTag } from 'next/cache';


export async function POST(req: NextRequest) {
    try {
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const userId = await getUserIdByUuid(user.uuid);
        if (!userId) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const body: CreateOrderInput = await req.json();
        const { payment_method, installments, delivery_option, carrier_id, shipping_option, api_id,
            address_id, items, expected_shipping_value, cardData, pixData, ticketData } = body;

        const gatewayPayloads = [cardData, pixData, ticketData].filter(Boolean);
        if (gatewayPayloads.length > 1) {
            return jsonNoStore({ success: false, error: 'Only one payment method per order', code: 'VALIDATION_ERROR' }, 400);
        }

        if (!payment_method) return jsonNoStore({ success: false, error: 'Método de pagamento não informado', code: 'VALIDATION_ERROR' }, 400);

        if (!items || items.length === 0) return jsonNoStore({ success: false, error: 'Carrinho vazio', code: 'VALIDATION_ERROR' }, 400);

        if (!PAYMENT_METHODS.includes(payment_method)) return jsonNoStore({ success: false, error: 'Método de pagamento inválido', code: 'VALIDATION_ERROR' }, 400);

        if (payment_method !== 'card' && installments > 1) return jsonNoStore({ success: false, error: 'Parcelamento somente para cartão de crédito', code: 'VALIDATION_ERROR' }, 400);

        if (payment_method === 'cash' && delivery_option !== 'pickup') return jsonNoStore({ success: false, error: 'Pagamento em dinheiro apenas para retirada na loja', code: 'VALIDATION_ERROR' }, 400);

        if (delivery_option === 'delivery' && !address_id) return jsonNoStore({ success: false, error: 'Endereço não especificado', code: 'VALIDATION_ERROR' }, 400);

        const orderData: CreateOrderInput = {
            user_id: userId,
            payment_method,  // real: 'card' | 'pix' | 'boleto' | 'cash' | 'transfer'
            installments: payment_method === 'card' ? (installments ?? 1) : 1,
            delivery_option: delivery_option ?? 'pickup',
            carrier_id,
            shipping_option,  // id da opção cotada (vem do front, revalidada no backend)
            expected_shipping_value, // valor exibido no frontend no momento da compra 
            api_id, // vazio = offline
            address_id: delivery_option === 'delivery' ? address_id : undefined,
            items: items.map((i: any) => ({ product_id: i.product_id, quantity: i.quantity })),
            cardData:   payment_method === 'card'   ? cardData   : undefined,
            pixData:    payment_method === 'pix'    ? pixData    : undefined,
            ticketData: payment_method === 'boleto' ? ticketData : undefined,
        };

        const result = await createOrder(orderData);

        if (!result.success) {
            return jsonNoStore(
                { success: false, error: result.error ?? 'Erro ao criar pedido', code: result.code },
                result.code === 'VALIDATION_ERROR' ? 400 : result.code === 'NOT_FOUND' ? 404 : 500
            );
        }

        revalidateTag('products', { expire: 0 });
        revalidateTag('admin-products', { expire: 0 });

        return jsonNoStore({ success: true, data: result.data, message: result.message }, 200);

    } catch (err: any) {
        console.error('POST order route:', err);
        return jsonNoStore({ success: false, error: err.message ?? 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
