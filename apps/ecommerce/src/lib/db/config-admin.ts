import type { IConfig } from '@/lib/schemas/config';
import type { IResult } from '@/lib/types/generic';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/lib/constants';


// get
export async function getAdminConfig(locale: string): Promise<IConfig | null> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const config = await db
            .prepare(`
                SELECT
                    c.id,
                    c.domain,
                    c.currency,
                    c.theme,
                    c.light_logo,
                    c.dark_logo,
                    c.favicon,
                    c.cdn,
                    c.google_analytics,
                    c.contact_phone,
                    c.whatsapp,
                    c.products_per_row,
                    c.products_per_page,
                    c.show_price,
                    c.in_store_pickup,
                    c.new_address_checkout,
                    c.maintenance,
                    COALESCE(ct_default.site_name, '') as site_name,
                    COALESCE(ct_default.site_description, '') as site_description,
                    (
                        SELECT json_group_object(
                            translation_language,
                            json_object(
                                'site_name', site_name,
                                'site_description', site_description
                            )
                        )
                        FROM config_translation
                        WHERE config_id = c.id
                    ) as translations
                FROM config c
                LEFT JOIN config_translation ct_default
                    ON ct_default.config_id = c.id AND ct_default.translation_language = ?
                LIMIT 1
                `)
            .bind(language)
            .first();

        if (!config) return null;

        if (config.translations) {
            try {
                config.translations = JSON.parse(config.translations as string);
            } catch (e) {
                config.translations = {};
            }
        }
        return config as IConfig;

    } catch (err) {
        console.error('getAdminConfig database error', locale, err);
        throw err;
    }
}

// update
export async function updateConfig(data: Partial<IConfig>): Promise<IResult<IConfig>> {
    try {
        const db = getDb();

        const currentConfig = await db
            .prepare(`SELECT * FROM config LIMIT 1`)
            .first();

        if (!currentConfig) return { success: false, error: 'Config not found', code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            domain: 'domain',
            currency: 'currency',
            light_logo: 'light_logo',
            dark_logo: 'dark_logo',
            favicon: 'favicon',
            cdn: 'cdn',
            google_analytics: 'google_analytics',
            contact_phone: 'contact_phone',
            whatsapp: 'whatsapp',
            products_per_row: 'products_per_row',
            products_per_page: 'products_per_page',
            show_price: 'show_price',
            in_store_pickup: 'in_store_pickup',
            new_address_checkout: 'new_address_checkout',
            maintenance: 'maintenance',
            theme: 'theme',
        };

        for (const [key, value] of Object.entries(data)) {
            if (!fieldMap[key]) continue;

            const columnName = fieldMap[key];
            const currentValue = (currentConfig as any)[columnName];
            let newValue: any = value;

            if (['show_price', 'in_store_pickup', 'new_address_checkout', 'maintenance'].includes(columnName)) {
                newValue = value ? 1 : 0;
            }

            if (newValue !== currentValue) {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(newValue);
            }
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE config SET ${fieldsToUpdate.join(', ')}`)
                .bind(...values)
                .run();
        }

        let translationUpdated = false;
        if (data.translations) {
            const existingTranslations = await db
                .prepare(` SELECT translation_language, site_name, site_description FROM config_translation WHERE config_id = ?`)
                .bind((currentConfig as any).id)
                .all();

            const existingMap: Record<string, any> = {};
            for (const row of existingTranslations.results || []) {
                existingMap[(row as any).translation_language] = row;
            }

            for (const lang of SUPPORTED_LANGUAGES) {
                const translationData = data.translations[lang];

                if (!translationData) continue;

                const siteName = translationData.site_name || '';
                const siteDescription = translationData.site_description || '';

                if (!siteName && !siteDescription && !existingMap[lang]) continue;

                const existing = existingMap[lang];

                if (existing) {
                    await db
                        .prepare(`UPDATE config_translation SET site_name = ?, site_description = ? WHERE config_id = ? AND translation_language = ?`)
                        .bind(siteName || existing.site_name || '', siteDescription || existing.site_description || '', (currentConfig as any).id, lang)
                        .run();
                    translationUpdated = true;
                } else {
                    await db
                        .prepare(`INSERT INTO config_translation (config_id, translation_language, site_name, site_description) VALUES (?, ?, ?, ?)`)
                        .bind((currentConfig as any).id, lang, siteName || '', siteDescription || '')
                        .run();
                    translationUpdated = true;
                }
            }
        }

        if (fieldsToUpdate.length === 0 && !translationUpdated) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' };

        const updatedConfig = await db
            .prepare(`
                SELECT
                    c.id,
                    c.domain,
                    c.currency,
                    c.theme,
                    c.light_logo,
                    c.dark_logo,
                    c.favicon,
                    c.cdn,
                    c.google_analytics,
                    c.contact_phone,
                    c.whatsapp,
                    c.products_per_row,
                    c.products_per_page,
                    c.show_price,
                    c.in_store_pickup,
                    c.new_address_checkout,
                    c.maintenance,
                    COALESCE(ct_default.site_name, '') as site_name,
                    COALESCE(ct_default.site_description, '') as site_description,
                    (
                        SELECT json_group_object(
                            translation_language,
                            json_object(
                                'site_name', site_name,
                                'site_description', site_description
                            )
                        )
                        FROM config_translation
                        WHERE config_id = c.id
                    ) as translations
                FROM config c
                LEFT JOIN config_translation ct_default
                    ON ct_default.config_id = c.id AND ct_default.translation_language = ?
                LIMIT 1
                `)
            .bind(DEFAULT_LANGUAGE)
            .first();

        if (updatedConfig && updatedConfig.translations) {
            try {
                updatedConfig.translations = JSON.parse(updatedConfig.translations as string);
            } catch (e) {
                updatedConfig.translations = {};
            }
        }

        return {
            success: true,
            data: updatedConfig as IConfig,
            message: 'Config updated successfully'
        };

    } catch (err) {
        console.error('updateConfig database error', err);
        throw err;
    }
}
