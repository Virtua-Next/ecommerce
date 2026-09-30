import Stripe from 'stripe';
import { getCtx, getDb } from '@/lib/cloudflare/context';
import { transitionOrder } from '../db/order-transition';
import { sendOrderStatusEmail } from '../email/order-emails';
import { resolvePaymentMethodType } from './stripe';
import { DEFAULT_LANGUAGE, EMAIL_SUBJECTS } from '../constants';
import { renderPaymentInstructionsTemplate } from '../email/templates/order/payment-instructions';
import { MailSender } from '../emailSender';
import { getAdminConfig } from '../db/config-admin';
import { SupportedLanguage } from '../types/generic';
import { getFullOrderById } from '../db/order';


type StripeOutcome = 'approved' | 'rejected' | 'canceled' | 'pending';

export async function handleStripeEvent(event: Stripe.Event) {
    const db = getDb();

    async function upsertPayment(payment: { paymentIntentId: string; outcome: StripeOutcome; gatewayStatus: string; amount: number; chargedAmount?: number; orderId: number; method: string; }) {
        try {
            const existing = await db
                .prepare('SELECT id FROM payment WHERE external_id = ?')
                .bind(payment.paymentIntentId)
                .first();

            const paidAt = payment.outcome === 'approved' ? new Date().toISOString() : null;
            const chargedAmount = payment.outcome === 'approved' ? (payment.chargedAmount ?? payment.amount) : null;

            if (existing) {
                await db
                    .prepare(`UPDATE payment SET payment_status = ?, gateway_status = ?, paid_at = COALESCE(paid_at, ?), charged_amount = COALESCE(charged_amount, ?) WHERE external_id = ?`)
                    .bind(payment.outcome, payment.gatewayStatus, paidAt, chargedAmount, payment.paymentIntentId)
                    .run();
            } else {
                await db
                    .prepare(`INSERT INTO payment (order_id, api_provider, method, payment_status, amount, external_id, gateway_status, paid_at, charged_amount) VALUES (?, 'stripe', ?, ?, ?, ?, ?, ?, ?)`)
                    .bind(payment.orderId, payment.method, payment.outcome, payment.amount, payment.paymentIntentId, payment.gatewayStatus, paidAt, chargedAmount)
                    .run();
            }
        } catch (err: any) {
            if (err.message?.includes('FOREIGN KEY constraint failed') || err.message?.includes('SQLITE_CONSTRAINT')) {
                console.error('[stripe] Order not found on register payment');
            } else {
                console.error('[stripe] Unexpected error on upsertPayment:', err);
            }
        }
    }

    async function applyTransition(orderId: number, target: Parameters<typeof transitionOrder>[1]) {
        const transition = await transitionOrder(orderId, target);
        if (!transition.success) {
            console.error(`[stripe] Failed to move order ${orderId} to ${target}:`, transition.error, transition.code);
            return { revalidate: false };
        }
        if (transition.code !== 'NO_CHANGE') {
            await sendOrderStatusEmail(orderId, target);
        }
        return { revalidate: Boolean(transition.revProdCache) };
    }

    let revalidate = false;

    switch (event.type) {
        case 'payment_intent.succeeded': {
            const pi = event.data.object as Stripe.PaymentIntent;

            const orderId = pi.metadata?.order_id ? parseInt(pi.metadata.order_id) : null;
            if (!orderId) {
                console.error('[stripe] payment_intent.succeeded without order_id', { pi: pi.id });
                break;
            }

            const existing = await db
                .prepare('SELECT payment_status FROM payment WHERE external_id = ?')
                .bind(pi.id)
                .first<{ payment_status: string }>();

            if (existing?.payment_status === 'approved') break;


            const method = await resolvePaymentMethodType(pi.id);
            const chargedAmount = (pi.amount_received || 0) / 100;
            const amount = (pi.amount || 0) / 100;
            const payedInstallments = pi.payment_method_options?.card?.installments?.plan?.count ?? 1;
            const interest = Math.round((chargedAmount - amount) * 100) / 100;
            await upsertPayment({
                paymentIntentId: pi.id,
                outcome: 'approved',
                gatewayStatus: pi.status, // 'succeeded'
                amount,
                chargedAmount,
                orderId,
                method,
            });

            await db
                .prepare(`UPDATE tb_order SET total_value = ?, installments = ?, interest = ? WHERE id = ? AND payment_method = ?`)
                .bind(chargedAmount, payedInstallments, interest > 0 ? interest : null, orderId, method)
                .run();

            const { revalidate: rev } = await applyTransition(orderId, 'confirmed');
            revalidate = rev;
            break;
        }

        case 'payment_intent.payment_failed': {
            const pi = event.data.object as Stripe.PaymentIntent;
            const orderId = pi.metadata?.order_id ? parseInt(pi.metadata.order_id) : null;

            if (!orderId) {
                console.error('[stripe] payment_intent.payment_failed without order_id', { pi: pi.id });
                break;
            }

            const method = await resolvePaymentMethodType(pi.id);

            await upsertPayment({
                paymentIntentId: pi.id,
                outcome: 'rejected',
                gatewayStatus: pi.status,
                amount: (pi.amount || 0) / 100,
                orderId,
                method,
            });

            const { revalidate: rev } = await applyTransition(orderId, 'payment_error');
            revalidate = rev;
            break;
        }

        case 'payment_intent.canceled': {
            const pi = event.data.object as Stripe.PaymentIntent;
            const orderId = pi.metadata?.order_id ? parseInt(pi.metadata.order_id) : null;
            if (!orderId) break;

            const method = await resolvePaymentMethodType(pi.id);

            await upsertPayment({
                paymentIntentId: pi.id,
                outcome: 'canceled',
                gatewayStatus: pi.status,
                amount: (pi.amount || 0) / 100,
                orderId,
                method,
            });

            const { revalidate: rev } = await applyTransition(orderId, 'canceled');
            revalidate = rev;
            break;
        }

        case 'payment_intent.requires_action':
        case 'payment_intent.processing': {
            const pi = event.data.object as Stripe.PaymentIntent;

            const orderId = pi.metadata?.order_id ? parseInt(pi.metadata.order_id) : null;
            if (!orderId) {
                console.error('[stripe] payment_intent.processing without order_id', { pi: pi.id });
                break;
            }

            const method = await resolvePaymentMethodType(pi.id);
            const amount = (pi.amount || 0) / 100;

            const existing = await db
                .prepare('SELECT gateway_status FROM payment WHERE external_id = ?')
                .bind(pi.id)
                .first<{ gateway_status: string | null }>();

            const alreadyHandled = existing?.gateway_status === pi.status;

            await upsertPayment({
                paymentIntentId: pi.id,
                outcome: 'pending',
                gatewayStatus: pi.status,
                amount,
                orderId,
                method,
            });

            if (!alreadyHandled && pi.next_action?.type === 'boleto_display_details') {
                const boleto = pi.next_action.boleto_display_details;

                const orderUser = await db
                    .prepare('SELECT u.preferred_language, u.email FROM tb_order o JOIN user u ON u.id = o.user_id WHERE o.id = ?')
                    .bind(orderId)
                    .first<{ preferred_language: string | null }>();

                const language = (orderUser?.preferred_language ?? DEFAULT_LANGUAGE) as SupportedLanguage;

                const order = await getFullOrderById(orderId, language);
                if (!order) {
                    console.error('[stripe] Order not found for boleto email', { orderId });
                } else {
                    const config = await getAdminConfig(language);

                    let items = [];
                    try {
                        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
                    } catch {
                        items = [];
                    }

                    const emailData = {
                        language,
                        orderStatus: 'pending',
                        siteName: config?.site_name,
                        siteDomain: config?.domain,
                        SitePhone: config?.contact_phone || '',
                        orderId: order.id,
                        orderDate: order.order_date,
                        customerName: order.user_name,
                        customerEmail: order.email,
                        customerPhone: order.phone,
                        productsValue: order.products_value,
                        shippingValue: order.shipping_value,
                        totalValue: order.total_value,
                        discountValue: order.discount_value,
                        currency: config?.currency,
                        items,
                        expiresAt: boleto?.expires_at ? new Date(boleto.expires_at * 1000).toISOString() : null,
                        paymentMethod: method,
                        boleto: {
                            barcode: boleto?.number ?? undefined,
                            ticketUrl: boleto?.hosted_voucher_url ?? undefined,
                        },
                    };

                    const subject = EMAIL_SUBJECTS['payment_instructions'][language].replace('{orderId}', String(order.id));
                    const html = await renderPaymentInstructionsTemplate(emailData);

                    const ctx = getCtx();
                    ctx.waitUntil(MailSender.sendEmail({
                        type: 'sales',
                        to: String(order.email),
                        subject,
                        html,
                    }).catch((err) => console.error('[stripe] Failed to send boleto email:', err)));

                }
            }

            break;
        }

        default:
            console.log(`[stripe] Event not handled: ${event.type}`);
    }

    return { revProdCache: revalidate };
}
