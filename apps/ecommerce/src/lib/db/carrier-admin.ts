import { ICarrierTranslated, ICreateCarrierPayload, ILocalizedCarrierFields, IUpdateCarrierPayload } from "@/lib/schemas/carrier";
import { getDb } from "@/lib/cloudflare/context";
import { DEFAULT_CARRIER_IDS, DEFAULT_LANGUAGE } from "@/lib/constants";
import { fetchTranslations, upsertTranslation } from "@/lib/db/translation";
import { IResult, SupportedLanguage } from "@/lib/types/generic";


// list
export async function adminAllCarriers(locale?: string): Promise<ICarrierTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT 
                    c.id, 
                    c.api_key,
                    c.client_id,
                    c.client_secret,
                    c.token_expires_at,
                    c.refresh_token,
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
                ORDER BY c.active DESC, COALESCE(ct.carrier_name, ct_default.carrier_name) ASC`)
            .bind(language, DEFAULT_LANGUAGE)
            .all();

        return results.map((row) => {
            const typedRow = row as Record<string, any>;
            const translations: Record<SupportedLanguage, ILocalizedCarrierFields> = {} as Record<SupportedLanguage, ILocalizedCarrierFields>;

            if (typedRow.translations_json) {
                try {
                    const translationsJson = typeof typedRow.translations_json === 'string'
                        ? typedRow.translations_json
                        : JSON.stringify(typedRow.translations_json ?? []);
                    const translationsArray = JSON.parse(translationsJson) as Array<Record<string, any>>;
                    translationsArray.forEach((t) => {
                        translations[t.language as SupportedLanguage] = {
                            carrier_name: t.carrier_name || '',
                        };
                    });
                } catch (e) {
                    console.error('Error parsing translations for carrier:', typedRow.id, e);
                }
            }

            let supportedCountries: string[] = [];
            if (typedRow.supported_countries_json) {
                try {
                    const raw = typeof typedRow.supported_countries_json === 'string'
                        ? typedRow.supported_countries_json
                        : JSON.stringify(typedRow.supported_countries_json ?? []);
                    const arr = JSON.parse(raw);
                    supportedCountries = Array.isArray(arr) ? arr.filter(Boolean) : [];
                } catch (e) {
                    console.error('Error parsing supported_countries for carrier:', typedRow.id, e);
                }
            }

            return {
                id: typedRow.id,
                api_key: typedRow.api_key,
                client_id: typedRow.client_id,
                client_secret: typedRow.client_secret,
                token_expires_at: typedRow.token_expires_at,
                refresh_token: typedRow.refresh_token,
                origin_zip: typedRow.origin_zip,
                free_shipping: Boolean(typedRow.free_shipping),
                free_shipping_from: typedRow.free_shipping_from,
                price: typedRow.price,
                carrier_type: typedRow.carrier_type,
                carrier_service: typedRow.carrier_service,
                calculation_method: typedRow.calculation_method,
                active: Boolean(typedRow.active),
                carrier_name: typedRow.carrier_name,
                translation_language: language,
                translations,
                supported_countries: supportedCountries
            };
        }) as ICarrierTranslated[];

    } catch (err) {
        console.error('adminAllCarriers database error', err);
        throw err;
    }
}

// by id
export async function adminCarrierById(id: number): Promise<ICarrierTranslated | null> {
    try {
        const db = getDb();
        const carrier = await db
            .prepare(`SELECT * FROM carrier WHERE id = ?`)
            .bind(id)
            .first<ICarrierTranslated>();

        if (!carrier) return null;

        const translations = await fetchTranslations('carrier_translation', 'carrier_id', id);

        const carrierTranslations: Record<string, ILocalizedCarrierFields> = {};

        for (const [lang, row] of Object.entries(translations)) {
            carrierTranslations[lang] = {
                carrier_name: row.carrier_name ?? '',
            };
        }

        const countries = await db
            .prepare(`SELECT country_code FROM carrier_country WHERE carrier_id = ?`)
            .bind(id)
            .all<{ country_code: string }>();

        const supportedCountries = (countries.results ?? []).map((r) => r.country_code);

        return {
            id: carrier.id,
            api_key: carrier.api_key,
            client_id: carrier.client_id,
            client_secret: carrier.client_secret,
            token_expires_at: carrier.token_expires_at,
            refresh_token: carrier.refresh_token,
            origin_zip: carrier.origin_zip,
            free_shipping: Boolean(carrier.free_shipping),
            free_shipping_from: carrier.free_shipping_from,
            price: carrier.price,
            carrier_type: carrier.carrier_type,
            carrier_service: carrier.carrier_service,
            calculation_method: carrier.calculation_method,
            active: Boolean(carrier.active),
            translations: carrierTranslations,
            supported_countries: supportedCountries,
        };

    } catch (err) {
        console.error('admin carrierById database error', id, err);
        throw err;
    }
}

// create
export async function createCarrier(data: ICreateCarrierPayload): Promise<IResult<ICarrierTranslated>> {
    try {
        const db = getDb();
        const firstTranslation = data.translations?.[DEFAULT_LANGUAGE];
        if (!firstTranslation?.carrier_name) return { success: false, error: "Carrier name is required", code: 'VALIDATION_ERROR' };

        const existing = await db
            .prepare(`SELECT 1 FROM carrier_translation WHERE carrier_name = ? AND translation_language = ?`)
            .bind(firstTranslation.carrier_name, DEFAULT_LANGUAGE)
            .first();

        if (existing) return { success: false, error: "A carrier with this name already exists", code: 'DUPLICATE' };

        const result = await db
            .prepare(`
                INSERT INTO carrier (
                    api_key, refresh_token, origin_zip, free_shipping,
                    free_shipping_from, price, carrier_type, carrier_service,
                    client_id, client_secret, token_expires_at, calculation_method, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(
                data.api_key ?? null,
                data.refresh_token ?? null,
                data.origin_zip ?? null,
                data.free_shipping ? 1 : 0,
                data.free_shipping_from ?? 0,
                data.price ?? 0,
                data.carrier_type ?? 'personalized',
                data.carrier_service ?? null,
                data.client_id ?? null,
                data.client_secret ?? null,
                data.token_expires_at ?? null,
                data.calculation_method ?? null,
                data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        if (data.translations) {
            for (const [lang, fields] of Object.entries(data.translations as Record<string, { carrier_name?: string }>)) {

                try {
                    await upsertTranslation('carrier_translation', 'carrier_id', newId, lang, {
                        carrier_name: fields.carrier_name,
                    });
                } catch (e) {
                    await db.prepare('DELETE FROM carrier WHERE id = ?').bind(newId).run();
                    return {
                        success: false,
                        error: 'Failed to create carrier translation',
                        code: 'INTERNAL_ERROR',
                    };
                }
            }
        }

        if (data.supported_countries && data.supported_countries.length > 0) {
            try {
                const insert = db.prepare('INSERT INTO carrier_country (carrier_id, country_code) VALUES (?, ?)');
                for (const code of data.supported_countries) {
                    await insert.bind(newId, code).run();
                }
            } catch (e) {
                await db.prepare('DELETE FROM carrier WHERE id = ?').bind(newId).run();
                return { success: false, error: 'Failed to create carrier countries', code: 'INTERNAL_ERROR' };
            }
        }

        const carrier = await adminCarrierById(newId);
        if (!carrier) return { success: false, error: 'Failed to get Carrier', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: carrier as ICarrierTranslated,
            message: 'Carrier created successfully'
        };

    } catch (err) {
        console.error('createCarrier database error', data, err);
        throw err;
    }
}

