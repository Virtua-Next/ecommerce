import { cache } from 'react';
import type { IProductTranslated } from '@/lib/schemas/product';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants'


// list paginated
export async function publicPaginatedProducts(options: { locale?: string; page: number; limit: number; category?: string; brand?: string }): Promise<{ products: IProductTranslated[]; total: number }> {
    try {
        const db = getDb();
        const { locale, page, limit, category, brand } = options;
        const language = locale ?? DEFAULT_LANGUAGE;
        const offset = (page - 1) * limit;

        let countQuery = `
            SELECT COUNT(*) as total
            FROM product p
            LEFT JOIN product_translation pt ON pt.product_id = p.id AND pt.translation_language = ?
            LEFT JOIN category c ON c.id = p.category_id
            LEFT JOIN category_translation ct ON ct.category_id = c.id AND ct.translation_language = ?
            LEFT JOIN brand b ON b.id = p.brand_id
            LEFT JOIN brand_translation bt ON bt.brand_id = b.id AND bt.translation_language = ?
            WHERE p.active = 1`;

        const countParams: any[] = [language, language, language];

        if (category) {
            countQuery += ` AND ct.slug = ?`;
            countParams.push(category);
        }

        if (brand) {
            countQuery += ` AND bt.slug = ?`;
            countParams.push(brand);
        }

        const countResult = await db
            .prepare(countQuery)
            .bind(...countParams)
            .first<{ total: number }>();

        let dataQuery = `
            SELECT
                p.id, p.sku, p.price, p.promotional_price, p.stock,
                p.product_length, p.width, p.height, p.product_weight, p.active,
                p.category_id, p.brand_id,
                COALESCE(pt.slug, pt_default.slug) AS slug,
                COALESCE(pt.title, pt_default.title) AS title,
                COALESCE(pt.product_description, pt_default.product_description) AS product_description,
                COALESCE(pt.specification, pt_default.specification) AS specification,
                COALESCE(ct.title, ct_default.title) AS category_title,
                COALESCE(ct.slug, ct_default.slug) AS category_slug,
                COALESCE(bt.title, bt_default.title) AS brand_title,
                COALESCE(bt.slug, bt_default.slug) AS brand_slug,
                (
                    SELECT json_group_array(
                        json_object(
                            'id', pi.id,
                            'image_path', pi.image_path,
                            'image_order', pi.image_order,
                            'image_primary', pi.image_primary
                        )
                    )
                    FROM product_image pi
                    WHERE pi.product_id = p.id
                    ORDER BY pi.image_primary DESC, pi.image_order ASC
                ) AS images
            FROM product p
            LEFT JOIN product_translation pt ON pt.product_id = p.id AND pt.translation_language = ?
            LEFT JOIN product_translation pt_default ON pt_default.product_id = p.id AND pt_default.translation_language = ?
            LEFT JOIN category c ON c.id = p.category_id
            LEFT JOIN category_translation ct ON ct.category_id = c.id AND ct.translation_language = ?
            LEFT JOIN category_translation ct_default ON ct_default.category_id = c.id AND ct_default.translation_language = ?
            LEFT JOIN brand b ON b.id = p.brand_id
            LEFT JOIN brand_translation bt ON bt.brand_id = b.id AND bt.translation_language = ?
            LEFT JOIN brand_translation bt_default ON bt_default.brand_id = b.id AND bt_default.translation_language = ?
            WHERE p.active = 1`;

        const dataParams: any[] = [
            language, DEFAULT_LANGUAGE,
            language, DEFAULT_LANGUAGE,
            language, DEFAULT_LANGUAGE
        ];

        if (category) {
            dataQuery += ` AND ct.slug = ?`;
            dataParams.push(category);
        }

        if (brand) {
            dataQuery += ` AND bt.slug = ?`;
            dataParams.push(brand);
        }

        dataQuery += ` ORDER BY COALESCE(pt.title, pt_default.title) ASC LIMIT ? OFFSET ?`;
        dataParams.push(limit, offset);

        const { results } = await db
            .prepare(dataQuery)
            .bind(...dataParams)
            .all();

        const products = results.map((row: any) => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : [],
        })) as IProductTranslated[];

        return {
            products,
            total: countResult?.total || 0
        };

    } catch (err) {
        console.error('publicPaginatedProducts database error', err);
        throw err;
    }
}

