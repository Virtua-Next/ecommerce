import { getDb } from "../cloudflare/context";
import { CountryCode } from "@/lib/types/generic";
import { MERCADOPAGO_IDENTIFICATION_TYPE } from "@/lib/constants";
let mercadoPagoConfig: { accessToken: string; webhookSecret?: string; } | null = null;
const MP_API_BASE = 'https://api.mercadopago.com';


export type MercadoPagoIdentification = { type: string; number: string };

export type MercadoPagoOrderItem = {
    title: string;
    unitPrice: number;
    quantity: number;
};

export type MercadoPagoPayer = {
    email: string;
    identification?: MercadoPagoIdentification;
};

export type MercadoPagoPayerAddress = {
    zipCode: string;
    streetName: string;
    streetNumber: string;
    neighborhood: string;
    city: string;
    federalUnit: string; // sigla do estado, ex: 'SP'
};

export type CreatePaymentParams = {
    value: number;
    orderId: number;
    idempotencyKey?: string;
    description?: string;
    items?: MercadoPagoOrderItem[];
} & (
        | {
            paymentMethodType: 'credit_card';
            paymentMethodId: string;
            token: string;
            installments?: number;
            payer: MercadoPagoPayer & { identification: MercadoPagoIdentification };
        }
        | {
            paymentMethodType: 'bank_transfer';
            paymentMethodId: 'pix';
            payer: MercadoPagoPayer & { firstName?: string };
            expirationTime?: string; // ISO 8601 duration, ex: 'PT30M'
        }
        | {
            paymentMethodType: 'ticket';
            paymentMethodId: 'boleto';
            payer: MercadoPagoPayer & {
                identification: MercadoPagoIdentification;
                firstName: string;
                lastName: string;
            };
            payerAddress: MercadoPagoPayerAddress;
            expirationTime?: string; // ex: 'P3D'
        }
    );

export type MercadoPagoOrderPayment = {
    id: string;
    status: string;
    status_detail?: string;
    date_of_expiration?: string;
    payment_method?: {
        id: string;
        type: string;
        installments?: number;
        // Pix
        qr_code?: string;
        qr_code_base64?: string;
        // Pix e boleto
        ticket_url?: string;
        // Boleto
        barcode_content?: string;
        digitable_line?: string;
    };
};

export async function submitPayment(params: CreatePaymentParams): Promise<MercadoPagoOrderResponse> {
    const { value, orderId } = params;
    const amount = value.toFixed(2);

    let paymentMethod: Record<string, unknown>;
    let payerPayload: Record<string, unknown>;
    let expirationTime: string | undefined;

    switch (params.paymentMethodType) {
        case 'credit_card': {
            paymentMethod = {
                id: params.paymentMethodId,
                type: 'credit_card',
                token: params.token,
                ...(params.installments ? { installments: params.installments } : {}),
            };
            payerPayload = {
                email: params.payer.email,
                identification: params.payer.identification,
            };
            break;
        }

        case 'bank_transfer': {
            paymentMethod = {
                id: params.paymentMethodId, // 'pix'
                type: 'bank_transfer',
            };
            payerPayload = {
                email: params.payer.email,
                ...(params.payer.firstName ? { first_name: params.payer.firstName } : {}),
                ...(params.payer.identification ? { identification: params.payer.identification } : {}),
            };
            expirationTime = params.expirationTime;
            break;
        }

        case 'ticket': {
            paymentMethod = {
                id: params.paymentMethodId, // 'boleto'
                type: 'ticket',
            };
            payerPayload = {
                email: params.payer.email,
                first_name: params.payer.firstName,
                last_name: params.payer.lastName,
                identification: params.payer.identification,
                address: {
                    zip_code: params.payerAddress.zipCode,
                    street_name: params.payerAddress.streetName,
                    street_number: params.payerAddress.streetNumber,
                    neighborhood: params.payerAddress.neighborhood,
                    city: params.payerAddress.city,
                    // federal_unit: params.payerAddress.federalUnit,
                    state: params.payerAddress.federalUnit,
                },
            };
            expirationTime = params.expirationTime;
            break;
        }
    }

    const payload = {
        type: 'online',
        processing_mode: 'automatic',
        total_amount: amount,
        external_reference: String(orderId),
        ...(params.description ? { description: params.description } : {}),
        ...(params.items?.length
            ? {
                items: params.items.map((i) => ({
                    title: i.title.slice(0, 150), // trunca por segurança
                    unit_price: i.unitPrice.toFixed(2),
                    quantity: i.quantity,
                })),
            }
            : {}),
        payer: payerPayload,
        transactions: {
            payments: [
                {
                    amount,
                    payment_method: paymentMethod,
                    ...(expirationTime ? { expiration_time: expirationTime } : {})
                },
            ],
        },
    };

    const key = params.idempotencyKey ?? `order-${orderId}-${params.paymentMethodType}`

    return mercadoPagoFetch('/v1/orders', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': key },
        body: JSON.stringify(payload),
    }) as Promise<MercadoPagoOrderResponse>;
}

export type MercadoPagoOrderResponse = {
    id: string;
    status: string;
    external_reference: string;
    total_amount: string;
    total_paid_amount?: string; // presente quando processed/aprovado
    transactions?: {
        payments?: Array<{
            date_of_expiration: null;
            id: string;
            status: string;  // created | processed | action_required | canceled | failed | processing | charged_back | refunded
            status_detail?: string; // ex: 'accredited' quando aprovado
            payment_method?: {
                id: string;
                type: string;
                installments?: number;
                qr_code?: string; // pix
                qr_code_base64?: string; // pix
                barcode_content?: string; // boleto
                formatted_barcode?: string; // boleto
                ticket_url?: string; // pix and boleto
            };
        }>;
    };
    [key: string]: unknown;
};

