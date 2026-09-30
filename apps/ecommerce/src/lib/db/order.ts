import { getDb, getEnv, getCtx } from '@/lib/cloudflare/context';
import { CountryCode, IResult, SupportedPaymentMethods, SupportedDeliveryOptions, SupportedLanguage, SupportedEmailSubjetcs } from '@/lib/types/generic';
import { IAddress, IUser } from '@/lib/schemas/user';
import { getCachedConfig } from '@/lib/cache/config';
import { DEFAULT_CURRENCY, DEFAULT_LANGUAGE, DEFAULT_PAYMENT_API_IDS, EMAIL_SUBJECTS, STRIPE_ALLOWED_INSTALLMENTS } from '@/lib/constants';
import { createPaymentIntent } from '@/lib/stripe/stripe';
import { submitPayment, CreatePaymentParams, classifyMpTransactionStatus, MercadoPagoPaymentError, MercadoPagoOrderItem } from '@/lib/mercadopago/mercadopago';
import { renderOrderConfirmationTemplate } from '@/lib/email/templates/order/order-confirmation';
import { MailSender } from '@/lib/emailSender';
import { resolveMpIdentificationType } from '@/lib/mercadopago/mercadopago';
import { IOrderDetails } from '@/lib/schemas/order';
import { reserveOrderStock, restoreStock, transitionOrder } from './order-transition';
import { getProductTitlesByIds } from './product-admin';
import { sendOrderStatusEmail } from '../email/order-emails';
import { calculateOrderDimensions, resolveShippingSelection } from '@/lib/shipping/shipping';
import { adminAllCarriers } from './carrier-admin';
import { renderPaymentInstructionsTemplate } from '@/lib/email/templates/order/payment-instructions';
import { buildPixStaticPayload, pixPayloadToBase64Png } from '../pix/br-code';


interface MpPayerIdentification {
    type?: string;   // o front pode mandar, mas o backend resolve via resolveMpIdentificationType
    number: string;
}

export interface CreateOrderInput {
    user_id: number;                       // preenchido pelo backend a partir da sessão
    payment_method: SupportedPaymentMethods;
    api_id?: number;                       // ausente = pagamento offline
    installments: number;                  // 1 quando não for cartão
    delivery_option: SupportedDeliveryOptions;
    address_id?: number;                   // só em delivery
    carrier_id?: number;                   // só em delivery
    shipping_option?: string;              // só em delivery: id da opção cotada, revalidada no backend
    expected_shipping_value?: number;       // o valor que o cliente viu no frontend
    observations?: string;
    items: Array<{
        product_id: number;
        quantity: number;
    }>;

    // Só um dos três, conforme payment_method
    cardData?: {
        token?: string;
        payment_method_id?: string;
        payer_identification?: MpPayerIdentification;
    };
    pixData?: {
        payment_method_id?: string;
    };
    ticketData?: {
        payment_method_id?: string;
        payer_identification?: MpPayerIdentification;
        payer_first_name?: string;
        payer_last_name?: string;
    };
}

