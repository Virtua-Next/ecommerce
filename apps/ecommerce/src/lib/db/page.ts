import { cache } from 'react';
import { DEFAULT_LANGUAGE } from '@/lib/constants';
import { getDb } from '@/lib/cloudflare/context';
import { IPageTranslated } from '@/lib/schemas/page';
import { RobotsDirective, IEntityMetadata } from '@/lib/schemas/metadata';


function parseRobotsDirective(raw: unknown): RobotsDirective | null {
    if (!raw || typeof raw !== 'string') return null;
    try {
        return JSON.parse(raw) as RobotsDirective;
    } catch {
        return null;
    }
}

async function getPageBySlug(slug: string, locale?: string): Promise<IPageTranslated | null> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    p.id, p.page_image, p.page_order, p.active,
                    COALESCE(pt.slug, pt_default.slug) AS slug,
                    COALESCE(pt.title, pt_default.title) AS title,
                    COALESCE(pt.page_description, pt_default.page_description) AS page_description,
                    COALESCE(pt.content, pt_default.content) AS content,
                    (
                        SELECT json_group_array(
                            json_object(
                                'translation_language', pt_all.translation_language,
                                'slug', pt_all.slug,
                                'title', pt_all.title
                            )
                        )
                        FROM page_translation pt_all
                        WHERE pt_all.page_id = p.id
                    ) AS versions,
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
                    ) AS metadata
                FROM tb_page p
                LEFT JOIN page_translation pt ON pt.page_id = p.id AND pt.translation_language = ?
                LEFT JOIN page_translation pt_default ON pt_default.page_id = p.id AND pt_default.translation_language = ?
                LEFT JOIN metadata m ON m.target_type = 'page' AND m.target_id = p.id
                LEFT JOIN metadata_translation mt ON mt.metadata_id = m.id AND mt.translation_language = ?
                LEFT JOIN metadata_translation mt_default ON mt_default.metadata_id = m.id AND mt_default.translation_language = ?
                WHERE p.active = 1
                AND COALESCE(pt.slug, pt_default.slug) = ?
                LIMIT 1`)
            .bind(
                language, DEFAULT_LANGUAGE,
                language, DEFAULT_LANGUAGE,
                slug
            )
            .all();

        if (!results || results.length === 0) return null;

        const row = results[0] as any;
        const metadata = row.metadata
            ? {
                ...JSON.parse(row.metadata as string),
                robots_directive: parseRobotsDirective(JSON.parse(row.metadata as string).robots_directive),
            } as IEntityMetadata
            : undefined;

        return {
            id: row.id,
            page_image: row.page_image,
            page_order: row.page_order,
            active: row.active,
            slug: row.slug,
            title: row.title,
            page_description: row.page_description,
            content: row.content,
            translation_language: language,
            versions: row.versions ? JSON.parse(row.versions as string) : [],
            metadata,
        } as IPageTranslated;

    } catch (err) {
        console.error('getPageBySlug database error', err);
        throw err;
    }
}

export const getCachedPageBySlug = cache(getPageBySlug);
