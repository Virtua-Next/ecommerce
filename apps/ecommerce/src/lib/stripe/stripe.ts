import Stripe from 'stripe';
import { getDb } from '@/lib/cloudflare/context';
let stripeInstance: Stripe | null = null;
let stripeConfig: { apiKey: string; webhookSecret?: string } | null = null;
import { DEFAULT_CURRENCY, PAYMENT_METHODS, STRIPE_API_VERSION } from '@/lib/constants';


const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'payment_intent.processing',
    'payment_intent.requires_action'
];

export interface SetupStripeWebhookParams {
    privateKey: string;
    webhookUrl: string;
}

export interface SetupStripeWebhookResult {
    webhook_secret: string;
    webhook_id: string;
}

interface CreatePaymentIntentParams {
    baseValue: number;
    orderId: number;
    userEmail?: string;
    metadata?: Record<string, string>;
    installmentsEnabled?: boolean;
    currency?: string;
    paymentMethod: string;
}

export async function getStripe(): Promise<Stripe> {
    if (stripeInstance) return stripeInstance;

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
            WHERE api_provider = 'stripe' 
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
        throw new Error('Stripe não configurado');
    }

    // Salvar configuração para uso futuro
    stripeConfig = {
        apiKey: api.privateKey,
        webhookSecret: api.webhookSecret,
    };

    // Inicializar Stripe
    stripeInstance = new Stripe(api.privateKey, {
        apiVersion: STRIPE_API_VERSION,
        maxNetworkRetries: 2,
        timeout: 10000,
        httpClient: Stripe.createFetchHttpClient(),
    });

    return stripeInstance;
}

export function clearStripeInstance(): void {
    stripeInstance = null;
    stripeConfig = null;
}

export async function setupStripeWebhook(params: SetupStripeWebhookParams): Promise<| { success: true; data: SetupStripeWebhookResult } | { success: false; error: string }> {
    const { privateKey, webhookUrl } = params;

    if (!privateKey) return { success: false, error: 'A private_key is required' };
    if (!webhookUrl) return { success: false, error: 'A webhook URL is required' };

    try {
        const stripe = new Stripe(privateKey, {
            apiVersion: STRIPE_API_VERSION,
        });

        // 1. Lista webhooks existentes
        const existingEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });

        // 2. Remove duplicados com a mesma URL
        const duplicates = existingEndpoints.data.filter(ep => ep.url === webhookUrl);
        for (const dup of duplicates) {
            await stripe.webhookEndpoints.del(dup.id);
        }

        // 3. Cria o webhook novo
        const webhook = await stripe.webhookEndpoints.create({
            url: webhookUrl,
            enabled_events: WEBHOOK_EVENTS,
        });

        if (!webhook.secret) {
            await stripe.webhookEndpoints.del(webhook.id);
            return { success: false, error: 'Stripe não retornou o webhook secret' };
        }

        // 4. Retorna os dados
        return {
            success: true,
            data: {
                webhook_secret: webhook.secret,
                webhook_id: webhook.id,
            },
        };
    } catch (err: any) {
        console.error('[stripe] Erro ao configurar webhook:', {
            message: err.message,
            type: err.type,
            code: err.code,
        });

        // Mensagens amigáveis pra erros comuns
        if (err.code === 'url_invalid') {
            return { success: false, error: 'URL de webhook inválida. Deve ser HTTPS pública.' };
        }
        if (err.type === 'StripeAuthenticationError') {
            return { success: false, error: 'Chave privada do Stripe inválida.' };
        }
        if (err.code === 'resource_missing') {
            return { success: false, error: 'Webhook não encontrado no Stripe.' };
        }

        return { success: false, error: `Erro ao configurar webhook: ${err.message}` };
    }
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const stripe = await getStripe();

    if (!params.baseValue || params.baseValue < 50 || !Number.isInteger(params.baseValue)) throw new Error('Valor total inválido para Payment Intent.');

    try {
        const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
            amount: params.baseValue,
            currency: params.currency || DEFAULT_CURRENCY.toLowerCase(),
            metadata: {
                order_id: params.orderId.toString(),
                ...(params.metadata || {}),
            },
            description: `Order #${params.orderId}`,
            ...(params.userEmail ? { receipt_email: params.userEmail } : {}),
        };

        if (params.paymentMethod === 'card') {
            paymentIntentParams.payment_method_options = {
                card: {
                    installments: {
                        enabled: params.installmentsEnabled,
                    },
                },
            };
        }

        paymentIntentParams.payment_method_types = [params.paymentMethod];

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        if (!paymentIntent.client_secret) throw new Error('Client secret não gerado para Payment Intent.');

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        };

    } catch (error: any) {
        console.error('Erro ao criar Payment Intent Stripe:', {
            orderId: params.orderId,
            errorMessage: error?.message,
            stripeError: error?.raw?.message,
            type: error?.type,
            code: error?.code,
            installmentsEnabled: params.installmentsEnabled,
        });
        throw new Error('Failed to create Stripe Payment Intent.');
    }
}

export async function resolvePaymentMethodType(paymentIntentId: string, fallback = 'intent'): Promise<string> {
    try {
        const stripe = await getStripe();
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['payment_method'],
        });

        const pm = pi.payment_method as Stripe.PaymentMethod;

        const paymentMethodType = typeof pm === 'string' ? pm : pm?.type;

        return typeof paymentMethodType === 'string' && (PAYMENT_METHODS as readonly string[]).includes(paymentMethodType)
            ? paymentMethodType
            : fallback;

    } catch (err) {
        console.error('[stripe] Failed to resolve payment method type:', err);
        return fallback;
    }
}
