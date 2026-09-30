import { cache } from 'react';
import type { IBrandTranslated } from '@/lib/schemas/brand';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


// list all
export async function publicAllBrands(locale?: string): Promise<IBrandTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;
        const { results } = await db
            .prepare(`
                SELECT
                    b.id,
                    b.brand_image,
                    b.active,
                    COALESCE(bt.slug, bt_default.slug) AS slug,
                    COALESCE(bt.title, bt_default.title) AS title,
                    COALESCE(bt.brand_description, bt_default.brand_description) AS brand_description
                FROM brand b
                LEFT JOIN brand_translation bt ON bt.brand_id = b.id AND bt.translation_language = ?
                LEFT JOIN brand_translation bt_default ON bt_default.brand_id = b.id AND bt_default.translation_language = ?
                WHERE b.active = 1
                ORDER BY title ASC`)
            .bind(language, DEFAULT_LANGUAGE)
            .all<IBrandTranslated>();

        return results.map((row) => ({ ...row, active: Boolean(row.active) }));

    } catch (err) {
        console.error('publicBrands database error', locale, err);
        throw err;
    }
}

// by slug
interface RawBrandBySlugRow {
    id: number;
    active: number;
    brand_image: string | null;
    slug: string;
    title: string;
    brand_description: string | null;
    metadata: string | null;   // JSON serialized
    versions: string | null;   // JSON serialized
}
async function getBrandBySlug(slug: string, locale?: string): Promise<RawBrandBySlugRow | null> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    b.id, b.active, b.brand_image,
                    COALESCE(bt.slug, bt_default.slug) AS slug,
                    COALESCE(bt.title, bt_default.title) AS title,
                    COALESCE(bt.brand_description, bt_default.brand_description) AS brand_description,
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
                                'translation_language', bt_all.translation_language,
                                'slug', bt_all.slug,
                                'title', bt_all.title
                            )
                        )
                        FROM brand_translation bt_all
                        WHERE bt_all.brand_id = b.id
                    ) AS versions
                FROM brand b
                LEFT JOIN brand_translation bt ON bt.brand_id = b.id AND bt.translation_language = ?
                LEFT JOIN brand_translation bt_default ON bt_default.brand_id = b.id AND bt_default.translation_language = ?
                LEFT JOIN metadata m ON m.target_type = 'brand' AND m.target_id = b.id
                LEFT JOIN metadata_translation mt ON mt.metadata_id = m.id AND mt.translation_language = ?
                LEFT JOIN metadata_translation mt_default ON mt_default.metadata_id = m.id AND mt_default.translation_language = ?
                WHERE b.active = 1
                AND COALESCE(bt.slug, bt_default.slug) = ?
                LIMIT 1`)
            .bind(
                language, DEFAULT_LANGUAGE,
                language, DEFAULT_LANGUAGE,
                slug
            )
            .all<RawBrandBySlugRow>();

        if (!results || results.length === 0) return null;

        const row = results[0];

        return {
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
            versions: row.versions ? JSON.parse(row.versions as string) : [],
        };

    } catch (err) {
        console.error('getBrandBySlug database error:', slug, locale, err);
        throw err;
    }
}

export const getCachedBrandBySlug = cache(getBrandBySlug);
