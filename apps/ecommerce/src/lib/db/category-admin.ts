import type { ICategoryTranslated, IUpdateCategoryPayload, ICreateCategoryPayload, ILocalizedCategoryFields } from '@/lib/schemas/category';
import { DEFAULT_CATEGORY_IDS, DEFAULT_LANGUAGE } from '@/lib/constants';
import type { IResult, SupportedLanguage } from '@/lib/types/generic';
import { upsertTranslation } from '@/lib/db/translation';
import { getAdminConfig } from '@/lib/db/config-admin';
import { createMetadata } from '@/lib/db/metadata-admin';
import { getDb } from '@/lib/cloudflare/context';
import { stripHtmlToText } from '@/lib/utils';


// list
export async function adminAllCategories(locale?: string): Promise<ICategoryTranslated[]> {
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
                    COALESCE(ct.category_description, ct_default.category_description) AS category_description,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', ct_all.translation_language,
                                'slug', ct_all.slug,
                                'title', ct_all.title,
                                'category_description', ct_all.category_description
                            )
                        )
                        FROM category_translation ct_all
                        WHERE ct_all.category_id = c.id
                    ) AS translations_json
                FROM category c
                LEFT JOIN category_translation ct ON ct.category_id = c.id AND ct.translation_language = ?
                LEFT JOIN category_translation ct_default ON ct_default.category_id = c.id AND ct_default.translation_language = ?
                ORDER BY c.active DESC, COALESCE(ct.title, ct_default.title) ASC`)
            .bind(language, DEFAULT_LANGUAGE)
            .all<{
                id: number;
                category_image: string;
                active: number;
                slug: string;
                title: string;
                category_description: string | null;
                translations_json: string | null;
            }>();

        return results.map((row) => {
            let translations: Record<SupportedLanguage, ILocalizedCategoryFields> = {} as Record<SupportedLanguage, ILocalizedCategoryFields>;

            if (row.translations_json) {
                try {
                    const translationsArray = JSON.parse(row.translations_json) as Array<{ language: SupportedLanguage; slug: string; title: string, category_description: string }>;

                    for (const t of translationsArray) {
                        translations[t.language] = {
                            slug: t.slug,
                            title: t.title,
                            category_description: t.category_description
                        };
                    }
                } catch (err) {
                    console.error(`Category id=${row.id} has invalid translations_json:`, err);
                }
            }

            return {
                id: row.id,
                category_image: row.category_image,
                active: Boolean(row.active),
                slug: row.slug,
                title: row.title,
                category_description: row.category_description,
                translation_language: language,
                translations: translations
            };
        });

    } catch (err) {
        console.error('adminAllCategories database error: ', { language: locale, error: err });
        throw err;
    }
}

// create
export async function createCategory(data: ICreateCategoryPayload): Promise<IResult<ICategoryTranslated[]>> {
    try {
        const db = getDb();
        const config = await getAdminConfig(DEFAULT_LANGUAGE);
        if (!config) return { success: false, error: 'Configuration not found', code: 'INTERNAL_ERROR' };

        const availableLanguages = Object.keys(data.translations) as Array<SupportedLanguage>;

        const result = await db
            .prepare(`INSERT INTO category (category_image, active) VALUES (?, ?)`)
            .bind(data.category_image ?? null, data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        for (const lang of availableLanguages) {
            const fields = { ...data.translations[lang] };

            let finalSlug = fields.slug;
            let counter = 1;
            while (true) {
                const slugExists = await db
                    .prepare(`SELECT 1 FROM category_translation WHERE slug = ? AND translation_language = ?`)
                    .bind(finalSlug, lang)
                    .first();
                if (!slugExists) break;
                finalSlug = `${fields.slug}-${counter}`;
                counter++;
            }

            try {
                await upsertTranslation('category_translation', 'category_id', newId, lang, {
                    title: fields.title,
                    category_description: fields.category_description ?? undefined,
                    slug: finalSlug,
                });
            } catch (e) {
                await db.prepare('DELETE FROM category WHERE id = ?').bind(newId).run();
                return {
                    success: false,
                    error: 'Failed to create category translation',
                    code: 'INTERNAL_ERROR',
                };
            }
        }

        const siteName = config.site_name;

        const metadataTranslations = {} as Record<SupportedLanguage, {
            title: string;
            metadata_description: string;
            keywords: string;
            og_title: string;
            og_description: string;
            x_title: string;
            x_description: string;
        }>;

        for (const lang of availableLanguages) {
            const fields = data.translations[lang];
            const title = fields.title;
            const description = fields.category_description || `${siteName} - ${title}`;

            const cleanedDescription = stripHtmlToText(description);

            metadataTranslations[lang] = {
                title,
                metadata_description: cleanedDescription,
                keywords: title,
                og_title: `${siteName} - ${title}`,
                og_description: cleanedDescription,
                x_title: `${siteName} - ${title}`,
                x_description: cleanedDescription,
            };
        }

        const metadataPayload = {
            target_type: 'category' as const,
            target_id: newId,
            robots_directive: 'index, follow',
            og_image: data.category_image || null,
            x_image: data.category_image || null,
            translations: metadataTranslations,
        };

        const metadataResult = await createMetadata(metadataPayload);

        if (!metadataResult.success) {
            await db
                .prepare('DELETE FROM category WHERE id = ?')
                .bind(newId)
                .run();

            return {
                success: false,
                error: metadataResult.error || 'Failed to create metadata',
                code: metadataResult.code || 'INTERNAL_ERROR',
            };
        }

        const { results } = await db
            .prepare(`
                SELECT c.id, c.category_image, c.active, ct.title, ct.category_description, ct.slug, ct.translation_language
                FROM category c
                JOIN category_translation ct ON ct.category_id = c.id
                WHERE c.id = ?`)
            .bind(newId)
            .all<ICategoryTranslated>();

        return {
            success: true,
            data: results as ICategoryTranslated[],
            message: 'Category created successfully'
        };

    } catch (err) {
        console.error('createCategory database error', err);
        throw err;
    }
}

// update
export async function updateCategory(id: number, data: IUpdateCategoryPayload): Promise<IResult<ICategoryTranslated[]>> {
    try {
        const db = getDb();
        const existingCategory = await db
            .prepare('SELECT * FROM category WHERE id = ?')
            .bind(id)
            .first();

        if (!existingCategory) return { success: false, error: 'Category not found', code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        if (data.category_image !== undefined && data.category_image !== existingCategory.category_image) {
            fieldsToUpdate.push('category_image = ?');
            values.push(data.category_image);
        }
        if (data.active !== undefined && data.active !== Boolean(existingCategory.active)) {
            fieldsToUpdate.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE category SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
                const fields = { ...data.translations[lang] };
                if (!fields) continue;

                if (fields.slug !== undefined) {
                    let finalSlug = fields.slug;
                    let counter = 1;
                    while (true) {
                        const slugExists = await db
                            .prepare(` SELECT 1 FROM category_translation WHERE slug = ? AND translation_language = ? AND category_id != ?`)
                            .bind(finalSlug, lang, id)
                            .first();

                        if (!slugExists) break;
                        finalSlug = `${fields.slug}-${counter}`;
                        counter++;
                    }
                    fields.slug = finalSlug;
                }

                try {
                    await upsertTranslation('category_translation', 'category_id', id, lang, {
                        title: fields.title,
                        category_description: fields.category_description ?? undefined,
                        slug: fields.slug,
                    });
                } catch (e) {
                    throw new Error('Failed to translate category', { cause: e });
                }
            }
        }

        if (fieldsToUpdate.length === 0 && !data.translations) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' };

        const { results } = await db
            .prepare(`
                SELECT c.id, c.category_image, c.active, ct.title, ct.category_description, ct.slug, ct.translation_language
                FROM category c
                JOIN category_translation ct ON ct.category_id = c.id
                WHERE c.id = ?`)
            .bind(id)
            .all<ICategoryTranslated>();

        return {
            success: true,
            data: results as ICategoryTranslated[],
            message: 'Category updated successfully'
        };

    } catch (err) {
        console.error('updateCategory database error', err);
        throw err;
    }
}

// delete
export async function deleteCategory(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();
        const TARGET_TYPE = 'category';

        const protectedCategories: number[] = [DEFAULT_CATEGORY_IDS.DEFAULT];
        if (protectedCategories.includes(id)) return { success: false, error: 'Default category cannot be deleted', code: 'VALIDATION_ERROR' };

        const productInUse = await db
            .prepare('SELECT 1 FROM product WHERE category_id = ? LIMIT 1')
            .bind(id)
            .first();

        if (productInUse) return { success: false, error: 'Category cannot be deleted because it is being used by products', code: 'VALIDATION_ERROR' };

        const stmtMetadata = db
            .prepare('DELETE FROM metadata WHERE target_type = ? AND target_id = ?')
            .bind(TARGET_TYPE, id);

        const stmtCategory = db
            .prepare('DELETE FROM category WHERE id = ?')
            .bind(id);

        const [, categoryResult] = await db
            .batch([stmtMetadata, stmtCategory]);

        if (categoryResult.meta.changes === 0) return { success: false, error: 'Category not found', code: 'NOT_FOUND' };

        return {
            success: true,
            message: 'Category and associated metadata deleted successfully'
        };

    } catch (err) {
        console.error('deleteCategory database error', err);
        throw err;
    }
}
