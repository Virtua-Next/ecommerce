
import { getDb } from '@/lib/cloudflare/context';
import { getMercadoPago, classifyMpTransactionStatus, verifyMercadoPagoSignature, resolveMpMethod } from './mercadopago';
import { transitionOrder } from '@/lib/db/order-transition';
import { sendOrderStatusEmail } from '@/lib/email/order-emails';


type MpOrderNotification = {
    action: string;
    type: string;
    data: {
        id: string;
        external_reference?: string;
        status?: string;
        status_detail?: string;
        total_amount?: string;
        total_paid_amount?: string;
        transactions?: {
            payments?: Array<{
                id: string;
                amount?: string;
                paid_amount?: string;
                status: string;
                status_detail?: string;
                payment_method?: { id: string; type: string; installments?: number };
            }>;
        };
    };
};

type WebhookResult = { response: Response; revProdCache: boolean };
const done = (response: Response, revProdCache = false): WebhookResult => ({ response, revProdCache });

export async function handleMercadoPagoWebhook(request: Request): Promise<WebhookResult> {
    const db = getDb();
    const url = new URL(request.url);
    const dataIdFromQuery = url.searchParams.get('data.id');

    const body = await request.json().catch(() => null) as MpOrderNotification | null;

    if (!body || body.type !== 'order' || !body.data?.id) {
        console.warn('[MercadoPago] Webhook ignorado (formato inesperado):', body);
        return done(new Response('Evento ignorado', { status: 200 }));
    }

    const dataId = dataIdFromQuery ?? body.data.id;

    let webhookSecret: string | undefined;
    try {
        ({ webhookSecret } = await getMercadoPago());
    } catch (err) {
        console.error('[MercadoPago] Webhook recebido mas Mercado Pago não configurado.', err);
        return done(new Response('Webhook não configurado corretamente.', { status: 400 }));
    }

    if (!webhookSecret) {
        // Decisão: falha fechada. Sem secret configurado, não dá pra confiar
        // na origem da notificação — melhor rejeitar do que processar às cegas.
        console.error('[MercadoPago] webhookSecret ausente — configure em Webhooks > Configurar notificação.');
        return done(new Response('Webhook não configurado corretamente.', { status: 400 }));
    }

    const validSignature = await verifyMercadoPagoSignature({
        xSignature: request.headers.get('x-signature'),
        xRequestId: request.headers.get('x-request-id'),
        dataId,
        secret: webhookSecret,
    });

    if (!validSignature) {
        console.warn('[MercadoPago] Assinatura inválida no webhook.');
        return done(new Response('Assinatura inválida.', { status: 401 }));
    }

    const order = body.data;
    const externalReference = order.external_reference;

    if (!externalReference) {
        console.warn('[MercadoPago] Referência externa não encontrada:', order);
        return done(new Response('Referência do pedido não encontrada.', { status: 400 }));
    }

    const orderId = parseInt(externalReference, 10);
    if (isNaN(orderId)) {
        console.warn('[MercadoPago] ID do pedido inválido:', externalReference);
        return done(new Response('ID do pedido inválido.', { status: 400 }));
    }

    const transaction = order.transactions?.payments?.[0];
    const status = transaction?.status ?? order.status ?? 'pending';
    const statusDetail = transaction?.status_detail ?? order.status_detail;
    const paymentIntentId = order.id;

    const amount = Number(order.total_paid_amount ?? transaction?.paid_amount ?? transaction?.amount ?? order.total_amount ?? 0);

    const method = resolveMpMethod(transaction?.payment_method);
    const outcome = classifyMpTransactionStatus(status, statusDetail);
    let revalidate = false;

    async function upsertPayment() {
        try {
            const existing = await db
                .prepare('SELECT id FROM payment WHERE external_id = ?')
                .bind(paymentIntentId)
                .first();

            if (existing) {
                await db
                    .prepare(`UPDATE payment SET payment_status = ?, method = ?, gateway_status = ?, paid_at = COALESCE(paid_at, ?), charged_amount = COALESCE(charged_amount, ?) WHERE external_id = ?`)
                    .bind(outcome, method, status, outcome === 'approved' ? new Date().toISOString() : null, outcome === 'approved' ? amount : null, paymentIntentId)
                    .run();
            } else {
                await db
                    .prepare(`INSERT INTO payment (order_id, api_provider, method, payment_status, amount, external_id, gateway_status, paid_at, charged_amount) VALUES (?, 'mercadopago', ?, ?, ?, ?, ?, ?, ?)`)
                    .bind(orderId, method, outcome, amount, paymentIntentId, status, outcome === 'approved' ? new Date().toISOString() : null, outcome === 'approved' ? amount : null)
                    .run();
            }
        } catch (err: any) {
            if (err.message?.includes('FOREIGN KEY constraint failed') || err.message?.includes('SQLITE_CONSTRAINT')) {
                console.error('[MercadoPago] Order not found on register payment');
            } else {
                console.error('[MercadoPago] Unexpected error on upsertPayment:', err);
            }
        }
    }

    async function applyTransition(target: Parameters<typeof transitionOrder>[1]) {
        const transition = await transitionOrder(orderId, target);
        if (!transition.success) {
            console.error(`[MercadoPago] Failed to move order ${orderId} to ${target}:`, transition.error, transition.code);
            return;
        }
        if (transition.code !== 'NO_CHANGE') {
            await sendOrderStatusEmail(orderId, target);
        }
        if (transition.revProdCache) revalidate = true;
    }

    try {
        await upsertPayment();

        switch (outcome) {
            case 'approved': {
                await applyTransition('confirmed');
                break;
            }
            case 'rejected': {
                await applyTransition('payment_error');
                break;
            }
            case 'canceled': {
                await applyTransition('canceled');
                break;
            }
            case 'pending':
                // action_required (Pix/boleto/3DS) ou processing — aguarda próxima notificação, sem transição.
                break;
        }

        return done(new Response('Webhook processed', { status: 200 }), revalidate);


    } catch (error) {
        console.error('[MercadoPago] Error processing webhook:', error);
        return done(Response.json({ error: 'Error processing webhook event' }, { status: 500 }), revalidate);
    }
}