export async function createOrder(orderData: CreateOrderInput): Promise<IResult<any>> {
    let orderId: any = null;
    const db = getDb();
    const env = getEnv();
    const ctx = getCtx();
    const isproduction = env.NEXTJS_ENV === 'production';

    try {
        cleanupStaleOrders(db).catch(err => console.error('[cleanup] Failed to clean stale orders:', err));

        const user = await db
            .prepare("SELECT id, user_name, email, phone, preferred_language, country FROM user WHERE id = ?")
            .bind(orderData.user_id)
            .first<IUser>();

        if (!user) return { success: false, error: 'User not found', code: 'NOT_FOUND' };

        const language = (user.preferred_language ?? DEFAULT_LANGUAGE) as SupportedLanguage;
        const config = await getCachedConfig(language);

        orderData.installments = Number(orderData.installments) || 1;
        if (!orderData.items || orderData.items.length === 0) return { success: false, error: 'Invalid order', code: 'VALIDATION_ERROR' };

        const hasInvalidQuantity = orderData.items.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0);
        if (hasInvalidQuantity) return { success: false, error: 'Invalid item quantity', code: 'VALIDATION_ERROR' };

        const products = await Promise.all(
            orderData.items.map(async (item) => {
                const product = await db
                    .prepare(`
                        SELECT 
                            p.id,
                            p.sku,
                            p.stock, 
                            p.price, 
                            p.promotional_price, 
                            p.cost_price,
                            p.product_length,
                            p.width,
                            p.height,
                            p.product_weight,
                            pt.title
                        FROM product p
                        LEFT JOIN product_translation pt ON pt.product_id = p.id 
                        AND pt.translation_language = ?
                        WHERE p.id = ?`)
                    .bind(language, item.product_id)
                    .first<any>();

                if (!product) return { success: false, error: 'Product not found', code: 'NOT_FOUND' };

                if (product.stock !== null && product.stock < item.quantity) return { success: false, error: `No stock for ${product.title || `product ${item.product_id}`}`, code: 'VALIDATION_ERROR' };

                const usedPrice = product.promotional_price > 0 ? product.promotional_price : product.price;
                return {
                    ...product,
                    used_price: usedPrice
                };
            })
        );

        const failedProduct = products.find((r: any) => r.success === false);
        if (failedProduct) return { success: false, error: failedProduct.error, code: failedProduct.code };

        const productsValue = orderData.items.reduce((total, item, index) => {
            const product = products[index];
            total += product.used_price * item.quantity;
            return Math.round(total * 100) / 100;
        }, 0);


        let shippingValue = 0;
        let shippingChoice: Awaited<ReturnType<typeof resolveShippingSelection>> | null = null;

        let address: IAddress | null = null;
        if (orderData.delivery_option === 'delivery') {
            if (!orderData.shipping_option || !orderData.address_id) return { success: false, error: 'Shipping option not specified', code: 'VALIDATION_ERROR' };

            address = await db
                .prepare("SELECT * FROM tb_address WHERE id = ? AND user_id = ? LIMIT 1")
                .bind(orderData.address_id, orderData.user_id)
                .first<IAddress>();

            if (!address) return { success: false, error: 'Address not found', code: 'NOT_FOUND' };

            const carriers = await adminAllCarriers(language);

            const dimensoes = calculateOrderDimensions(
                orderData.items.map((item, i) => ({
                    length: products[i].product_length,
                    width: products[i].width,
                    height: products[i].height,
                    weight: products[i].product_weight,
                    quantity: item.quantity,
                }))
            );

            const resolved = await resolveShippingSelection({
                shippingOptionId: orderData.shipping_option,
                cepDestino: String(address?.zip ?? ''),
                dimensoes,
                totalCarrinho: productsValue,
                carriers,
            });

            const price = Math.round(Number(resolved?.price) * 100) / 100;
            if (!resolved || !Number.isFinite(price) || price < 0) {
                return { success: false, error: 'Shipping option unavailable.', code: 'VALIDATION_ERROR' };
            }
            shippingValue = price;
            shippingChoice = resolved;

            if (orderData.expected_shipping_value !== undefined &&
                Math.abs(Number(orderData.expected_shipping_value) - shippingValue) > 0.009) {
                return { success: false, error: 'Shipping price changed. Please review the order.', code: 'VALIDATION_ERROR' };
            }
        }

        const rawValue = Math.round((productsValue + shippingValue) * 100) / 100;

        if (orderData.payment_method !== 'card' && orderData.installments > 1) return { success: false, error: 'Installment payments via credit card only.', code: 'VALIDATION_ERROR' };
        if (rawValue < 1) return { success: false, error: 'Invalid total order value.', code: 'VALIDATION_ERROR' };

        const paymentMethodRow = orderData.api_id
            ? await db
                .prepare(`SELECT discount_percent FROM payment_method WHERE api_id = ? AND method_type = ? AND active = 1`)
                .bind(orderData.api_id, orderData.payment_method)
                .first<{ discount_percent: number }>()
            : null;

        const discountPercent = paymentMethodRow?.discount_percent ?? 0;
        const discountValue = Math.round(rawValue * (discountPercent / 100) * 100) / 100;
        const baseValue = Math.round((rawValue - discountValue) * 100) / 100; // valor enviado ao gateway

        const shipping_snapshot = address ? { zip: address.zip, street: address.street, number: address.address_number, complement: address.complement, neighborhood: address.neighborhood, city: address.city, state: address.address_state } : null;

        // INSERT order
        const insertOrder = await db
            .prepare(`
                INSERT INTO tb_order (
                    order_date, order_status, payment_method, installments, delivery_option,
                    products_value, shipping_value, discount_value, base_value, total_value,
                    shipping_zip, shipping_street, shipping_number, shipping_complement,
                    shipping_neighborhood, shipping_city, shipping_state,
                    user_id, address_id, api_id, carrier_id, shipping_carrier_name, shipping_service) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(
                new Date().toISOString(), 'pending', orderData.payment_method, orderData.installments, orderData.delivery_option,
                productsValue, shippingValue, discountValue, baseValue, baseValue,
                shipping_snapshot?.zip || null, shipping_snapshot?.street || null, shipping_snapshot?.number || null, shipping_snapshot?.complement || null,
                shipping_snapshot?.neighborhood || null, shipping_snapshot?.city || null, shipping_snapshot?.state || null,
                orderData.user_id, orderData.address_id || null, orderData.api_id || null,
                shippingChoice?.carrierId ?? null, shippingChoice?.carrierName ?? null, shippingChoice?.serviceName ?? null)
            .run();

        orderId = (insertOrder.meta.last_row_id as number) || 0;
        if (!orderId) return { success: false, error: 'Failed to insert order.', code: 'INTERNAL_ERROR' };

        // Update inventory item by item
        const stockItems = orderData.items.map((item, i) => ({ product_id: products[i].id, quantity: item.quantity }));
        const reserve = await reserveOrderStock(orderId, stockItems);
        if (!reserve.success) {
            await db.prepare('DELETE FROM tb_order WHERE id = ?').bind(orderId).run();
            return { success: false, error: reserve.error, code: reserve.code };
        }

        // Insert order items
        try {
            await db.batch(
                orderData.items.map((item, index) => {
                    const product = products[index];
                    return db
                        .prepare(`INSERT INTO order_item (product_name, quantity, price, cost_price, order_id, product_id) VALUES (?, ?, ?, ?, ?, ?)`)
                        .bind(product.title || `Produto ${item.product_id}`, item.quantity, product.used_price, product.cost_price, orderId, item.product_id);
                })
            );

        } catch (err) {
            console.error("Error creating order items. The order will be removed.:", err);
            await restoreStock(stockItems);
            try {
                await db.prepare('DELETE FROM tb_order WHERE id = ?').bind(orderId).run();
            } catch (err) {
                console.error("Error removing order:", err);
            }
            throw err;
        }

        const offlinePayment: number = DEFAULT_PAYMENT_API_IDS.DEFAULT;
        const isGateway = !!orderData.api_id && offlinePayment !== orderData.api_id && ['card', 'pix', 'boleto'].includes(orderData.payment_method);

        let paymentInfo = null;

        // Process payment gateway
        if (isGateway) {
            const providerRow = await db
                .prepare("SELECT api_provider, supports_installments, private_key FROM payment_api WHERE id = ? AND active = 1")
                .bind(orderData.api_id)
                .first();

            if (!providerRow) throw new Error('Payment API not found');

            const provider = providerRow.api_provider as string;
            let status: string = 'pending';
            let externalId: string;
            let statusDetail: string | null = null;

            try {
                if (provider === "stripe") {
                    const currency = config?.currency.toLowerCase() || DEFAULT_CURRENCY;
                    const installmentsEnabled = !!providerRow?.supports_installments && STRIPE_ALLOWED_INSTALLMENTS.map(c => c.toLowerCase()).includes(currency);

                    const pi = await createPaymentIntent({
                        baseValue: Math.round(baseValue * 100),
                        orderId,
                        userEmail: user.email,
                        installmentsEnabled,
                        currency,
                        paymentMethod: orderData.payment_method
                    });
                    externalId = pi.paymentIntentId;

                    paymentInfo = {
                        clientSecret: pi.clientSecret,
                        externalId,
                    };

                    await db
                        .prepare(`INSERT INTO payment (order_id, api_provider, method, payment_status, amount, external_id) VALUES (?, ?, ?, ?, ?, ?)`)
                        .bind(orderId, provider, orderData.payment_method, status, baseValue, externalId)
                        .run();
                } else if (provider === 'mercadopago') {
                    if (!user.user_name?.trim()) throw new Error('Invalid customer name.');

                    const nameById = await getProductTitlesByIds(orderData.items.map((i) => i.product_id), language);

                    const mpItems: MercadoPagoOrderItem[] = [
                        ...orderData.items.map((i, idx) => ({
                            title: nameById.get(i.product_id) ?? `Product #${i.product_id}`,
                            unitPrice: products[idx].used_price,
                            quantity: i.quantity,
                        })),
                        ...(shippingValue > 0
                            ? [{ title: 'Shipping', unitPrice: shippingValue, quantity: 1 }]
                            : []),
                        ...(discountValue > 0
                            ? [{ title: `Discount (${orderData.payment_method})`, unitPrice: -discountValue, quantity: 1 }]
                            : []),
                    ];

                    const itemsSum = Math.round(mpItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 100) / 100;
                    if (itemsSum !== baseValue) throw new Error(`MP items sum ${itemsSum} != total ${baseValue}`);

                    const { cardData, pixData, ticketData } = orderData;
                    let paymentData: CreatePaymentParams;
                    let dbMethod: 'card' | 'pix' | 'boleto';

                    if (cardData) {
                        const cleanTaxId = cardData.payer_identification?.number?.replace(/\D/g, '') ?? '';
                        if (!cardData.token || !cardData.payment_method_id || !cleanTaxId) throw new Error('Card details not provided.');

                        dbMethod = 'card';
                        paymentData = {
                            paymentMethodType: 'credit_card',
                            token: cardData.token,
                            paymentMethodId: cardData.payment_method_id,
                            value: baseValue,
                            installments: orderData.installments,
                            payer: {
                                email: user.email,
                                identification: {
                                    type: resolveMpIdentificationType(user.country as CountryCode, cleanTaxId),
                                    number: cleanTaxId,
                                },
                            },
                            orderId,
                            idempotencyKey: `order-${orderId}-card`,
                        };
                    } else if (pixData) {
                        dbMethod = 'pix';
                        paymentData = {
                            paymentMethodType: 'bank_transfer',
                            paymentMethodId: 'pix',
                            value: baseValue,
                            payer: {
                                email: user.email,
                                ...(isproduction ? {} : { firstName: 'APRO' }),
                            },
                            expirationTime: 'PT30M', // ISO 8601 duration
                            orderId,
                            idempotencyKey: `order-${orderId}-pix`,
                        };
                    } else if (ticketData) {
                        const cleanTaxId = ticketData.payer_identification?.number?.replace(/\D/g, '') ?? '';
                        const firstName = ticketData.payer_first_name?.trim();
                        const lastName = ticketData.payer_last_name?.trim();

                        if (!cleanTaxId || !firstName || !lastName) throw new Error('Boleto requires payer name and tax ID.');

                        const whereClause = orderData.address_id ? 'id = ? AND user_id = ?' : 'user_id = ? AND address_primary = 1';
                        const bindValues = orderData.address_id ? [orderData.address_id, user.id] : [user.id];

                        const addr = await db
                            .prepare(`SELECT zip, street, address_number, neighborhood, city, address_state FROM tb_address WHERE ${whereClause}`)
                            .bind(...bindValues)
                            .first<{ zip: string; street: string; address_number: string; neighborhood: string; city: string; address_state: string }>();

                        if (!addr) throw new Error('Address not found.');

                        dbMethod = 'boleto';
                        paymentData = {
                            paymentMethodType: 'ticket',
                            paymentMethodId: 'boleto',
                            value: baseValue,
                            payer: {
                                email: user.email,
                                firstName,
                                lastName,
                                identification: {
                                    type: resolveMpIdentificationType(user.country as CountryCode, cleanTaxId),
                                    number: cleanTaxId,
                                },
                            },
                            payerAddress: {
                                zipCode: addr.zip.replace(/\D/g, ''),
                                streetName: addr.street,
                                streetNumber: addr.address_number,
                                neighborhood: addr.neighborhood,
                                city: addr.city,
                                federalUnit: addr.address_state,
                            },
                            expirationTime: 'P3D',
                            orderId,
                            idempotencyKey: `order-${orderId}-boleto`,
                        };
                    } else {
                        throw new Error('Payment details not provided.');
                    }

                    const result = await submitPayment({
                        ...paymentData,
                        description: `Order #${orderId}`,
                        items: mpItems,
                    });

                    const transaction = result.transactions?.payments?.[0];
                    if (!transaction) throw new Error('Mercado Pago did not return transaction data.');

                    status = transaction.status; // 'action_required'
                    statusDetail = transaction.status_detail ?? null;
                    externalId = result.id;

                    const outcome = classifyMpTransactionStatus(status, statusDetail ?? undefined); // pending

                    if (result && dbMethod === 'boleto') {
                        const payment = result?.transactions?.payments?.[0];

                        const items = orderData.items.map((i, idx) => ({
                            sku: products[idx].sku,
                            product_name: nameById.get(i.product_id) ?? `Produto #${i.product_id}`,
                            price: products[idx].used_price,
                            quantity: i.quantity,
                        }));

                        const emailData = {
                            language,
                            orderStatus: outcome,
                            siteName: config?.site_name,
                            siteDomain: config?.domain,
                            SitePhone: config?.contact_phone,
                            orderId,
                            orderDate: new Date().toISOString(),
                            customerName: user.user_name,
                            customerEmail: user.email,
                            customerPhone: user.phone,
                            productsValue,
                            shippingValue,
                            totalValue: baseValue,
                            discountValue,
                            currency: config?.currency,
                            items,
                            expiresAt: payment?.date_of_expiration,
                            paymentMethod: dbMethod,
                            boleto: {
                                barcode: payment?.payment_method?.barcode_content,
                                ticketUrl: payment?.payment_method?.ticket_url,
                            },
                        };

                        const subject = EMAIL_SUBJECTS['payment_instructions'][language].replace('{orderId}', String(orderId));
                        const html = await renderPaymentInstructionsTemplate(emailData);

                        ctx.waitUntil(MailSender.sendEmail({
                            type: 'sales',
                            to: user.email,
                            subject,
                            html,
                        }).catch((err) => console.error('[order] Failed to send boleto email:', err)));
                    }

                    const pm = transaction.payment_method;
                    paymentInfo = {
                        id: externalId,
                        status,
                        statusDetail,
                        outcome,
                        payment_method_id: pm?.id,
                        ...(dbMethod === 'card' && { installments: orderData.installments }),
                        ...(dbMethod === 'pix' && {
                            qrCode: pm?.qr_code,
                            qrCodeBase64: pm?.qr_code_base64,
                            ticketUrl: pm?.ticket_url,
                            expiresAt: transaction.date_of_expiration ?? null,
                        }),
                        ...(dbMethod === 'boleto' && {
                            ticketUrl: pm?.ticket_url,
                            barcode: pm?.formatted_barcode ?? pm?.barcode_content,
                            expiresAt: transaction.date_of_expiration ?? null,
                        }),
                    };

                    const chargedAmount = Number(result.total_paid_amount ?? result.total_amount ?? baseValue);
                    const payedInstallments = Number(transaction.payment_method?.installments ?? orderData.installments);

                    await db
                        .prepare(`INSERT INTO payment (order_id, api_provider, method, payment_status, amount, external_id, gateway_status, paid_at, charged_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                        .bind(orderId, provider, dbMethod, outcome, baseValue, externalId, status, outcome === 'approved' ? new Date().toISOString() : null, outcome === 'approved' ? chargedAmount : null)
                        .run();

                    if (payedInstallments > 1) {
                        await db
                            .prepare(`UPDATE tb_order SET total_value = ?, installments = ?, interest = ? WHERE id = ?`)
                            .bind(chargedAmount, payedInstallments, chargedAmount - baseValue, orderId)
                            .run();
                    }

                    if (outcome === 'approved') {
                        const transition = await transitionOrder(orderId, 'confirmed');
                        if (!transition.success) {
                            console.error('Failed to confirm order after payment approval:', transition.error);
                        } else if (transition.code !== 'NO_CHANGE') {
                            await sendOrderStatusEmail(orderId, 'confirmed');
                        }
                    }
                    // pending (Pix/boleto ficam em action_required/pending): webhook resolve.
                } else {
                    throw new Error('Unknown payment provider.');
                }

            } catch (err: any) {
                console.error('Error processing payment:', err);
                throw err;
            }

            return {
                success: true,
                data: { id: orderId, baseValue, installments: orderData.installments, paymentInfo },
                message: 'Order successfully received.'
            };

        }

        // Proccess order offline
        if (!isGateway) {
            let variant: SupportedEmailSubjetcs = 'order_confirmation';
            let subject = EMAIL_SUBJECTS[variant][language].replace('{orderId}', String(orderId));
            let paymentData;
            let pixKey = null;
            let isPix = false;
            let merchantName = 'MY STORE';
            let merchantCity = 'SAO PAULO';
            if (orderData.payment_method === 'pix') {
                const method = await db
                    .prepare(`
                        SELECT m.account_data
                        FROM payment_method m
                        JOIN payment_api a ON a.id = m.api_id
                        WHERE a.id = ? AND m.method_type = 'pix' AND m.active = 1 AND a.active = 1
                        LIMIT 1`)
                    .bind(orderData.api_id)
                    .first<{ account_data: string | null }>();

                if (!method) throw new Error('Payment method not found.');
                isPix = true;
                pixKey = method.account_data?.split('-')[0];
                merchantName = method.account_data?.split('-')[1] ?? merchantName;
                merchantCity = method.account_data?.split('-')[2] ?? merchantCity;

                if (!pixKey) throw new Error('Pix key not configured.');

                const payload = buildPixStaticPayload({
                    pixKey,
                    merchantName,
                    merchantCity,
                    amount: baseValue,
                    txid: `ORDER${orderId}`,
                });

                paymentInfo = {
                    qrCode: payload,
                    qrCodeBase64: await pixPayloadToBase64Png(payload),
                    expiresAt: null,
                };

                variant = 'order_confirmation_pix_offline';
                paymentData = await getPaymentData('pix', language);
                subject = EMAIL_SUBJECTS[variant][language].replace('{orderId}', String(orderId));

            }

            if (orderData.payment_method === 'transfer') {
                // PODERIA RETONAR OS DADOS DA CONTA NO paymentInfo pra exibir no frontend tambem!
                variant = 'order_confirmation_transfer';
                paymentData = await getPaymentData('transfer', language);
                subject = EMAIL_SUBJECTS[variant][language].replace('{orderId}', String(orderId));
            }


            const order = await getFullOrderById(orderId, language);
            if (!order) throw new Error('Order not found.');

            let items = [];
            try {
                items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            } catch (e) {
                items = [];
            }

            let pixInfo = null;
            if (isPix) {
                pixInfo = {
                    copyPaste: paymentInfo?.qrCode,
                    qrCodeBase64: paymentInfo?.qrCodeBase64,
                    pixKey,
                    merchantName,
                    txid: `ORDER#${order.id}`,
                }
            }

            const emailData = {
                language,
                currency: config?.currency,
                siteName: config?.site_name,
                siteDomain: config?.domain,
                SitePhone: config?.contact_phone || '',
                customerName: order.user_name,
                customerEmail: order.email,
                customerPhone: order.phone,
                orderId: order.id,
                orderStatus: order.order_status,
                orderDate: order.order_date,
                paymentMethod: order.payment_method,
                bankInfo: paymentData?.account_data,
                installments: order.installments,
                installmentPrice: Number(order.total_value) / Number(order.installments),
                productsValue: order.products_value,
                shippingValue: order.shipping_value,
                interest: order.interest,
                baseValue: order.base_value,
                discountValue,
                totalValue: order.total_value,
                observations: order.observations,
                carrierName: order.carrier_name,
                delivery: order.delivery_option,
                shippingZip: order.shipping_zip,
                shippingStreet: order.shipping_street,
                shippingNumber: order.shipping_number,
                shippingComplement: order.shipping_complement,
                shippingNeighborhood: order.shipping_neighborhood,
                shippingCity: order.shipping_city,
                shippingState: order.shipping_state,
                items,
                pixInfo,
            };

            const html = await renderOrderConfirmationTemplate(emailData);

            ctx.waitUntil(MailSender.sendEmail({
                type: 'sales',
                to: user.email,
                subject,
                html,
            }).catch((err) => console.error('[order] Failed to send orderconfirmation email:', err)));

            return {
                success: true,
                data: { id: orderId, baseValue, paymentInfo },
                message: 'Order successfully received.'
            };

        }

        return { success: false, error: 'Failed to process order.', code: 'INTERNAL_ERROR' };

    } catch (err: any) {
        console.error("Failed to create order:", err);

        if (orderId) {
            const current = await db
                .prepare('SELECT order_status FROM tb_order WHERE id = ?')
                .bind(orderId)
                .first<{ order_status: string }>();

            if (current?.order_status === 'pending') {
                const transition = await transitionOrder(orderId, 'payment_error');
                if (!transition.success) {
                    console.error("Error updating order status to payment_error:", transition.error);
                }
            } else {
                console.error(`[CRITICAL] Order ${orderId} failed after reaching status '${current?.order_status}' — needs manual review, NOT auto-demoting`, err);
            }
        }

        if (err instanceof MercadoPagoPaymentError) {
            return { success: false, error: err.message, code: err.code, statusDetail: err.statusDetail };
        }

        return { success: false, error: 'Error registering order.', code: 'INTERNAL_ERROR' };
    }
}

