import type { IConfig } from '@/lib/schemas/config';
import type { IResult, SupportedLanguage } from '@/lib/types/generic';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants';
import { buildTranslationSyncStatements } from '../translations-sync';
import { isSupported, parseLanguages, normalizeLanguages } from '@/i18n/languages';


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
                    c.enabled_languages,
                    c.default_language,
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

        const supported = parseLanguages(config.enabled_languages);
        const def = isSupported(config.default_language) ? config.default_language : DEFAULT_LANGUAGE;

        config.enabled_languages = supported.includes(def) ? supported : [...supported, def];
        config.default_language = def;

        if (config) normalizeLanguages(config);

        return config as IConfig;

    } catch (err) {
        console.error('getAdminConfig database error', locale, err);
        throw err;
    }
}

// update
// Scalar columns updated directly. Languages and translations have their own handling.
const CONFIG_COLUMNS = [
    'domain', 'currency', 'light_logo', 'dark_logo', 'favicon', 'cdn', 'google_analytics',
    'contact_phone', 'whatsapp', 'products_per_row', 'products_per_page',
    'show_price', 'in_store_pickup', 'new_address_checkout', 'maintenance', 'theme',
];

const BOOLEAN_COLUMNS = ['show_price', 'in_store_pickup', 'new_address_checkout', 'maintenance'];

