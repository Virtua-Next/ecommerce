import { IConfig } from "@/lib/schemas/config";
import { renderOrderConfirmationTemplate } from "@/lib/email/templates/order/order-confirmation";
import { renderOrderShippedTemplate } from "@/lib/email/templates/order/order-shipped";
import { renderOrderPaymentErrorTemplate } from "@/lib/email/templates/order/payment-error";
import { renderOrderCanceledTemplate } from "@/lib/email/templates/order/order-canceled";
import { OrderStatus, SupportedLanguage } from "@/lib/types/generic";
import { getFullOrderById } from "../db/order";
import { DEFAULT_CURRENCY, DEFAULT_LANGUAGE, EMAIL_SUBJECTS } from "@/lib/constants";
import { getCachedConfig } from '@/lib/cache/config';
import { MailSender } from "@/lib/emailSender";
import { getCtx } from '@/lib/cloudflare/context';


type OrderEmailKind = 'order_confirmation' | 'payment_error' | 'order_canceled' | 'order_shipped';

const EMAIL_RENDERERS: Record<OrderEmailKind, (data: any) => Promise<string>> = {
    order_confirmation: renderOrderConfirmationTemplate,
    payment_error: renderOrderPaymentErrorTemplate,
    order_canceled: renderOrderCanceledTemplate,
    order_shipped: renderOrderShippedTemplate,
};

export const STATUS_TO_EMAIL: Partial<Record<OrderStatus, OrderEmailKind>> = {
    confirmed: 'order_confirmation',
    payment_error: 'payment_error',
    canceled: 'order_canceled',
    shipped: 'order_shipped',
};

function buildOrderEmailData(order: any, config: IConfig, language: SupportedLanguage) {
    return {
        language,
        currency: config?.currency ?? DEFAULT_CURRENCY,
        siteName: config?.site_name,
        siteDomain: config?.domain,
        sitePhone: config?.contact_phone ?? '',
        customerName: order.user_name,
        customerEmail: order.email,
        customerPhone: order.phone,
        orderId: order.id,
        orderStatus: order.order_status,
        orderDate: order.order_date,
        canceledDate: order.canceled_data ?? new Date().toISOString(),
        paymentMethod: order.payment_method,
        installments: order.installments,
        installmentPrice: order.installments ? Number(order.total_value) / Number(order.installments) : undefined,
        productsValue: order.products_value,
        shippingValue: order.shipping_value,
        interest: order.interest,
        discountValue: order.discount_value,
        baseValue: order.base_value,
        totalValue: order.total_value,
        observations: order.observations,
        carrierName: order.shipping_carrier_name,
        delivery: order.delivery_option,
        shippingZip: order.shipping_zip,
        shippingStreet: order.shipping_street,
        shippingNumber: order.shipping_number,
        shippingComplement: order.shipping_complement,
        shippingNeighborhood: order.shipping_neighborhood,
        shippingCity: order.shipping_city,
        shippingState: order.shipping_state,
        items: order.items,
        trackingNumber: order.tracking ?? '',
        shippedDate: new Date().toISOString(),
    };
}

export async function sendOrderStatusEmail(orderId: number, toStatus: OrderStatus): Promise<void> {
    const emailKind = STATUS_TO_EMAIL[toStatus];
    if (!emailKind) return;

    const order = await getFullOrderById(orderId);
    if (!order || !order.email) {
        console.warn(`[email] Order ${orderId} without email — email not sent`);
        return;
    }

    if (emailKind === 'order_shipped' && order.delivery_option !== 'delivery') return;

    const language = (order.preferred_language ?? DEFAULT_LANGUAGE) as SupportedLanguage;
    const config = await getCachedConfig(language);
    if (!config) {
        console.warn(`[email] Configuration not found for language ${language} — email not sent`);
        return;
    }

    const data = buildOrderEmailData(order, config, language);

    const subjectVariants = EMAIL_SUBJECTS[emailKind];
    const subjectTemplate = subjectVariants[language as keyof typeof subjectVariants] ?? subjectVariants[DEFAULT_LANGUAGE];
    const subject = subjectTemplate.replace('{orderId}', String(orderId));

    const html = await EMAIL_RENDERERS[emailKind](data);

    const ctx = getCtx();

    ctx.waitUntil(MailSender.sendEmail({
        type: 'sales',
        to: String(order.email),
        html,
        subject,
    }).catch((err) => console.error(`[order-email] Failed to send ${emailKind} for order ${orderId}:`, err)));

}