export async function getFullOrderById(orderId: number, language: string = DEFAULT_LANGUAGE) {
    const db = getDb();
    try {
        const result = await db
            .prepare(`
                SELECT 
                    o.*,
                    u.user_name,
                    u.email,
                    u.preferred_language,
                    u.phone,
                    ct.carrier_name,
                    (
                        SELECT json_group_array(
                            json_object(
                                'product_name', oi.product_name,
                                'quantity', oi.quantity,
                                'price', oi.price,
                                'sku', p.sku
                            )
                        )
                        FROM order_item oi
                        LEFT JOIN product p ON p.id = oi.product_id
                        WHERE oi.order_id = o.id
                    ) AS items
                FROM tb_order o
                LEFT JOIN user u ON u.id = o.user_id
                LEFT JOIN carrier c ON c.id = o.carrier_id
                LEFT JOIN carrier_translation ct ON ct.carrier_id = c.id 
                    AND ct.translation_language = ?
                WHERE o.id = ?
            `)
            .bind(language, orderId)
            .first();

        if (!result) return null;

        if (typeof result.items === 'string') {
            try {
                result.items = JSON.parse(result.items);
            } catch (parseErr) {
                console.error('[getFullOrderById] Failed to parse JSON items:', {
                    orderId,
                    raw: result.items,
                });
                result.items = [];
            }
        }

        if (!Array.isArray(result.items)) {
            result.items = [];
        }

        return result;

    } catch (err: any) {
        console.error('getFullOrderById database error:', orderId, language, err);
        return null;
    }
}

