import { getDb } from "@/lib/cloudflare/context";
import { IPaymentApiTranslated, ILocalizedPaymentApiFields, ICreatePaymentApiPayload, IUpdatePaymentApiPayload, IPaymentMethodTranslated, ILocalizedPaymentMethodFields, ICreatePaymentMethodPayload, IUpdatePaymentMethodPayload, IPaymentApi } from "@/lib/schemas/payment";
import { IResult, SupportedLanguage } from "@/lib/types/generic";
import { DEFAULT_LANGUAGE, DEFAULT_PAYMENT_API_IDS, STRIPE_API_VERSION } from "@/lib/constants";
import { fetchTranslations, upsertTranslation } from "./translation";
import Stripe from "stripe";
import { setupStripeWebhook } from "@/lib/stripe/stripe";


// APIs

// list
export async function adminAllPaymentAPIs(locale?: string): Promise<IPaymentApiTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT 
                    p.id, 
                    p.api_provider,
                    p.public_key,
                    p.private_key,
                    p.webhook,
                    p.webhook_secret,
                    p.webhook_id,
                    p.account_id,
                    p.supports_installments,
                    p.active,
                    COALESCE(pt.title, pt_default.title) AS title,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', pt_all.translation_language,
                                'title', pt_all.title
                            )
                        )
                        FROM payment_api_translation pt_all
                        WHERE pt_all.payment_api_id = p.id
                    ) AS translations_json
                FROM payment_api p
                LEFT JOIN payment_api_translation pt 
                    ON pt.payment_api_id = p.id AND pt.translation_language = ?
                LEFT JOIN payment_api_translation pt_default 
                    ON pt_default.payment_api_id = p.id AND pt_default.translation_language = ?
                ORDER BY p.active DESC, COALESCE(pt.title, pt_default.title) ASC
            `)
            .bind(language, DEFAULT_LANGUAGE)
            .all();

        return results.map((row) => {
            const typedRow = row as Record<string, any>;
            const translations: Record<SupportedLanguage, ILocalizedPaymentApiFields> = {} as Record<SupportedLanguage, ILocalizedPaymentApiFields>;

            if (typedRow.translations_json) {
                try {
                    const translationsJson = typeof typedRow.translations_json === 'string'
                        ? typedRow.translations_json
                        : JSON.stringify(typedRow.translations_json ?? []);
                    const translationsArray = JSON.parse(translationsJson) as Array<Record<string, any>>;
                    translationsArray.forEach((t) => {
                        translations[t.language as SupportedLanguage] = {
                            title: t.title || '',
                        };
                    });
                } catch (e) {
                    console.error('Error parsing translations for payment API:', typedRow.id, e);
                }
            }

            return {
                id: typedRow.id,
                api_provider: typedRow.api_provider,
                public_key: typedRow.public_key,
                private_key: typedRow.private_key,
                webhook: typedRow.webhook,
                webhook_secret: typedRow.webhook_secret,
                webhook_id: typedRow.webhook_id,
                account_id: typedRow.account_id,
                supports_installments: Boolean(typedRow.supports_installments),
                active: Boolean(typedRow.active),
                title: typedRow.title,
                translation_language: language,
                translations,
            };
        }) as IPaymentApiTranslated[];

    } catch (err) {
        console.error('adminAllPaymentAPIs database error', err);
        throw err;
    }
}

// by id
async function adminPaymentAPIById(id: number): Promise<IPaymentApiTranslated | null> {
    try {
        const db = getDb();
        const paymentApi = await db
            .prepare(`SELECT * FROM payment_api WHERE id = ?`)
            .bind(id)
            .first<IPaymentApi>();

        if (!paymentApi) return null;

        const translationsByLanguage = await fetchTranslations('payment_api_translation', 'payment_api_id', id);
        const translations: Record<string, { title: string }> = {};
        for (const [language, row] of Object.entries(translationsByLanguage)) {
            translations[language] = {
                title: row.title ?? ''
            };
        }

        return {
            id: paymentApi.id,
            api_provider: paymentApi.api_provider,
            public_key: paymentApi.public_key,
            private_key: paymentApi.private_key,
            webhook: paymentApi.webhook,
            webhook_secret: paymentApi.webhook_secret,
            webhook_id: paymentApi.webhook_id,
            account_id: paymentApi.account_id,
            supports_installments: Boolean(paymentApi.supports_installments),
            active: Boolean(paymentApi.active),
            title: translations[DEFAULT_LANGUAGE].title ?? '',
            translation_language: DEFAULT_LANGUAGE,
            translations
        };

    } catch (err) {
        console.error('adminPaymentAPIById database error', err);
        throw err;
    }
}

// create
export async function createPaymentAPI(data: ICreatePaymentApiPayload): Promise<IResult<IPaymentApiTranslated>> {
    try {
        const db = getDb();
        const firstTranslation = data.translations?.[DEFAULT_LANGUAGE];
        if (!firstTranslation?.title) return { success: false, error: "Title is required", code: 'VALIDATION_ERROR' };

        const existing = await db
            .prepare(`SELECT 1 FROM payment_api_translation WHERE title = ? AND translation_language = ?`)
            .bind(firstTranslation.title, DEFAULT_LANGUAGE)
            .first();

        if (existing) return { success: false, error: "A payment api with this name already exists", code: 'DUPLICATE' };

        if (data.api_provider === 'stripe') {
            if (!data.private_key) return { success: false, error: 'A private_key is required', code: 'VALIDATION_ERROR' };
            if (!data.webhook) return { success: false, error: 'Webhook URL is required', code: 'VALIDATION_ERROR' };

            const isHttps = data.webhook.startsWith('https://');
            const isStripeEndpoint = data.webhook.endsWith('/api/webhook/stripe-webhook');
            if (!isHttps || !isStripeEndpoint) return { success: false, error: 'Invalid Webhook', code: 'VALIDATION_ERROR' };

            const result = await setupStripeWebhook({
                privateKey: data.private_key,
                webhookUrl: data.webhook,
            });

            if (!result.success) return { success: false, error: result.error, code: 'VALIDATION_ERROR' };

            data.webhook_secret = result.data.webhook_secret;
            data.webhook_id = result.data.webhook_id;
        }

        const result = await db
            .prepare(`
                INSERT INTO payment_api (
                    api_provider, public_key, private_key, webhook,
                    webhook_secret, webhook_id, account_id, supports_installments, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(
                data.api_provider,
                data.public_key,
                data.private_key,
                data.webhook ?? null,
                data.webhook_secret ?? null,
                data.webhook_id ?? null,
                data.account_id ?? null,
                data.supports_installments ? 1 : 0,
                data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        if (data.translations) {
            for (const [lang, fields] of Object.entries(data.translations as Record<string, { title?: string }>)) {
                try {
                    await upsertTranslation('payment_api_translation', 'payment_api_id', newId, lang, {
                        title: fields.title,
                    });
                } catch (e) {
                    await db.prepare('DELETE FROM payment_api WHERE id = ?').bind(newId).run();
                    return {
                        success: false,
                        error: 'Failed to create payment api translation',
                        code: 'INTERNAL_ERROR',
                    };
                }
            }
        }

        const paymentApi = await adminPaymentAPIById(newId);
        if (!paymentApi) return { success: false, error: 'Failed to get payment Api', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: paymentApi,
            message: 'Payment API created successfully',
        };

    } catch (err) {
        console.error('createPaymentAPI database error', err);
        throw err;
    }
}