// by slug
async function getProductBySlug(slug: string, locale?: string): Promise<IProductTranslated | null> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    p.id, p.sku, p.price, p.promotional_price, p.stock,
                    p.product_length, p.width, p.height, p.product_weight, p.active,
                    p.category_id, p.brand_id,
                    COALESCE(pt.slug, pt_default.slug) AS slug,
                    COALESCE(pt.title, pt_default.title) AS title,
                    COALESCE(pt.product_description, pt_default.product_description) AS product_description,
                    COALESCE(pt.specification, pt_default.specification) AS specification,
                    COALESCE(ct.title, ct_default.title) AS category_title,
                    COALESCE(ct.slug, ct_default.slug) AS category_slug,
                    COALESCE(bt.title, bt_default.title) AS brand_title,
                    COALESCE(bt.slug, bt_default.slug) AS brand_slug,
                    (
                        SELECT json_group_array(
                            json_object(
                                'id', pi.id,
                                'image_path', pi.image_path,
                                'image_order', pi.image_order,
                                'image_primary', pi.image_primary
                            )
                        )
                        FROM product_image pi
                        WHERE pi.product_id = p.id
                        ORDER BY pi.image_primary DESC, pi.image_order ASC
                    ) AS images,
                    (
                        SELECT json_group_array(
                            json_object(
                                'translation_language', pt_all.translation_language,
                                'slug', pt_all.slug,
                                'title', pt_all.title
                            )
                        )
                        FROM product_translation pt_all
                        WHERE pt_all.product_id = p.id
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
                FROM product p
                LEFT JOIN product_translation pt ON pt.product_id = p.id AND pt.translation_language = ?
                LEFT JOIN product_translation pt_default ON pt_default.product_id = p.id AND pt_default.translation_language = ?
                LEFT JOIN category c ON c.id = p.category_id
                LEFT JOIN category_translation ct ON ct.category_id = c.id AND ct.translation_language = ?
                LEFT JOIN category_translation ct_default ON ct_default.category_id = c.id AND ct_default.translation_language = ?
                LEFT JOIN brand b ON b.id = p.brand_id
                LEFT JOIN brand_translation bt ON bt.brand_id = b.id AND bt.translation_language = ?
                LEFT JOIN brand_translation bt_default ON bt_default.brand_id = b.id AND bt_default.translation_language = ?
                LEFT JOIN metadata m ON m.target_type = 'product' AND m.target_id = p.id
                LEFT JOIN metadata_translation mt ON mt.metadata_id = m.id AND mt.translation_language = ?
                LEFT JOIN metadata_translation mt_default ON mt_default.metadata_id = m.id AND mt_default.translation_language = ?
                WHERE p.active = 1
                AND COALESCE(pt.slug, pt_default.slug) = ?
                LIMIT 1`)
            .bind(
                language, DEFAULT_LANGUAGE,
                language, DEFAULT_LANGUAGE,
                language, DEFAULT_LANGUAGE,
                language, DEFAULT_LANGUAGE,
                slug
            )
            .all();

        if (!results || results.length === 0) return null;

        const row = results[0];
        return {
            ...row,
            images: row.images ? JSON.parse(row.images as string) : [],
            versions: row.versions ? JSON.parse(row.versions as string) : [],
            metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
        } as IProductTranslated;

    } catch (err) {
        console.error('getProductBySlug database error', err);
        throw err;
    }
}

export const getCachedProductBySlug = cache(getProductBySlug);

// by ids
export async function getProductsByIds(ids: number[], locale?: string): Promise<IProductTranslated[] | null> {
    try {
        if (!ids || ids.length === 0) return null;

        const db = getDb();
        const currentLocale = locale ?? DEFAULT_LANGUAGE;

        const placeholders = ids.map(() => '?').join(',');
        const query = `
        SELECT
            p.id, p.sku, p.price, p.promotional_price, p.stock,
            p.product_length, p.width, p.height, p.product_weight, p.active,
            p.category_id, p.brand_id,
            COALESCE(pt.slug, pt_default.slug) AS slug,
            COALESCE(pt.title, pt_default.title) AS title,
            COALESCE(pt.product_description, pt_default.product_description) AS product_description,
            COALESCE(pt.specification, pt_default.specification) AS specification,
            COALESCE(ct.title, ct_default.title) AS category_title,
            COALESCE(ct.slug, ct_default.slug) AS category_slug,
            COALESCE(bt.title, bt_default.title) AS brand_title,
            COALESCE(bt.slug, bt_default.slug) AS brand_slug,
            (
                SELECT json_group_array(
                    json_object(
                        'id', pi.id,
                        'image_path', pi.image_path,
                        'image_order', pi.image_order,
                        'image_primary', pi.image_primary
                    )
                )
                FROM product_image pi
                WHERE pi.product_id = p.id
                ORDER BY pi.image_primary DESC, pi.image_order ASC
            ) AS images
        FROM product p
        LEFT JOIN product_translation pt ON pt.product_id = p.id AND pt.translation_language = ?
        LEFT JOIN product_translation pt_default ON pt_default.product_id = p.id AND pt_default.translation_language = ?
        LEFT JOIN category c ON c.id = p.category_id
        LEFT JOIN category_translation ct ON ct.category_id = c.id AND ct.translation_language = ?
        LEFT JOIN category_translation ct_default ON ct_default.category_id = c.id AND ct_default.translation_language = ?
        LEFT JOIN brand b ON b.id = p.brand_id
        LEFT JOIN brand_translation bt ON bt.brand_id = b.id AND bt.translation_language = ?
        LEFT JOIN brand_translation bt_default ON bt_default.brand_id = b.id AND bt_default.translation_language = ?
        WHERE p.id IN (${placeholders})
        ORDER BY title ASC`;

        const params = [
            currentLocale,
            DEFAULT_LANGUAGE,
            currentLocale,
            DEFAULT_LANGUAGE,
            currentLocale,
            DEFAULT_LANGUAGE,
            ...ids,
        ];
        const { results } = await db
            .prepare(query)
            .bind(...params)
            .all();

        const products = results.map((row: any) => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : [],
            active: Boolean(row.active),
        })) as IProductTranslated[];

        return products;

    } catch (err) {
        console.error('getProductsByIds database error', err);
        throw err;
    }
}