interface PaymentData {
    id: number;
    method_type: string;
    account_data: string | null;
    discount_percent: number | null;
    icon: string | null;
    title: string | null;
    method_description: string | null;
}
async function getPaymentData(methodType: string, language: string = DEFAULT_LANGUAGE): Promise<PaymentData | null> {
    const db = getDb();
    try {
        const result = await db
            .prepare(`
                SELECT 
                    pm.id,
                    pm.method_type,
                    pm.account_data,
                    pm.discount_percent,
                    pm.icon,
                    pmt.title,
                    pmt.method_description
                FROM payment_method pm
                LEFT JOIN payment_method_translation pmt 
                    ON pmt.payment_method_id = pm.id 
                    AND pmt.translation_language = ?
                WHERE pm.method_type = ?
                  AND pm.active = 1
                LIMIT 1
            `)
            .bind(language, methodType)
            .first<PaymentData>();

        return result ?? null;

    } catch (err: any) {
        console.error('getPaymentData database error:', methodType, language, err);
        return null;
    }
}

export async function listOrdersByUserUuid(userUuid: string, language: string = DEFAULT_LANGUAGE): Promise<IOrderDetails[]> {
    const db = getDb();

    try {
        const ordersResult = await db
            .prepare(`
                SELECT 
                    o.id,
                    o.order_date,
                    o.order_status,
                    o.payment_method,
                    o.shipping_carrier_name,
                    o.shipping_service,
                    o.installments,
                    o.delivery_option,
                    o.base_value,
                    o.products_value,
                    o.shipping_value,
                    o.total_value,
                    o.discount_value,
                    o.interest,
                    o.observations,
                    o.tracking,

                    -- Endereço (snapshot salvo no pedido)
                    o.shipping_zip,
                    o.shipping_street,
                    o.shipping_number,
                    o.shipping_complement,
                    o.shipping_neighborhood,
                    o.shipping_city,
                    o.shipping_state,

                    -- Cliente
                    u.user_name,
                    u.email,
                    u.phone,

                    -- Transportadora
                    ct.carrier_name
                FROM tb_order o
                INNER JOIN user u ON u.id = o.user_id
                LEFT JOIN carrier c ON c.id = o.carrier_id
                LEFT JOIN carrier_translation ct 
                    ON ct.carrier_id = c.id 
                    AND ct.translation_language = ?
                WHERE u.uuid = ?

                -- ORDER BY o.order_date DESC
                ORDER BY 
                    (o.order_status = 'archived') ASC,
                    o.order_date DESC`)
            .bind(language, userUuid)
            .all<any>();

        const orders = ordersResult.results ?? [];
        if (orders.length === 0) return [];

        const orderIds = orders.map(o => o.id);
        const placeholders = orderIds.map(() => '?').join(',');

        const itemsResult = await db
            .prepare(`
                SELECT 
                    oi.id,
                    oi.order_id,
                    oi.product_name,
                    oi.quantity,
                    oi.price,
                    oi.product_id,
                    p.sku,
                    pt.title,
                    pt.slug
                FROM order_item oi
                LEFT JOIN product p ON p.id = oi.product_id
                LEFT JOIN product_translation pt 
                    ON pt.product_id = oi.product_id 
                    AND pt.translation_language = ?
                WHERE oi.order_id IN (${placeholders})
                ORDER BY oi.order_id, oi.id
            `)
            .bind(language, ...orderIds)
            .all<any>();

        const itemsByOrder = new Map<number, any[]>();
        for (const item of itemsResult.results ?? []) {
            if (!itemsByOrder.has(item.order_id)) {
                itemsByOrder.set(item.order_id, []);
            }
            itemsByOrder.get(item.order_id)!.push({
                id: item.id,
                product_id: item.product_id,
                product_name: item.title ?? item.product_name,
                product_sku: item.sku ?? null,
                quantity: item.quantity,
                price: item.price,
                slug: item.slug ?? null,
            });
        }

        return orders.map(order => ({
            id: order.id,
            order_date: order.order_date,
            order_status: order.order_status,
            payment_method: order.payment_method,
            installments: order.installments,
            delivery_option: order.delivery_option,
            base_value: order.base_value,
            products_value: order.products_value,
            shipping_value: order.shipping_value,
            discount_value: order.discount_value,
            total_value: order.total_value,
            interest: order.interest,
            observations: order.observations,
            tracking: order.tracking,
            carrier_name: order.carrier_name,
            shipping_carrier_name: order.shipping_carrier_name,
            shipping_service: order.shipping_service,
            customer: {
                name: order.user_name,
                email: order.email,
                phone: order.phone,
            },
            address: order.shipping_zip ? {
                zip: order.shipping_zip,
                street: order.shipping_street,
                address_number: order.shipping_number,
                complement: order.shipping_complement,
                neighborhood: order.shipping_neighborhood,
                city: order.shipping_city,
                address_state: order.shipping_state,
            } : undefined,

            items: itemsByOrder.get(order.id) ?? [],
        }));

    } catch (err: any) {
        console.error('listOrdersByUserUuid database error:', userUuid, language, err);
        throw err;
    }
}