// update
export async function updatePaymentAPI(id: number, data: IUpdatePaymentApiPayload): Promise<IResult<IPaymentApiTranslated>> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id FROM payment_api WHERE id = ?`)
            .bind(id)
            .first();

        if (!existing) return { success: false, error: "Payment API not found", code: 'NOT_FOUND' };


        if (data.api_provider === 'stripe') {
            if (!data.private_key) return { success: false, error: 'A private_key is required', code: 'VALIDATION_ERROR' };
            if (!data.webhook) return { success: false, error: 'Webhook URL is required', code: 'VALIDATION_ERROR' };

            const isHttps = data.webhook.startsWith('https://');
            const isStripeEndpoint = data.webhook.endsWith('/api/webhook/stripe-webhook');
            if (!isHttps || !isStripeEndpoint) return { success: false, error: 'Invalid Webhook', code: 'VALIDATION_ERROR' };

            const needsWebhookSetup = !existing.webhook_id || existing.private_key !== data.private_key || existing.webhook !== data.webhook;
            if (needsWebhookSetup) {
                const result = await setupStripeWebhook({
                    privateKey: data.private_key,
                    webhookUrl: data.webhook,
                });

                if (!result.success) return { success: false, error: result.error, code: 'VALIDATION_ERROR' };

                data.webhook_secret = result.data.webhook_secret;
                data.webhook_id = result.data.webhook_id;

            } else {
                delete (data as any).webhook_secret;
                delete (data as any).webhook_id;
            }
        }

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            api_provider: 'api_provider',
            public_key: 'public_key',
            private_key: 'private_key',
            webhook: 'webhook',
            webhook_secret: 'webhook_secret',
            webhook_id: 'webhook_id',
            account_id: 'account_id',
            supports_installments: 'supports_installments',
            active: 'active',
        };

        for (const [key, value] of Object.entries(data)) {
            if (!fieldMap[key]) continue;
            const columnName = fieldMap[key];
            if (columnName === 'active' || columnName === 'supports_installments') {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value ? 1 : 0);
            } else {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value);
            }
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE payment_api SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const [lang, fields] of Object.entries(data.translations)) {

                try {
                    await upsertTranslation('payment_api_translation', 'payment_api_id', id, lang, {
                        title: (fields as { title?: string }).title,
                    });
                } catch (e) {
                    throw new Error('Failed to translate payment api', { cause: e });
                }
            }
        }

        const paymentApi = await adminPaymentAPIById(id);
        if (!paymentApi) return { success: false, error: 'Failed to get Payment API', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: paymentApi,
            message: 'Payment API updated successfully',
        };

    } catch (err) {
        console.error('updatePaymentAPI database error', err);
        throw err;
    }
}

// delete
export async function deletePaymentAPI(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(` SELECT id, api_provider, private_key, webhook_id  FROM payment_api  WHERE id = ?`)
            .bind(id)
            .first<{ id: number; api_provider: string; private_key: string; webhook_id: string | null; }>();

        if (!existing) return { success: false, error: "Payment API not found", code: 'NOT_FOUND' };

        const protectedApis: number = DEFAULT_PAYMENT_API_IDS.DEFAULT;
        if (protectedApis === id) return { success: false, error: 'Default payment API cannot be deleted', code: 'VALIDATION_ERROR' };

        const linkedMethod = await db
            .prepare(`SELECT id FROM payment_method WHERE api_id = ? LIMIT 1`)
            .bind(id)
            .first();

        if (linkedMethod) return { success: false, error: 'Payment API has payment methods linked and cannot be deleted', code: 'VALIDATION_ERROR' };

        if (existing.api_provider === 'stripe' && existing.webhook_id && existing.private_key) {
            try {
                const stripe = new Stripe(existing.private_key, {
                    apiVersion: STRIPE_API_VERSION,
                });

                await stripe.webhookEndpoints.del(existing.webhook_id);

            } catch (err: any) {
                if (err.code === 'resource_missing') {
                    console.warn(`[stripe] Webhook${existing.webhook_id} does not exists on Stripe`);
                } else {
                    console.error('[stripe] Error deleting remote webhook:', {
                        message: err.message,
                        type: err.type,
                        code: err.code,
                    });
                }
            }
        }

        await db.prepare(`DELETE FROM payment_api WHERE id = ?`).bind(id).run();

        return {
            success: true,
            message: "Payment API deleted successfully",
        };

    } catch (err) {
        console.error('deletePaymentAPI database error', err);
        throw err;
    }
}

// webhook by privider
export async function getWebhookSecretByProvider(provider: string): Promise<string | null> {
    try {
        const db = getDb();
        const paymentApi = await db
            .prepare(`SELECT webhook_secret FROM payment_api WHERE api_provider = ? AND active = 1 LIMIT 1`)
            .bind(provider)
            .first<{ webhook_secret: string }>();

        return paymentApi?.webhook_secret ?? null;

    } catch (err) {
        console.error('getWebhookSecretByProvider database error', err);
        throw err;
    }
}


// METHODS


// list
export async function adminAllPaymentMethods(locale?: string): Promise<IPaymentMethodTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT 
                    m.id, 
                    m.method_type,
                    m.account_data,
                    m.api_id,
                    m.installment_sale,
                    m.max_installments,
                    m.active,
                    m.discount_percent,
                    m.icon,
                    COALESCE(mt.title, mt_default.title) AS title,
                    COALESCE(mt.method_description, mt_default.method_description) AS method_description,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', mt_all.translation_language,
                                'title', mt_all.title,
                                'method_description', mt_all.method_description
                            )
                        )
                        FROM payment_method_translation mt_all
                        WHERE mt_all.payment_method_id = m.id
                    ) AS translations_json
                FROM payment_method m
                LEFT JOIN payment_method_translation mt 
                    ON mt.payment_method_id = m.id AND mt.translation_language = ?
                LEFT JOIN payment_method_translation mt_default 
                    ON mt_default.payment_method_id = m.id AND mt_default.translation_language = ?
                ORDER BY m.active DESC, COALESCE(mt.title, mt_default.title) ASC
            `)
            .bind(language, DEFAULT_LANGUAGE)
            .all();

        return results.map((row) => {
            const typedRow = row as Record<string, any>;
            const translations: Record<SupportedLanguage, ILocalizedPaymentMethodFields> = {} as Record<SupportedLanguage, ILocalizedPaymentMethodFields>;

            if (typedRow.translations_json) {
                try {
                    const translationsJson = typeof typedRow.translations_json === 'string'
                        ? typedRow.translations_json
                        : JSON.stringify(typedRow.translations_json ?? []);
                    const translationsArray = JSON.parse(translationsJson) as Array<Record<string, any>>;
                    translationsArray.forEach((t) => {
                        translations[t.language as SupportedLanguage] = {
                            title: t.title || '',
                            method_description: t.method_description || '',
                        };
                    });
                } catch (e) {
                    console.error('Error parsing translations for payment method:', typedRow.id, e);
                }
            }

            return {
                id: typedRow.id,
                method_type: typedRow.method_type,
                account_data: typedRow.account_data,
                api_id: typedRow.api_id,
                installment_sale: Boolean(typedRow.installment_sale),
                max_installments: typedRow.max_installments,
                active: Boolean(typedRow.active),
                discount_percent: typedRow.discount_percent,
                icon: typedRow.icon,
                title: typedRow.title,
                method_description: typedRow.method_description,
                translation_language: language,
                translations,
            };
        }) as IPaymentMethodTranslated[];

    } catch (err) {
        console.error('adminAllPaymentMethods database error', err);
        throw err;
    }
}

