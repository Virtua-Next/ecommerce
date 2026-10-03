// e.g. src/i18n/languages.ts
// Pure helpers (no DB, no Node APIs), so they can be imported from the middleware.
// Remove the copies of isSupported / parseLanguages / normalizeLanguages from the DB file and import them from here.
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';

export function isSupported(l: unknown): l is SupportedLanguage {
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(l as string);
}

/** Accepts a JSON string ('["pt-BR","en-US"]') or an array. Falls back to [DEFAULT_LANGUAGE]. */
export function parseLanguages(raw: unknown): SupportedLanguage[] {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
            const valid = parsed.filter(isSupported);
            if (valid.length > 0) return valid;
        }
    } catch {
        // invalid JSON: fall through to the fallback
    }
    return [DEFAULT_LANGUAGE];
}

/** Parses enabled_languages and guarantees default_language is one of them. */
export function normalizeLanguages(row: Record<string, any>) {
    const enabled = parseLanguages(row.enabled_languages);
    const def: SupportedLanguage = isSupported(row.default_language) ? row.default_language : DEFAULT_LANGUAGE;

    row.enabled_languages = enabled.includes(def) ? enabled : [...enabled, def];
    row.default_language = def;
}