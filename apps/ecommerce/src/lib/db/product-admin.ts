import type { IProductTranslated, ICreateProductPayload, IUpdateProductPayload, ILocalizedProductFields, IProductImage, IProduct } from '@/lib/schemas/product';
import type { IResult, SupportedLanguage } from '@/lib/types/generic';
import { upsertTranslation, fetchTranslations } from '@/lib/db/translation';
import { getAdminConfig } from '@/lib/db/config-admin';
import { createMetadata } from '@/lib/db/metadata-admin';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE, ADMIN_PAGINATION_DEFAULT } from '@/lib/constants';
import { stripHtmlToText } from '@/lib/utils';


export interface AdminProductsPagedParams {
    locale?: string;
    page?: number;
    limit?: number;
    search?: string;
}

export interface AdminProductsPagedResult {
    items: IProductTranslated[];
    total: number;
}

// list
export async function adminAllProducts({ locale, page = 1, limit = ADMIN_PAGINATION_DEFAULT, search = '' }: AdminProductsPagedParams = {}): Promise<AdminProductsPagedResult> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;
        const offset = (page - 1) * limit;
        const searchTerm = search.trim();
        const hasSearch = searchTerm.length > 0;
        const searchPattern = hasSearch ? `%${searchTerm}%` : '%';

        const whereClause = hasSearch
            ? `WHERE (
                p.sku LIKE ? OR
                COALESCE(pt.title, pt_default.title) LIKE ? OR
                COALESCE(pt.slug, pt_default.slug) LIKE ? OR
                CAST(p.id AS TEXT) LIKE ?
            )`
            : '';

        // -------- Itens da página --------
        const { results } = await db
            .prepare(`
                SELECT
                    p.id, p.sku, p.cost_price, p.price, p.promotional_price, p.stock,
                    p.product_length, p.width, p.height, p.product_weight, p.active,
                    p.category_id, p.brand_id,
                    COALESCE(pt.slug, pt_default.slug) AS slug,
                    COALESCE(pt.title, pt_default.title) AS title,
                    COALESCE(pt.product_description, pt_default.product_description) AS product_description,
                    COALESCE(pt.specification, pt_default.specification) AS specification,
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
                    ) AS images_json,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', pt_all.translation_language,
                                'slug', pt_all.slug,
                                'title', pt_all.title,
                                'product_description', pt_all.product_description,
                                'specification', pt_all.specification
                            )
                        )
                        FROM product_translation pt_all
                        WHERE pt_all.product_id = p.id
                    ) AS translations_json
                FROM product p
                LEFT JOIN product_translation pt ON pt.product_id = p.id AND pt.translation_language = ?
                LEFT JOIN product_translation pt_default ON pt_default.product_id = p.id AND pt_default.translation_language = ?
                ${whereClause}
                ORDER BY p.active DESC, COALESCE(pt.title, pt_default.title) ASC
                LIMIT ? OFFSET ?`)
            .bind(
                language,
                DEFAULT_LANGUAGE,
                ...(hasSearch ? [searchPattern, searchPattern, searchPattern, searchPattern] : []),
                limit,
                offset)
            .all<{
                id: number;
                sku: string;
                cost_price: number;
                price: number;
                promotional_price: number | null;
                stock: number | null;
                product_length: number | null;
                width: number | null;
                height: number | null;
                product_weight: number | null;
                active: number;
                category_id: number;
                brand_id: number;
                slug: string;
                title: string;
                product_description: string | null;
                specification: string | null;
                images_json: string | null;
                translations_json: string | null;
            }>();

        // -------- Total (para o componente de paginação) --------
        const countRow = await db
            .prepare(`
                SELECT COUNT(*) AS total
                FROM product p
                LEFT JOIN product_translation pt ON pt.product_id = p.id AND pt.translation_language = ?
                LEFT JOIN product_translation pt_default ON pt_default.product_id = p.id AND pt_default.translation_language = ?
                ${whereClause}`)
            .bind(
                language,
                DEFAULT_LANGUAGE,
                ...(hasSearch ? [searchPattern, searchPattern, searchPattern, searchPattern] : []))
            .first<{ total: number }>();

        const items: IProductTranslated[] = results.map((row) => {
            let images: IProductImage[] = [];
            if (row.images_json) {
                try {
                    const imagesArray = JSON.parse(row.images_json);
                    images = imagesArray
                        .filter((img: any) => img.id !== null)
                        .map((img: any) => ({
                            id: img.id,
                            image_path: img.image_path,
                            image_order: img.image_order,
                            image_primary: Boolean(img.image_primary),
                            product_id: row.id,
                        }));
                } catch (e) {
                    console.error('Error parsing images for product:', row.id, e);
                }
            }

            let translations: Record<SupportedLanguage, ILocalizedProductFields> = {} as Record<SupportedLanguage, ILocalizedProductFields>;
            if (row.translations_json) {
                try {
                    const translationsArray = JSON.parse(row.translations_json);
                    translationsArray.forEach((t: any) => {
                        translations[t.language as SupportedLanguage] = {
                            slug: t.slug,
                            title: t.title,
                            product_description: t.product_description,
                            specification: t.specification,
                        };
                    });
                } catch (e) {
                    console.error('Error parsing translations for product:', row.id, e);
                }
            }

            return {
                id: row.id,
                sku: row.sku,
                cost_price: row.cost_price,
                price: row.price,
                promotional_price: row.promotional_price,
                stock: row.stock,
                product_length: row.product_length,
                width: row.width,
                height: row.height,
                product_weight: row.product_weight,
                active: Boolean(row.active),
                category_id: row.category_id,
                brand_id: row.brand_id,
                slug: row.slug,
                title: row.title,
                product_description: row.product_description,
                specification: row.specification,
                translation_language: language,
                images,
                translations,
            };
        });

        return { items, total: countRow?.total ?? 0 };

    } catch (err) {
        console.error('adminAllProducts database error', err);
        throw err;
    }
}

