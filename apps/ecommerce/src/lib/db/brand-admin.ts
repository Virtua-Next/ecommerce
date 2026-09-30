import type { IBrandTranslated, IUpdateBrandPayload, ICreateBrandPayload, ILocalizedBrandFields } from '@/lib/schemas/brand';
import { DEFAULT_BRAND_IDS, DEFAULT_LANGUAGE } from '@/lib/constants';
import type { IResult } from '@/lib/types/generic';
import { upsertTranslation } from '@/lib/db/translation';
import { getAdminConfig } from '@/lib/db/config-admin';
import { createMetadata } from '@/lib/db/metadata-admin';
import { getDb } from '@/lib/cloudflare/context';
import { SupportedLanguage } from '@/lib/types/generic';
import { stripHtmlToText } from '@/lib/utils';


// list
export async function adminAllBrands(locale?: string): Promise<IBrandTranslated[]> {
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
                    COALESCE(bt.brand_description, bt_default.brand_description) AS brand_description,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', bt_all.translation_language,
                                'slug', bt_all.slug,
                                'title', bt_all.title,
                                'brand_description', bt_all.brand_description
                            )
                        )
                        FROM brand_translation bt_all
                        WHERE bt_all.brand_id = b.id
                    ) AS translations_json
                FROM brand b
                LEFT JOIN brand_translation bt ON bt.brand_id = b.id AND bt.translation_language = ?
                LEFT JOIN brand_translation bt_default ON bt_default.brand_id = b.id AND bt_default.translation_language = ?
                ORDER BY b.active DESC, COALESCE(bt.title, bt_default.title) ASC
            `)
            .bind(language, DEFAULT_LANGUAGE)
            .all<{
                id: number;
                brand_image: string;
                active: number;
                slug: string;
                title: string;
                brand_description: string | null;
                translations_json: string | null;
            }>();

        return results.map((row) => {
            let translations: Record<SupportedLanguage, ILocalizedBrandFields> = {} as Record<SupportedLanguage, ILocalizedBrandFields>;

            if (row.translations_json) {
                try {
                    const translationsArray = JSON.parse(row.translations_json);
                    translationsArray.forEach((t: any) => {
                        translations[t.language as SupportedLanguage] = {
                            slug: t.slug,
                            title: t.title,
                            brand_description: t.brand_description
                        };
                    });
                } catch (err) {
                    console.error('Error parsing translations for brand:', row.id, err);
                }
            }

            return {
                id: row.id,
                brand_image: row.brand_image,
                active: Boolean(row.active),
                slug: row.slug,
                title: row.title,
                brand_description: row.brand_description,
                translation_language: language,
                translations: translations
            };
        });

    } catch (err) {
        console.error('adminAllBrands database error', locale, err);
        throw err;
    }
}

// create
export async function createBrand(data: ICreateBrandPayload): Promise<IResult<IBrandTranslated[]>> {
    try {
        const db = getDb();
        const config = await getAdminConfig(DEFAULT_LANGUAGE);
        if (!config) return { success: false, error: 'Configuration not found', code: 'INTERNAL_ERROR' };

        const availableLanguages = Object.keys(data.translations) as Array<SupportedLanguage>;

        const result = await db
            .prepare(`INSERT INTO brand (brand_image, active) VALUES (?, ?)`)
            .bind(data.brand_image ?? null, data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        for (const lang of availableLanguages) {
            const fields = { ...data.translations[lang] };

            let finalSlug = fields.slug;
            let counter = 1;
            while (true) {
                const slugExists = await db
                    .prepare(`SELECT 1 FROM brand_translation WHERE slug = ? AND translation_language = ?`)
                    .bind(finalSlug, lang)
                    .first();
                if (!slugExists) break;
                finalSlug = `${fields.slug}-${counter}`;
                counter++;
            }
            try {
                await upsertTranslation('brand_translation', 'brand_id', newId, lang, {
                    title: fields.title,
                    brand_description: fields.brand_description ?? undefined,
                    slug: finalSlug,
                });
            } catch (e) {
                await db.prepare('DELETE FROM brand WHERE id = ?').bind(newId).run();
                return {
                    success: false,
                    error: 'Failed to create brand translation',
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
            const description = fields.brand_description || `${siteName} - ${title}`;

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
            target_type: 'brand' as const,
            target_id: newId,
            robots_directive: 'index, follow',
            og_image: data.brand_image || null,
            x_image: data.brand_image || null,
            translations: metadataTranslations,
        };

        const metadataResult = await createMetadata(metadataPayload);
        if (!metadataResult.success) {
            await db
                .prepare('DELETE FROM brand WHERE id = ?')
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
                SELECT b.id, b.brand_image, b.active, bt.title, bt.brand_description, bt.slug, bt.translation_language
                FROM brand b
                JOIN brand_translation bt ON bt.brand_id = b.id
                WHERE b.id = ?`)
            .bind(newId)
            .all<IBrandTranslated>();

        return {
            success: true,
            data: results as IBrandTranslated[],
            message: 'Brand created successfully'
        };

    } catch (err) {
        console.error('createBrand database error', data, err);
        throw err;
    }
}

