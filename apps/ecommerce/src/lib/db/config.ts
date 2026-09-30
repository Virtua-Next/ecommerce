import type { IConfig } from '@/lib/schemas/config';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants'


export async function getConfig(locale?: string): Promise<IConfig | null> {
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
                    COALESCE(ct.site_name, ct_default.site_name, '') as site_name,
                    COALESCE(ct.site_description, ct_default.site_description, '') as site_description,
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
                    ) as translations,
                    json_object(
                        'og_image', m.og_image,
                        'x_image', m.x_image,
                        'robots_directive', m.robots_directive,
                        'title', COALESCE(mt.title, mt_default.title),
                        'metadata_description', COALESCE(mt.metadata_description, mt_default.metadata_description),
                        'keywords', COALESCE(mt.keywords, mt_default.keywords),
                        'og_title', COALESCE(mt.og_title, mt_default.og_title),
                        'og_description', COALESCE(mt.og_description, mt_default.og_description),
                        'x_title', COALESCE(mt.x_title, mt_default.x_title),
                        'x_description', COALESCE(mt.x_description, mt_default.x_description)
                    ) as metadata
                FROM config c
                LEFT JOIN config_translation ct ON ct.config_id = c.id AND ct.translation_language = ?
                LEFT JOIN config_translation ct_default ON ct_default.config_id = c.id AND ct_default.translation_language = ?
                LEFT JOIN metadata m ON m.target_type = 'config' AND m.target_id = c.id
                LEFT JOIN metadata_translation mt ON mt.metadata_id = m.id AND mt.translation_language = ?
                LEFT JOIN metadata_translation mt_default ON mt_default.metadata_id = m.id AND mt_default.translation_language = ?
                LIMIT 1
                `)
            .bind(language, DEFAULT_LANGUAGE, language, DEFAULT_LANGUAGE)
            .first();

        if (!config) return null;

        if (config.translations) {
            try { config.translations = JSON.parse(config.translations as string); }
            catch (e) { config.translations = {}; }
        }
        if (config.metadata) {
            try { config.metadata = JSON.parse(config.metadata as string); }
            catch (e) { config.metadata = undefined; }
        }

        return config as IConfig;

    } catch (err) {
        console.error('getConfig database error', locale, err);
        throw err;
    }
}