// by ids
export async function getProductTitlesByIds(ids: number[], locale: string = DEFAULT_LANGUAGE): Promise<Map<number, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();

    try {
        const db = getDb();
        const placeholders = unique.map(() => '?').join(',');
        const { results } = await db
            .prepare(
                `SELECT p.id, COALESCE(pt.title, pt_default.title) AS title
                 FROM product p
                 LEFT JOIN product_translation pt ON pt.product_id = p.id AND pt.translation_language = ?
                 LEFT JOIN product_translation pt_default ON pt_default.product_id = p.id AND pt_default.translation_language = ?
                 WHERE p.id IN (${placeholders})`)
            .bind(locale, DEFAULT_LANGUAGE, ...unique)
            .all<{ id: number; title: string | null }>();

        return new Map(
            results.filter((r) => r.title).map((r) => [r.id, r.title as string] as [number, string])
        );
    } catch (err) {
        console.error('getProductTitlesByIds database error', err);
        // Título é cosmético: não pode derrubar o pagamento
        return new Map();
    }
}

// create
export async function createProduct(data: ICreateProductPayload): Promise<IResult<IProductTranslated | AdminProductById>> {
    try {
        const db = getDb();
        const config = await getAdminConfig(DEFAULT_LANGUAGE);
        if (!config) return { success: false, error: 'Configuration not found', code: 'INTERNAL_ERROR' };

        if (Object.keys(data.translations).length === 0) return { success: false, error: 'At least one translation is required', code: 'VALIDATION_ERROR' };

        const result = await db
            .prepare(`INSERT INTO product (sku, cost_price, price, promotional_price, stock, product_length, width, height, product_weight, active, category_id, brand_id)VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(
                data.sku,
                data.cost_price,
                data.price,
                data.promotional_price ?? null,
                data.stock ?? null,
                data.product_length ?? null,
                data.width ?? null,
                data.height ?? null,
                data.product_weight ?? null,
                data.active ? 1 : 0,
                data.category_id,
                data.brand_id
            )
            .run();

        const newId = result.meta.last_row_id;

        for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
            const fields = data.translations[lang];
            if (!fields) continue;

            const root = fields.slug || `item-${Math.random().toString(36).slice(2, 8)}`;
            let finalSlug = root;
            let counter = 1;
            while (await db.prepare(`SELECT 1 FROM product_translation WHERE slug = ? AND translation_language = ?`).bind(finalSlug, lang).first()) {
                finalSlug = `${root}-${counter++}`;
            }

            try {
                await upsertTranslation('product_translation', 'product_id', newId, lang, {
                    title: fields.title,
                    slug: finalSlug,
                    product_description: fields.product_description ?? undefined,
                    specification: fields.specification ?? undefined,
                });
            } catch (e) {
                await db.prepare('DELETE FROM product WHERE id = ?').bind(newId).run();
                return {
                    success: false,
                    error: 'Failed to create product translation',
                    code: 'INTERNAL_ERROR',
                };
            }
        }

        if (data.images && data.images.length > 0) {
            for (const img of data.images) {
                await db
                    .prepare(`INSERT INTO product_image (product_id, image_path, image_order, image_primary) VALUES (?, ?, ?, ?)`)
                    .bind(newId, img.image_path, img.image_order ?? 0, img.image_primary ?? false)
                    .run();
            }
        }

        const availableLangs = Object.keys(data.translations) as Array<SupportedLanguage>;
        let defaultLang = availableLangs[0] || DEFAULT_LANGUAGE;
        if (DEFAULT_LANGUAGE && availableLangs.includes(DEFAULT_LANGUAGE)) {
            defaultLang = DEFAULT_LANGUAGE as SupportedLanguage;
        }

        const siteName = config.site_name;

        const metadataTranslations: Record<string, any> = {};
        for (const lang of availableLangs) {
            const fields = data.translations[lang];
            const title = fields.title;
            const description = fields.product_description || `${siteName} - ${title}`;

            const cleanedDescription = stripHtmlToText(description);

            metadataTranslations[lang] = {
                title,
                metadata_description: cleanedDescription,
                keywords: title,
                og_title: `${siteName} | ${title}`,
                og_description: cleanedDescription,
                x_title: `${siteName} | ${title}`,
                x_description: cleanedDescription,
            };
        }

        const firstImage = data.images?.[0]?.image_path || null;

        const metadataPayload = {
            target_type: 'product' as const,
            target_id: newId,
            robots_directive: 'index, follow',
            og_image: firstImage,
            x_image: firstImage,
            translations: metadataTranslations,
        };

        const metadataResult = await createMetadata(metadataPayload);
        if (!metadataResult.success) {
            // Rollback: (imagens/traduções via CASCADE)
            await db
                .prepare('DELETE FROM product WHERE id = ?')
                .bind(newId)
                .run();

            return {
                success: false,
                error: metadataResult.error || 'Failed to create metadata',
                code: 'INTERNAL_ERROR'
            };
        }

        const product = await adminProductById(newId, DEFAULT_LANGUAGE);
        if (!product) return { success: false, error: 'Failed to get Product', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: product,
            message: 'Product created successfully'
        };

    } catch (err) {
        console.error('createProduct database error:', err);
        throw err;
    }
}

// update
export async function updateProduct(id: number, data: IUpdateProductPayload): Promise<IResult<IProductTranslated | AdminProductById>> {
    try {
        const db = getDb();
        const existingProduct = await db
            .prepare('SELECT * FROM product WHERE id = ?')
            .bind(id)
            .first();

        if (!existingProduct) return { success: false, error: 'Product not found', code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];
        const numericFields: Array<keyof IUpdateProductPayload> = [
            'sku',
            'cost_price',
            'price',
            'promotional_price',
            'stock',
            'product_length',
            'width',
            'height',
            'product_weight',
            'category_id',
            'brand_id',
        ];

        for (const field of numericFields) {
            if (data[field] !== undefined && data[field] !== existingProduct[field]) {
                fieldsToUpdate.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        if (data.active !== undefined && data.active !== Boolean(existingProduct.active)) {
            fieldsToUpdate.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE product SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
                const fields = data.translations[lang];
                if (!fields) continue;

                const root = fields.slug || `item-${Math.random().toString(36).slice(2, 8)}`;
                let finalSlug = root;
                let counter = 1;
                while (await db.prepare(`SELECT 1 FROM product_translation WHERE slug = ? AND translation_language = ?`).bind(finalSlug, lang).first()) {
                    finalSlug = `${root}-${counter++}`;
                }

                try {
                    await upsertTranslation('product_translation', 'product_id', id, lang, {
                        title: fields.title,
                        slug: finalSlug,
                        product_description: fields.product_description ?? undefined,
                        specification: fields.specification ?? undefined,
                    });
                } catch (e) {
                    throw new Error('Failed to translate product', { cause: e });
                }
            }
        }

        if (data.images !== undefined) {
            await db
                .prepare('DELETE FROM product_image WHERE product_id = ?')
                .bind(id)
                .run();

            for (const img of data.images) {
                await db
                    .prepare(`INSERT INTO product_image (product_id, image_path, image_order, image_primary) VALUES (?, ?, ?, ?)`)
                    .bind(id, img.image_path, img.image_order ?? 0, img.image_primary ?? false)
                    .run();
            }
        }

        if (fieldsToUpdate.length === 0 && !data.translations && data.images === undefined) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' };

        const product = await adminProductById(id, DEFAULT_LANGUAGE);
        if (!product) return { success: false, error: 'Failed to get product', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: product,
            message: 'Product updated successfully'
        };

    } catch (err) {
        console.error('updateProduct database error', err);
        throw err;
    }
}

// delete
export async function deleteProduct(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();
        const TARGET_TYPE = 'product';

        const product = await db
            .prepare('SELECT id FROM product WHERE id = ?')
            .bind(id)
            .first();

        if (!product) return { success: false, error: 'Product not found', code: 'NOT_FOUND' };

        const stmtMetadata = db
            .prepare('DELETE FROM metadata WHERE target_type = ? AND target_id = ?')
            .bind(TARGET_TYPE, id);

        const stmtProduct = db
            .prepare('DELETE FROM product WHERE id = ?')
            .bind(id);

        const [, productResult] = await db.batch([stmtMetadata, stmtProduct]);

        if (productResult.meta.changes === 0) return { success: false, error: 'Product not found', code: 'NOT_FOUND' };

        return {
            success: true,
            message: 'Product and associated metadata deleted successfully'
        };

    } catch (err) {
        console.error('deleteProduct database error', err);
        throw err;
    }
}

// by id
type AdminProductById = Omit<IProduct, 'images'> & ILocalizedProductFields & {
    category_title: string | null;
    brand_title: string | null;
    translations: Record<string, ILocalizedProductFields>;
    images: IProductImage[];
};
async function adminProductById(id: number, locale?: string): Promise<AdminProductById | null> {
    try {
        const db = getDb();
        const currentLocale = locale ?? DEFAULT_LANGUAGE;

        const product = await db
            .prepare(`SELECT * FROM product WHERE id = ?`)
            .bind(id)
            .first<IProduct>();

        if (!product) return null;

        const translationsByLanguage = await fetchTranslations('product_translation', 'product_id', id);

        const images = await db
            .prepare(`SELECT id, image_path, image_order, image_primary FROM product_image WHERE product_id = ? ORDER BY CASE WHEN image_primary = 1 THEN 0 ELSE 1 END, image_order ASC`)
            .bind(id)
            .all<IProductImage>();

        const categoryTitle = await db
            .prepare(`SELECT title FROM category_translation WHERE category_id = ? AND translation_language = ? LIMIT 1`)
            .bind(product.category_id, currentLocale)
            .first<{ title: string }>();

        const brandTitle = await db
            .prepare(`SELECT title FROM brand_translation WHERE brand_id = ? AND translation_language = ? LIMIT 1`)
            .bind(product.brand_id, currentLocale)
            .first<{ title: string }>();

        const translations: Record<string, ILocalizedProductFields> = {};
        for (const [lang, row] of Object.entries(translationsByLanguage)) {
            translations[lang] = {
                title: row.title ?? '',
                slug: row.slug ?? '',
                product_description: row.product_description ?? '',
                specification: row.specification ?? '',
            };
        }

        const currentTranslation = translations[currentLocale] || translations[DEFAULT_LANGUAGE] || { title: '', slug: '', product_description: '', specification: '' };

        return {
            id: product.id,
            sku: product.sku,
            cost_price: product.cost_price,
            price: product.price,
            promotional_price: product.promotional_price,
            stock: product.stock,
            product_length: product.product_length,
            width: product.width,
            height: product.height,
            product_weight: product.product_weight,
            active: Boolean(product.active),
            category_id: product.category_id,
            brand_id: product.brand_id,
            title: currentTranslation.title,
            slug: currentTranslation.slug,
            product_description: currentTranslation.product_description,
            specification: currentTranslation.specification,
            category_title: categoryTitle?.title ?? null,
            brand_title: brandTitle?.title ?? null,
            translations,
            images: images.results,
        };

    } catch (err) {
        console.error('adminProductById database error', err);
        throw err;
    }
}