// create
export async function createPaymentMethod(data: ICreatePaymentMethodPayload): Promise<IResult<IPaymentMethodTranslated>> {
    try {
        const db = getDb();
        const firstTranslation = data.translations?.[DEFAULT_LANGUAGE];
        if (!firstTranslation?.title) return { success: false, error: "Title is required", code: 'VALIDATION_ERROR' };

        const existing = await db
            .prepare(`SELECT 1 FROM payment_method_translation WHERE title = ? AND translation_language = ?`)
            .bind(firstTranslation.title, DEFAULT_LANGUAGE)
            .first();

        if (existing) return { success: false, error: "A payment method with this name already exists", code: 'DUPLICATE' };

        const result = await db
            .prepare(`INSERT INTO payment_method (method_type, account_data, api_id, installment_sale, max_installments, active, discount_percent, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(data.method_type, data.account_data ?? null, data.api_id, data.installment_sale ? 1 : 0, data.max_installments ?? 1, data.active ? 1 : 0, data.discount_percent ?? 0, data.icon ?? null)
            .run();

        const newId = result.meta.last_row_id;

        if (data.translations) {
            for (const [lang, fields] of Object.entries(data.translations as Record<string, { title?: string; method_description?: string }>)) {

                try {
                    await upsertTranslation('payment_method_translation', 'payment_method_id', newId, lang, {
                        title: fields.title,
                        method_description: fields.method_description,
                    });
                } catch (e) {
                    await db.prepare('DELETE FROM payment_method WHERE id = ?').bind(newId).run();
                    return {
                        success: false,
                        error: 'Failed to create payment method translation',
                        code: 'INTERNAL_ERROR',
                    };
                }
            }
        }

        const method = await adminPaymentMethodById(newId);
        if (!method) return { success: false, error: 'Failed to get Payment Method', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: method,
            message: 'Payment method created successfully',
        };

    } catch (err) {
        console.error('createPaymentMethod database error', err);
        throw err;
    }
}

// update
export async function updatePaymentMethod(id: number, data: IUpdatePaymentMethodPayload): Promise<IResult<IPaymentMethodTranslated>> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id FROM payment_method WHERE id = ?`)
            .bind(id)
            .first();

        if (!existing) return { success: false, error: "Payment method not found", code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            method_type: 'method_type',
            account_data: 'account_data',
            api_id: 'api_id',
            installment_sale: 'installment_sale',
            max_installments: 'max_installments',
            active: 'active',
            discount_percent: 'discount_percent',
            icon: 'icon',
        };

        for (const [key, value] of Object.entries(data)) {
            if (!fieldMap[key]) continue;
            const columnName = fieldMap[key];
            if (['installment_sale', 'active'].includes(columnName)) {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value ? 1 : 0);
            } else {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value);
            }
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE payment_method SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const [lang, fields] of Object.entries(data.translations)) {

                try {
                    await upsertTranslation('payment_method_translation', 'payment_method_id', id, lang, {
                        title: (fields as { title?: string; method_description?: string }).title,
                        method_description: (fields as { title?: string; method_description?: string }).method_description,
                    });
                } catch (e) {
                    throw new Error('Failed to translate payment method', { cause: e });
                }
            }
        }

        const method = await adminPaymentMethodById(id);
        if (!method) return { success: false, error: 'Failed to get Payment method', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: method,
            message: 'Payment method updated successfully',
        };

    } catch (err) {
        console.error('updatePaymentMethod database error', err);
        throw err;
    }
}