export async function getMercadoPago(): Promise<{ accessToken: string; webhookSecret?: string }> {
    if (mercadoPagoConfig) return mercadoPagoConfig;

    const db = getDb();

    const api = await db
        .prepare(`
            SELECT 
                id,
                api_provider as provider,
                private_key as privateKey,
                public_key as publicKey,
                webhook,
                webhook_secret as webhookSecret,
                account_id as accountId,
                active
            FROM payment_api
            WHERE api_provider = 'mercadopago' 
            AND active = 1
            LIMIT 1`)
        .first<{
            id: number;
            provider: string;
            privateKey: string;
            publicKey: string;
            webhook: string;
            webhookSecret: string;
            accountId: string;
            active: number;
        }>();

    if (!api?.privateKey) {
        throw new Error('Mercado Pago não configurado');
    }

    mercadoPagoConfig = {
        accessToken: api.privateKey,
        webhookSecret: api.webhookSecret,
    };

    return mercadoPagoConfig;
}

export async function mercadoPagoFetch(path: string, init: RequestInit = {}) {
    const { accessToken } = await getMercadoPago();

    const response = await fetch(`${MP_API_BASE}${path}`, {
        ...init,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
        },
    });

    if (!response.ok) {
        let errorBody: unknown;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = await response.text().catch(() => '(sem corpo)');
        }
        console.error('Erro Mercado Pago:', errorBody);
        throw new Error(
            typeof errorBody === 'object' && errorBody && 'message' in errorBody
                ? String((errorBody as { message: unknown }).message)
                : `Erro ao chamar Mercado Pago (${response.status})`
        );
    }

    return response.json();
}

export function resolveMpIdentificationType(country: CountryCode, cleanTaxId: string): string {
    if (country === 'BR') {
        return cleanTaxId.length === 14 ? 'CNPJ' : 'CPF';
    }

    const type = MERCADOPAGO_IDENTIFICATION_TYPE[country];
    if (!type) {
        throw new Error(`Mercado Pago identification type not configured for country '${country}'. Add it to MP_IDENTIFICATION_TYPE before enabling Mercado Pago for this country.`);
    }

    return type;
}

export class MercadoPagoPaymentError extends Error {
    readonly code = 'PAYMENT_DECLINED' as const;
    readonly statusDetail?: string;

    constructor(message: string, statusDetail?: string) {
        super(message);
        this.name = 'MercadoPagoPaymentError';
        this.statusDetail = statusDetail;
    }
}

export type MpOutcome = 'approved' | 'canceled' | 'pending' | 'rejected';

/**
 * Classifica o resultado de uma transação da Orders API.
 * 'canceled' fica separado de 'rejected' pra permitir uma transição de
 * ordem diferente (canceled vs payment_error), espelhando o que o
 * handler do Stripe já faz.
 */
export function classifyMpTransactionStatus(status: string, statusDetail?: string): 'approved' | 'pending' | 'rejected' | 'canceled' {
    switch (status) {
        case 'processed':
            return 'approved';

        case 'created':
        case 'processing':
        case 'action_required':
        case 'at_terminal':
            return 'pending';

        case 'cancelled':
        case 'canceled':
            return 'canceled';

        case 'rejected':
            return 'rejected';

        case 'charged_back':
            // Chargeback acontece DEPOIS de já ter sido 'processed' (dinheiro já foi
            // repassado). Tratar como cancelamento automático é perigoso: o pedido já
            // pode ter sido confirmado, enviado etc. Loga para revisão manual e não
            // muda o outcome sozinho.
            console.error('[MercadoPago] Chargeback recebido, revisão manual necessária:', { status, statusDetail });
            return 'pending'; // não dispara transitionOrder nem email

        default:
            console.error('[MercadoPago] Status desconhecido do MP:', { status, statusDetail });
            return 'pending'; // fail-safe: nunca aprova/cancela um status que não reconhece
    }
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

/**
 * Valida a assinatura do webhook do Mercado Pago (Orders API).
 * dataId deve vir do query param `data.id` da própria requisição
 * (não do body), conforme a doc oficial.
 */
export async function verifyMercadoPagoSignature(params: {
    xSignature: string | null;
    xRequestId: string | null;
    dataId: string | null;
    secret: string;
}): Promise<boolean> {
    const { xSignature, xRequestId, dataId, secret } = params;


    if (!xSignature || !xRequestId || !dataId) {
        return false;
    }

    const parts = Object.fromEntries(
        xSignature.split(',').map(p => {
            const [k, v] = p.split('=').map(s => s?.trim());
            return [k, v];
        })
    );

    const ts = parts['ts'];
    const receivedHash = parts['v1'];

    if (!ts || !receivedHash) {
        return false;
    }

    let tsMs = Number(ts);
    if (!Number.isNaN(tsMs) && tsMs < 1e12) {
        tsMs *= 1000;
    }

    if (!Number.isNaN(tsMs) && Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
        return false;
    }

    const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
    const computedHash = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return timingSafeEqual(computedHash, receivedHash);
}

export function clearMercadoPagoInstance(): void {
    mercadoPagoConfig = null;
}

export function resolveMpMethod(pm?: { id?: string; type?: string }): 'card' | 'pix' | 'boleto' {
    if (pm?.id === 'pix' || pm?.type === 'bank_transfer') return 'pix';
    if (pm?.id === 'boleto' || pm?.type === 'ticket') return 'boleto';
    return 'card'; // credit_card, debit_card
}
