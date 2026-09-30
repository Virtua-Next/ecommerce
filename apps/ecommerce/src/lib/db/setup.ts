import { getDb } from "@/lib/cloudflare/context";
import { hashPassword } from "@/lib/cryptography";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic'


interface SetupResult {
    success: boolean;
    configId?: number;
    userId?: number;
    error?: string;
    message?: string;
}

export async function isSystemSetup(): Promise<boolean> {
    try {
        const db = getDb();
        const admin = await db.prepare('SELECT 1 FROM user WHERE profile_id = 1 LIMIT 1').first();

        return !!admin;

    } catch (err) {
        console.error('isSystemSetup database error', err);
        throw err;
    }
}

interface ConfigTranslationInput {
    site_name?: string;
    site_description?: string | null;
}

interface CreateSystemSetupInput {
    domain: string;
    currency: typeof SUPPORTED_CURRENCIES[number];
    translations?: Partial<Record<SupportedLanguage, ConfigTranslationInput>>;
    user_name: string;
    email: string;
    user_password: string;
}
export async function createSystemSetup(config: CreateSystemSetupInput): Promise<SetupResult> {
    const db = getDb();

    if (await isSystemSetup()) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: 'System already configured',
        };
    }

    // --- domain ---
    if (!config.domain || typeof config.domain !== 'string' || !config.domain.trim()) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: 'Domain is required',
        };
    }

    // --- currency ---
    if (!config.currency || !SUPPORTED_CURRENCIES.includes(config.currency)) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: `A currency is required. Supported values: ${SUPPORTED_CURRENCIES.join(', ')}`,
        };
    }

    // --- site name (default language) ---
    const requiredLanguages = SUPPORTED_LANGUAGES as readonly SupportedLanguage[];
    const defaultSiteName = config.translations?.[DEFAULT_LANGUAGE]?.site_name;
    if (!defaultSiteName || typeof defaultSiteName !== 'string' || !defaultSiteName.trim()) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: `Site name for ${DEFAULT_LANGUAGE} is required`,
        };
    }

    // --- admin user fields ---
    if (!config.user_name || typeof config.user_name !== 'string' || !config.user_name.trim()) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: 'Admin name is required',
        };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!config.email || typeof config.email !== 'string' || !emailRegex.test(config.email.trim())) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: 'A valid admin email is required',
        };
    }

    if (!config.user_password || typeof config.user_password !== 'string' || config.user_password.length < 8) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: 'Password must be at least 8 characters',
        };
    }

    const existingConfig = await db.prepare('SELECT id FROM config LIMIT 1').first();
    if (!existingConfig) {
        return {
            success: false,
            configId: undefined,
            userId: undefined,
            error: 'Config row not found — provisioning may have failed',
        };
    }
    const configId = existingConfig.id as number;

    try {
        const normalizedDomain = config.domain
            .replace(/^(https?:\/\/)?(www\.)?/i, '')
            .replace(/\/.*$/, '')
            .toLowerCase();

        const hashedPassword = await hashPassword(config.user_password);

        await db
            .prepare(`UPDATE config SET domain = ?, currency = ? WHERE id = ?`)
            .bind(normalizedDomain, config.currency, configId)
            .run();

        const translationStatements = requiredLanguages.map((lang) => {
            const translation = config.translations?.[lang];
            const siteName = translation?.site_name?.trim() || defaultSiteName;
            const siteDescription = translation?.site_description ?? config.translations?.[DEFAULT_LANGUAGE]?.site_description ?? null;

            return db
                .prepare(`INSERT INTO config_translation (config_id, translation_language, site_name, site_description) VALUES (?, ?, ?, ?)`)
                .bind(configId, lang, siteName, siteDescription);
        });

        const userStatement = db
            .prepare(`INSERT INTO user (uuid, user_name, email, user_password, profile_id, active) VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(crypto.randomUUID(), config.user_name.trim(), config.email.trim().toLowerCase(), hashedPassword, 1, 1);

        const results = await db.batch([...translationStatements, userStatement]);

        const userResult = results[results.length - 1];

        return {
            success: true,
            configId,
            userId: userResult.meta.last_row_id,
            message: 'Setup created successfully',
        };

    } catch (err) {
        console.error('createSystemSetup database error:', err);
        throw err;
    }
}
