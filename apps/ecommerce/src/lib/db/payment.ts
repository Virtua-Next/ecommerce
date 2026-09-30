import { getDb } from "@/lib/cloudflare/context";
import { ILocalizedPaymentApiFields, ILocalizedPaymentMethodFields, IPaymentApiTranslated, IPaymentMethodTranslated } from "@/lib/schemas/payment";
import { SupportedLanguage } from "@/lib/types/generic";
import { DEFAULT_LANGUAGE } from "../constants";


// apis
export async function listPaymentApis(locale?: string): Promise<IPaymentApiTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT 
                    p.id, 
                    p.api_provider,
                    p.public_key,
                    p.webhook,
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
                WHERE p.active = 1
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
                private_key: '',
                webhook: typedRow.webhook,
                webhook_secret: '',
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
        console.error('listPaymentApis database error', err);
        throw err;
    }
}

// methods
export async function listPaymentMethods(locale?: string): Promise<IPaymentMethodTranslated[]> {
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
                WHERE m.active = 1
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
        console.error('listPaymentMethods database error', err);
        throw err;
    }
}
