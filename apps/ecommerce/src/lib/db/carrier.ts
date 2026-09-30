import { getDb } from "@/lib/cloudflare/context";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { ICarrierTranslated, ILocalizedCarrierFields } from "@/lib/schemas/carrier";
import { SupportedLanguage } from "@/lib/types/generic";


export async function listCarriers(country: string, locale?: string): Promise<ICarrierTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT 
                    c.id,
                    c.origin_zip,
                    c.free_shipping,
                    c.free_shipping_from,
                    c.price,
                    c.carrier_type,
                    c.carrier_service,
                    c.calculation_method,
                    c.active,
                    COALESCE(ct.carrier_name, ct_default.carrier_name) AS carrier_name,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', ct_all.translation_language,
                                'carrier_name', ct_all.carrier_name
                            )
                        )
                        FROM carrier_translation ct_all
                        WHERE ct_all.carrier_id = c.id
                    ) AS translations_json,
                    (
                        SELECT json_group_array(cc.country_code)
                        FROM carrier_country cc
                        WHERE cc.carrier_id = c.id
                    ) AS supported_countries_json
                FROM carrier c
                LEFT JOIN carrier_translation ct 
                    ON ct.carrier_id = c.id AND ct.translation_language = ?
                LEFT JOIN carrier_translation ct_default 
                    ON ct_default.carrier_id = c.id AND ct_default.translation_language = ?
                WHERE c.active = 1
                    AND EXISTS (
                        SELECT 1 FROM carrier_country cc
                        WHERE cc.carrier_id = c.id AND cc.country_code = ?
                    )
                ORDER BY c.active DESC, COALESCE(ct.carrier_name, ct_default.carrier_name) ASC`)
            .bind(language, DEFAULT_LANGUAGE, country)
            .all();

        return results.map((row) => {
            const translations: Record<SupportedLanguage, ILocalizedCarrierFields> = {} as Record<SupportedLanguage, ILocalizedCarrierFields>;
            if (row.translations_json) {
                try {
                    const translationsJson = typeof row.translations_json === 'string' ? row.translations_json : JSON.stringify(row.translations_json ?? []);

                    const translationsArray = JSON.parse(translationsJson) as Array<{ language: SupportedLanguage; carrier_name: string; }>

                    for (const t of translationsArray) {
                        translations[t.language] = {
                            carrier_name: t.carrier_name || '',
                        };
                    }
                } catch (err) {
                    console.error(`Carrier id=${row.id} has invalid translations_json:`, err);
                }
            }

            let supportedCountries: string[] = [];
            if (row.supported_countries_json) {
                try {
                    const raw = typeof row.supported_countries_json === 'string'
                        ? row.supported_countries_json
                        : JSON.stringify(row.supported_countries_json ?? []);
                    const arr = JSON.parse(raw);
                    supportedCountries = Array.isArray(arr) ? arr.filter(Boolean) : [];
                } catch (e) {
                    console.error('Error parsing supported_countries for carrier:', row.id, e);
                }
            }

            return {
                id: row.id,
                origin_zip: row.origin_zip,
                free_shipping: Boolean(row.free_shipping),
                free_shipping_from: row.free_shipping_from,
                price: row.price,
                carrier_type: row.carrier_type,
                carrier_service: row.carrier_service,
                calculation_method: row.calculation_method,
                active: Boolean(row.active),
                carrier_name: row.carrier_name,
                translation_language: language,
                translations,
                supported_countries: supportedCountries
            };
        }) as ICarrierTranslated[];


    } catch (err) {
        console.error('listCarriers database error', locale, err);
        throw err;
    }
}
