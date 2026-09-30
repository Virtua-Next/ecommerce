import { cache } from 'react';
import type { ICategoryTranslated } from '@/lib/schemas/category';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


// list
export async function publicAllCategories(locale?: string): Promise<ICategoryTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    c.id,
                    c.category_image,
                    c.active,
                    COALESCE(ct.slug, ct_default.slug) AS slug,
                    COALESCE(ct.title, ct_default.title) AS title,
                    COALESCE(ct.category_description, ct_default.category_description) AS category_description
                FROM category c
                LEFT JOIN category_translation ct ON ct.category_id = c.id AND ct.translation_language = ?
                LEFT JOIN category_translation ct_default ON ct_default.category_id = c.id AND ct_default.translation_language = ?
                WHERE c.active = 1
                ORDER BY title ASC`)
            .bind(language, DEFAULT_LANGUAGE)
            .all<ICategoryTranslated>();

        return results.map((row) => ({ ...row, active: Boolean(row.active) }));

    } catch (err) {
        console.error('publicAllCategories database error', locale, err);
        throw err;
    }
}

// by slug
interface RawCategoryBySlugRow {
    id: number;
    active: number;
    category_image: string | null;
    slug: string;
    title: string;
    category_description: string | null;
    metadata: string | null;   // JSON serialized
    versions: string | null;   // JSON serialized
}
async function getCategoryBySlug(slug: string, locale?: string): Promise<RawCategoryBySlugRow | null> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    c.id, c.active, c.category_image,
                    COALESCE(ct.slug, ct_default.slug) AS slug,
                    COALESCE(ct.title, ct_default.title) AS title,
                    COALESCE(ct.category_description, ct_default.category_description) AS category_description,
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
                    ) AS metadata,
                    (
                        SELECT json_group_array(
                            json_object(
                                'translation_language', ct_all.translation_language,
                                'slug', ct_all.slug,
                                'title', ct_all.title
                            )
                        )
                        FROM category_translation ct_all
                        WHERE ct_all.category_id = c.id
                    ) AS versions
                FROM category c
                LEFT JOIN category_translation ct ON ct.category_id = c.id AND ct.translation_language = ?
                LEFT JOIN category_translation ct_default ON ct_default.category_id = c.id AND ct_default.translation_language = ?
                LEFT JOIN metadata m ON m.target_type = 'category' AND m.target_id = c.id
                LEFT JOIN metadata_translation mt ON mt.metadata_id = m.id AND mt.translation_language = ?
                LEFT JOIN metadata_translation mt_default ON mt_default.metadata_id = m.id AND mt_default.translation_language = ?
                WHERE c.active = 1
                AND COALESCE(ct.slug, ct_default.slug) = ?
                LIMIT 1`)
            .bind(
                language, DEFAULT_LANGUAGE,
                language, DEFAULT_LANGUAGE,
                slug
            )
            .all<RawCategoryBySlugRow>();

        if (!results || results.length === 0) return null;

        const row = results[0];

        return {
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
            versions: row.versions ? JSON.parse(row.versions as string) : [],
        };

    } catch (err) {
        console.error('getCategoryBySlug database error', err);
        throw err;
    }
}

export const getCachedCategoryBySlug = cache(getCategoryBySlug);