// HELPER


async function cleanupStaleOrders(db: any) {
    try {
        const stale = await db
            .prepare(`
                SELECT o.id
                FROM tb_order o
                WHERE o.order_status = 'pending'
                AND o.api_id IS NOT NULL
                AND o.api_id != 1
                AND (
                    ( o.payment_method IN ('card', 'pix') AND datetime(o.order_date) < datetime('now', '-30 minutes') )
                    OR
                    ( o.payment_method = 'boleto' AND datetime(o.order_date) < datetime('now', '-3 days') )
                )
                LIMIT 20`)
            .all();

        for (const row of stale.results) {
            const orderId = row.id;
            try {
                const transition = await transitionOrder(orderId, 'canceled');

                if (!transition.success) {
                    // ORDER_STATUS_CONFLICT ou INVALID_TRANSITION aqui não é bug:
                    // significa que o pedido mudou de status entre o SELECT e agora.(ex: webhook confirmou primeiro).
                    if (transition.code !== 'ORDER_STATUS_CONFLICT' && transition.code !== 'INVALID_TRANSITION') {
                        console.error(`[cleanup] Failed to cancel stale order ${orderId}:`, transition.error);
                    }
                    continue;
                }

            } catch (err) {
                console.error(`[cleanup] Failed to remove stale order ${orderId}:`, err);
            }
        }
    } catch (error) {
        console.error('cleanupStaleOrders database error:', error);
    }
}
