import { getDb } from "@/lib/cloudflare/context";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { MetadataTargetType } from "@/lib/types/generic";


const TRANSLATION_TABLE_MAP: Record<MetadataTargetType, { table: string; foreignKey: string }> = {
    config: { table: 'config', foreignKey: 'config_id' },
    product: { table: 'product_translation', foreignKey: 'product_id' },
    category: { table: 'category_translation', foreignKey: 'category_id' },
    brand: { table: 'brand_translation', foreignKey: 'brand_id' },
    page: { table: 'page_translation', foreignKey: 'page_id' },
};

export async function translateSlug(entityType: MetadataTargetType, slug: string, fromLocale: string, toLocale: string): Promise<string | null> {
    try {
        const db = getDb();
        const { table, foreignKey } = TRANSLATION_TABLE_MAP[entityType];
        const result = await db
            .prepare(`
                SELECT target.slug
                FROM ${table} AS source
                JOIN ${table} AS target
                    ON target.${foreignKey} = source.${foreignKey}
                    AND target.translation_language = ?
                WHERE source.translation_language = ?
                  AND source.slug = ?`)
            .bind(toLocale, fromLocale, slug)
            .first<{ slug: string }>();

        if (result?.slug) return result.slug;

        if (toLocale === DEFAULT_LANGUAGE) return null;

        const fallback = await db
            .prepare(`
                SELECT target.slug
                FROM ${table} AS source
                JOIN ${table} AS target
                    ON target.${foreignKey} = source.${foreignKey}
                    AND target.translation_language = ?
                WHERE source.translation_language = ?
                  AND source.slug = ?`)
            .bind(DEFAULT_LANGUAGE, fromLocale, slug)
            .first<{ slug: string }>();

        return fallback?.slug ?? null;

    } catch (err) {
        console.error('getCachedTranslateSlug database error', err);
        throw err;
    }
}

export async function upsertTranslation(translationTable: string, foreignKeyColumn: string, entityId: number, language: string, fields: Record<string, string | null | undefined>): Promise<void> {
    try {
        const db = getDb();
        const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
        if (entries.length === 0) return;

        const existing = await db
            .prepare(`SELECT id FROM ${translationTable} WHERE ${foreignKeyColumn} = ? AND translation_language = ?`)
            .bind(entityId, language)
            .first<{ id: number }>();

        if (existing) {
            const setClauses = entries.map(([field]) => `${field} = ?`).join(', ');
            await db
                .prepare(`UPDATE ${translationTable} SET ${setClauses} WHERE id = ?`)
                .bind(...entries.map(([, v]) => v), existing.id)
                .run();
        } else {
            const columns = [foreignKeyColumn, 'translation_language', ...entries.map(([f]) => f)];
            const placeholders = columns.map(() => '?').join(', ');
            await db
                .prepare(`INSERT INTO ${translationTable} (${columns.join(', ')}) VALUES (${placeholders})`)
                .bind(entityId, language, ...entries.map(([, v]) => v))
                .run();
        }
    } catch (err) {
        console.log('upsertTranslation database error', err);
        throw err;
    }
}

export async function fetchTranslations(translationTable: string, foreignKeyColumn: string, entityId: number): Promise<Record<string, { title: string; slug: string;[key: string]: any }>> {
    try {
        const db = getDb();
        const { results } = await db
            .prepare(`SELECT * FROM ${translationTable} WHERE ${foreignKeyColumn} = ?`)
            .bind(entityId)
            .all();

        const byLanguage: Record<string, any> = {};
        for (const row of results as any[]) {
            byLanguage[row.translation_language] = row;
        }
        return byLanguage;
    } catch (err) {
        console.error('fetchTranslations database error', translationTable, foreignKeyColumn, entityId, err);
        throw err;
    }
}