// update
export async function updateCarrier(id: number, data: IUpdateCarrierPayload): Promise<IResult<ICarrierTranslated>> {
    try {
        const db = getDb();

        const existing = await db.prepare(`SELECT id FROM carrier WHERE id = ?`).bind(id).first();
        if (!existing) return { success: false, error: "Carrier not found", code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            api_key: 'api_key',
            refresh_token: 'refresh_token',
            origin_zip: 'origin_zip',
            free_shipping: 'free_shipping',
            free_shipping_from: 'free_shipping_from',
            price: 'price',
            carrier_type: 'carrier_type',
            carrier_service: 'carrier_service',
            client_id: 'client_id',
            client_secret: 'client_secret',
            token_expires_at: 'token_expires_at',
            calculation_method: 'calculation_method',
            active: 'active',
        };

        for (const [key, value] of Object.entries(data)) {
            if (!fieldMap[key]) continue;
            const columnName = fieldMap[key];
            if (['free_shipping', 'active'].includes(columnName)) {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value ? 1 : 0);
            } else {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value);
            }
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE carrier SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const [lang, fields] of Object.entries(data.translations)) {
                try {
                    await upsertTranslation('carrier_translation', 'carrier_id', id, lang, {
                        carrier_name: (fields as { carrier_name?: string }).carrier_name,
                    });
                } catch (e) {
                    throw new Error('Failed to translate carrier', { cause: e });
                }
            }
        }

        if (data.supported_countries !== undefined) {
            try {
                await db.prepare('DELETE FROM carrier_country WHERE carrier_id = ?').bind(id).run();
                const insert = db.prepare('INSERT INTO carrier_country (carrier_id, country_code) VALUES (?, ?)');
                for (const code of data.supported_countries) {
                    await insert.bind(id, code).run();
                }
            } catch (e) {
                throw new Error('Failed to update carrier countries', { cause: e });
            }
        }

        const carrier = await adminCarrierById(id);
        if (!carrier) return { success: false, error: 'Failed to get Carrier', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: carrier as ICarrierTranslated,
            message: 'Carrier updated successfully'
        };

    } catch (err) {
        console.error('updateCarrier database error', id, data, err);
        throw err;
    }
}

// delete
export async function deleteCarrier(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();

        const existing = await db.prepare(`SELECT id FROM carrier WHERE id = ?`).bind(id).first();

        if (!existing) return { success: false, error: "Carrier not found", code: 'NOT_FOUND' };

        const protectedCarriers: number[] = [DEFAULT_CARRIER_IDS.DEFAULT];
        if (protectedCarriers.includes(id)) return { success: false, error: 'Default carrier cannot be deleted', code: 'VALIDATION_ERROR' };

        await db.prepare(`DELETE FROM carrier WHERE id = ?`).bind(id).run();

        return {
            success: true,
            message: "Carrier deleted successfully",
        };

    } catch (err) {
        console.error('deleteCarrier database error', id, err);
        return { success: false, error: "Failed to delete carrier", code: 'INTERNAL_ERROR' };
    }
}