// update
export async function updateBrand(id: number, data: IUpdateBrandPayload): Promise<IResult<IBrandTranslated[]>> {
    try {
        const db = getDb();
        const existingBrand = await db
            .prepare('SELECT * FROM brand WHERE id = ?')
            .bind(id)
            .first();

        if (!existingBrand) { return { success: false, error: 'Brand not found', code: 'NOT_FOUND' } }

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        if (data.brand_image !== undefined && data.brand_image !== existingBrand.brand_image) {
            fieldsToUpdate.push('brand_image = ?');
            values.push(data.brand_image);
        }
        if (data.active !== undefined && data.active !== Boolean(existingBrand.active)) {
            fieldsToUpdate.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE brand SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
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
                            .prepare(` SELECT 1 FROM brand_translation WHERE slug = ? AND translation_language = ? AND brand_id != ?`)
                            .bind(finalSlug, lang, id)
                            .first();

                        if (!slugExists) break;
                        finalSlug = `${fields.slug}-${counter}`;
                        counter++;
                    }
                    fields.slug = finalSlug;
                }

                try {
                    await upsertTranslation('brand_translation', 'brand_id', id, lang, {
                        title: fields.title,
                        brand_description: fields.brand_description ?? undefined,
                        slug: fields.slug,
                    });
                } catch (e) {
                    throw new Error('Failed to translate brand', { cause: e });
                }
            }
        }

        if (fieldsToUpdate.length === 0 && !data.translations) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' };

        const { results } = await db
            .prepare(`
                SELECT b.id, b.brand_image, b.active, bt.title, bt.brand_description, bt.slug, bt.translation_language
                FROM brand b
                JOIN brand_translation bt ON bt.brand_id = b.id
                WHERE b.id = ?`)
            .bind(id)
            .all<IBrandTranslated>();

        return {
            success: true,
            data: results as IBrandTranslated[],
            message: 'Brand updated successfully'
        };

    } catch (err) {
        console.error('updateBrand database error', id, data, err);
        throw err;
    }
}

// delete
export async function deleteBrand(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();
        const TARGET_TYPE = 'brand';

        const protectedBrands: number[] = [DEFAULT_BRAND_IDS.DEFAULT];
        if (protectedBrands.includes(id)) return { success: false, error: 'Default brand cannot be deleted', code: 'VALIDATION_ERROR' };

        const productInUse = await db
            .prepare('SELECT 1 FROM product WHERE brand_id = ? LIMIT 1')
            .bind(id)
            .first();

        if (productInUse) return { success: false, error: 'Brand cannot be deleted because it is being used by products', code: 'VALIDATION_ERROR' };

        const stmtMetadata = db
            .prepare('DELETE FROM metadata WHERE target_type = ? AND target_id = ?')
            .bind(TARGET_TYPE, id);

        const stmtBrand = db
            .prepare('DELETE FROM brand WHERE id = ?')
            .bind(id);

        const [, brandResult] = await db
            .batch([stmtMetadata, stmtBrand]);

        if (brandResult.meta.changes === 0) return { success: false, error: 'Brand not found', code: 'NOT_FOUND' };

        return {
            success: true,
            message: 'Brand and associated metadata deleted successfully'
        };

    } catch (err) {
        console.error('deleteBrand database error', err);
        return {
            success: false,
            error: 'Failed to delete brand',
            code: 'INTERNAL_ERROR'
        };
    }
}