/** Config row + site name/description in `language` + all translations, with languages normalized. */
async function fetchConfig(db: D1Database, language: string): Promise<IConfig | null> {
    const row = await db
        .prepare(`
            SELECT
                c.id,
                c.domain,
                c.currency,
                c.enabled_languages,
                c.default_language,
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

    if (!row) return null;

    if (row.translations) {
        try {
            row.translations = JSON.parse(row.translations as string);
        } catch {
            row.translations = {};
        }
    }

    normalizeLanguages(row);

    return row as IConfig;
}

/** Languages as stored in a config row (enabled_languages is a JSON array in a TEXT column). */
function readLanguages(row: any) {
    const enabled = parseLanguages(row.enabled_languages);
    const defaultLanguage: SupportedLanguage = isSupported(row.default_language)
        ? row.default_language
        : DEFAULT_LANGUAGE;

    return { enabled, default: defaultLanguage };
}

type LanguagePlan = {
    enabled: SupportedLanguage[];
    default: SupportedLanguage;
    previousDefault: SupportedLanguage;
    added: SupportedLanguage[];
    fields: string[];   // e.g. 'enabled_languages = ?'
    values: any[];
};

/** Validates the requested language change. Returns null when it is invalid. */
function planLanguageChange(current: { enabled: SupportedLanguage[]; default: SupportedLanguage }, data: Partial<IConfig>): LanguagePlan | null {
    const nextEnabled = data.enabled_languages !== undefined
        ? Array.from(new Set(data.enabled_languages))
        : current.enabled;
    const nextDefault = data.default_language ?? current.default;

    // at least one language, all known, and the default must be one of the enabled ones
    const valid =
        nextEnabled.length > 0 &&
        nextEnabled.every(isSupported) &&
        isSupported(nextDefault) &&
        nextEnabled.includes(nextDefault);

    if (!valid) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (JSON.stringify(nextEnabled) !== JSON.stringify(current.enabled)) {
        fields.push('enabled_languages = ?');
        values.push(JSON.stringify(nextEnabled));
    }
    if (nextDefault !== current.default) {
        fields.push('default_language = ?');
        values.push(nextDefault);
    }

    return {
        enabled: nextEnabled,
        default: nextDefault,
        previousDefault: current.default,
        added: nextEnabled.filter((l) => !current.enabled.includes(l)),
        fields,
        values,
    };
}

/** Saves config_translation for the given (enabled) languages. Returns true when something was written. */
async function saveConfigTranslations(db: D1Database, configId: number, translations: NonNullable<IConfig['translations']>, languages: SupportedLanguage[]): Promise<boolean> {
    const existing = await db
        .prepare(`SELECT translation_language, site_name, site_description FROM config_translation WHERE config_id = ?`)
        .bind(configId)
        .all();

    const existingMap: Record<string, any> = {};
    for (const row of existing.results || []) {
        existingMap[(row as any).translation_language] = row;
    }

    let changed = false;

    for (const lang of languages) {
        const translationData = translations[lang];
        if (!translationData) continue;

        const siteName = translationData.site_name || '';
        const siteDescription = translationData.site_description || '';
        const row = existingMap[lang];

        if (!siteName && !siteDescription && !row) continue;

        if (row) {
            await db
                .prepare(`UPDATE config_translation SET site_name = ?, site_description = ? WHERE config_id = ? AND translation_language = ?`)
                .bind(siteName || row.site_name || '', siteDescription || row.site_description || '', configId, lang)
                .run();
        } else {
            await db
                .prepare(`INSERT INTO config_translation (config_id, translation_language, site_name, site_description) VALUES (?, ?, ?, ?)`)
                .bind(configId, lang, siteName, siteDescription)
                .run();
        }
        changed = true;
    }

    return changed;
}

export async function updateConfig(data: Partial<IConfig>): Promise<IResult<IConfig>> {
    try {
        const db = getDb();

        const currentConfig = await db
            .prepare(`SELECT * FROM config LIMIT 1`)
            .first();

        if (!currentConfig) return { success: false, error: 'Config not found', code: 'NOT_FOUND' };

        const configId = (currentConfig as any).id;

        // 1) Languages
        const current = readLanguages(currentConfig);
        const touchesLanguages = data.enabled_languages !== undefined || data.default_language !== undefined;
        const plan = touchesLanguages ? planLanguageChange(current, data) : null;

        if (touchesLanguages && !plan) return { success: false, error: 'Invalid languages', code: 'VALIDATION_ERROR' };

        const storeEnabled = plan?.enabled ?? current.enabled;
        const storeDefault = plan?.default ?? current.default;

        // 2) Scalar columns
        const fieldsToUpdate: string[] = [...(plan?.fields ?? [])];
        const values: any[] = [...(plan?.values ?? [])];

        for (const column of CONFIG_COLUMNS) {
            const value = (data as any)[column];
            if (value === undefined) continue;

            const newValue = BOOLEAN_COLUMNS.includes(column) ? (value ? 1 : 0) : value;

            if (newValue !== (currentConfig as any)[column]) {
                fieldsToUpdate.push(`${column} = ?`);
                values.push(newValue);
            }
        }

        // 3) Config columns + copy of translations for added languages, in ONE atomic batch.
        //    Nothing is deleted when a language is disabled.
        const statements: D1PreparedStatement[] = [];

        if (fieldsToUpdate.length > 0) {
            statements.push(db.prepare(`UPDATE config SET ${fieldsToUpdate.join(', ')}`).bind(...values));
        }

        const syncStatements = plan ? buildTranslationSyncStatements(db, plan.added, plan.previousDefault) : [];
        statements.push(...syncStatements);

        if (statements.length > 0) await db.batch(statements);

        // 4) Site name / description (only for enabled languages)
        const translationUpdated = data.translations ? await saveConfigTranslations(db, configId, data.translations, storeEnabled) : false;

        if (fieldsToUpdate.length === 0 && syncStatements.length === 0 && !translationUpdated) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' };

        const updatedConfig = await fetchConfig(db, storeDefault);

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




/**
export async function updateConfig(data: Partial<IConfig>): Promise<IResult<IConfig>> {
    try {
        const db = getDb();

        const currentConfig = await db
            .prepare(`SELECT * FROM config LIMIT 1`)
            .first();

        if (!currentConfig) return { success: false, error: 'Config not found', code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        // Languages: validated and written together.
        // enabled_languages is a JSON array stored in a TEXT column.
        const currentSupported = parseLanguages((currentConfig as any).enabled_languages);
        const currentDefault: SupportedLanguage = isSupported((currentConfig as any).default_language)
            ? (currentConfig as any).default_language
            : DEFAULT_LANGUAGE;
        let storeDefault = currentDefault;

        if (data.enabled_languages !== undefined || data.default_language !== undefined) {
            const nextSupported = data.enabled_languages !== undefined
                ? Array.from(new Set(data.enabled_languages))
                : currentSupported;
            const nextDefault = data.default_language ?? currentDefault;

            // at least one language, all known, and the default must be one of the enabled ones
            const valid =
                nextSupported.length > 0 &&
                nextSupported.every(isSupported) &&
                isSupported(nextDefault) &&
                nextSupported.includes(nextDefault);

            if (!valid) return { success: false, error: 'Invalid languages', code: 'VALIDATION_ERROR' };

            if (JSON.stringify(nextSupported) !== JSON.stringify(currentSupported)) {
                fieldsToUpdate.push('enabled_languages = ?');
                values.push(JSON.stringify(nextSupported));
            }
            if (nextDefault !== currentDefault) {
                fieldsToUpdate.push('default_language = ?');
                values.push(nextDefault);
            }
            storeDefault = nextDefault;
        }

        // enabled_languages and default_language are handled above, so they are not in this map
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
                    c.enabled_languages,
                    c.default_language,
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
            .bind(storeDefault)
            .first();

        if (updatedConfig && updatedConfig.translations) {
            try {
                updatedConfig.translations = JSON.parse(updatedConfig.translations as string);
            } catch (e) {
                updatedConfig.translations = {};
            }
        }

        if (updatedConfig) normalizeLanguages(updatedConfig);

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

*/