// delete
export async function deletePaymentMethod(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();

        const existing = await db.prepare(`SELECT id FROM payment_method WHERE id = ?`).bind(id).first();

        if (!existing) return { success: false, error: "Payment method not found", code: 'NOT_FOUND' };

        await db.prepare(`DELETE FROM payment_method WHERE id = ?`).bind(id).run();

        return {
            success: true,
            message: "Payment method deleted successfully",
        };

    } catch (err) {
        console.error('deletePaymentMethod database error', err);
        throw err;
    }
}

// by id
async function adminPaymentMethodById(id: number): Promise<IPaymentMethodTranslated | null> {
    try {
        const db = getDb();
        const method = await db
            .prepare(`SELECT * FROM payment_method WHERE id = ?`)
            .bind(id)
            .first<IPaymentMethodTranslated>();

        if (!method) return null;

        const translations = await fetchTranslations('payment_method_translation', 'payment_method_id', id);
        const methodTranslations: Record<string, ILocalizedPaymentMethodFields> = {};
        for (const [lang, row] of Object.entries(translations)) {
            methodTranslations[lang] = {
                title: row.title ?? '',
                method_description: row.method_description ?? '',
            };
        }

        return {
            id: method.id,
            method_type: method.method_type,
            account_data: method.account_data,
            api_id: method.api_id,
            installment_sale: Boolean(method.installment_sale),
            max_installments: method.max_installments,
            active: Boolean(method.active),
            discount_percent: method.discount_percent,
            icon: method.icon,
            title: methodTranslations[DEFAULT_LANGUAGE]?.title ?? '',
            method_description: methodTranslations[DEFAULT_LANGUAGE]?.method_description ?? '',
            translation_language: DEFAULT_LANGUAGE,
            translations: methodTranslations,
        };

    } catch (err) {
        console.error('adminPaymentMethodById database error', err);
        throw err;
    }
}
