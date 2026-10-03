import type { IPageTranslated, IUpdatePagePayload, ICreatePagePayload, LocalizedPageFields } from '@/lib/schemas/page';
import { DEFAULT_PAGE_IDS, DEFAULT_LANGUAGE } from '@/lib/constants';
import type { IResult } from '@/lib/types/generic';
import { upsertTranslation } from '@/lib/db/translation';
import { getAdminConfig } from '@/lib/db/config-admin';
import { createMetadata } from '@/lib/db/metadata-admin';
import { getDb } from '@/lib/cloudflare/context';
import { SupportedLanguage } from '@/lib/types/generic';
import { stripHtmlToText } from '@/lib/utils';


// list all
export async function adminAllPages(locale?: string): Promise<IPageTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    p.id,
                    p.page_image,
                    p.page_order,
                    p.active,
                    COALESCE(pt.slug, pt_default.slug) AS slug,
                    COALESCE(pt.title, pt_default.title) AS title,
                    COALESCE(pt.page_description, pt_default.page_description) AS page_description,
                    COALESCE(pt.content, pt_default.content) AS content,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', pt_all.translation_language,
                                'slug', pt_all.slug,
                                'title', pt_all.title,
                                'page_description', pt_all.page_description,
                                'content', pt_all.content
                            )
                        )
                        FROM page_translation pt_all
                        WHERE pt_all.page_id = p.id
                    ) AS translations_json
                FROM tb_page p
                LEFT JOIN page_translation pt ON pt.page_id = p.id AND pt.translation_language = ?
                LEFT JOIN page_translation pt_default ON pt_default.page_id = p.id AND pt_default.translation_language = ?
                ORDER BY p.active DESC, COALESCE(pt.title, pt_default.title) ASC
            `)
            .bind(language, DEFAULT_LANGUAGE)
            .all<{
                id: number;
                page_image: string;
                page_order: number;
                active: number;
                slug: string;
                title: string;
                page_description: string | null;
                content: string | null;
                translations_json: string | null;
            }>();

        return results.map((row) => {
            let translations: Record<SupportedLanguage, LocalizedPageFields> = {} as Record<SupportedLanguage, LocalizedPageFields>;

            if (row.translations_json) {
                try {
                    const translationsArray = JSON.parse(row.translations_json);
                    translationsArray.forEach((t: any) => {
                        translations[t.language as SupportedLanguage] = {
                            slug: t.slug,
                            title: t.title,
                            page_description: t.page_description,
                            content: t.content
                        };
                    });
                } catch (e) {
                    console.error('Error parsing translations for page:', row.id, e);
                }
            }

            return {
                id: row.id,
                page_image: row.page_image,
                page_order: row.page_order,
                active: Boolean(row.active),
                slug: row.slug,
                title: row.title,
                page_description: row.page_description,
                content: row.content as string,
                translation_language: language,
                translations: translations
            };
        });

    } catch (err) {
        console.error('adminAllPages database error', err);
        throw err;
    }
}

// create
export async function createPage(data: ICreatePagePayload): Promise<IResult<IPageTranslated[]>> {
    try {
        const db = getDb();
        const config = await getAdminConfig(DEFAULT_LANGUAGE);
        if (!config) return { success: false, error: 'Configuration not found', code: 'INTERNAL_ERROR' };

        const availableLanguages = Object.keys(data.translations) as Array<SupportedLanguage>;

        const result = await db
            .prepare(`INSERT INTO tb_page (page_image, page_order, active) VALUES (?, ?, ?)`)
            .bind(data.page_image ?? null, data.page_order, data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        for (const lang of availableLanguages) {
            const fields = { ...data.translations[lang] };

            const root = fields.slug || `item-${Math.random().toString(36).slice(2, 8)}`;
            let finalSlug = root;
            let counter = 1;
            while (await db.prepare(`SELECT 1 FROM page_translation WHERE slug = ? AND translation_language = ?`).bind(finalSlug, lang).first()) {
                finalSlug = `${root}-${counter++}`;
            }

            try {
                await upsertTranslation('page_translation', 'page_id', newId, lang, {
                    title: fields.title,
                    page_description: fields.page_description ?? undefined,
                    content: fields.content ?? undefined,
                    slug: finalSlug,
                });
            } catch (e) {
                await db.prepare('DELETE FROM tb_page WHERE id = ?').bind(newId).run();
                return {
                    success: false,
                    error: 'Failed to create page translation',
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
            const description = fields.page_description || `${siteName} - ${title}`;

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
            target_type: 'page' as const,
            target_id: newId,
            robots_directive: 'index, follow',
            og_image: data.page_image || null,
            x_image: data.page_image || null,
            translations: metadataTranslations,
        };

        const metadataResult = await createMetadata(metadataPayload);
        if (!metadataResult.success) {
            await db
                .prepare('DELETE FROM tb_page WHERE id = ?')
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
                SELECT p.id, p.page_image, p.page_order, p.active, pt.title, pt.page_description, pt.content, pt.slug, pt.translation_language
                FROM tb_page p
                JOIN page_translation pt ON pt.page_id = p.id
                WHERE p.id = ?`)
            .bind(newId)
            .all<IPageTranslated>();

        return {
            success: true,
            data: results as IPageTranslated[],
            message: 'Page created successfully'
        };

    } catch (err) {
        console.error('createPage database error', err);
        throw err;
    }
}

// update
export async function updatePage(id: number, data: IUpdatePagePayload): Promise<IResult<IPageTranslated[]>> {
    try {
        const db = getDb();
        const existingPage = await db
            .prepare('SELECT * FROM tb_page WHERE id = ?')
            .bind(id)
            .first();

        if (!existingPage) return { success: false, error: 'Page not found', code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        if (data.page_image !== undefined && data.page_image !== existingPage.page_image) {
            fieldsToUpdate.push('page_image = ?');
            values.push(data.page_image);
        }
        if (data.page_order !== undefined && data.page_order !== existingPage.page_order) {
            fieldsToUpdate.push('page_order = ?');
            values.push(data.page_order);
        }
        if (data.active !== undefined && data.active !== Boolean(existingPage.active)) {
            fieldsToUpdate.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE tb_page SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
                const fields = { ...data.translations[lang] };
                if (!fields) continue;

                if (fields.slug !== undefined) {
                    const root = fields.slug || `item-${Math.random().toString(36).slice(2, 8)}`;
                    let finalSlug = root;
                    let counter = 1;
                    while (await db.prepare(`SELECT 1 FROM page_translation WHERE slug = ? AND translation_language = ?`).bind(finalSlug, lang).first()) {
                        finalSlug = `${root}-${counter++}`;
                    }
                    fields.slug = finalSlug;
                }

                try {
                    await upsertTranslation('page_translation', 'page_id', id, lang, {
                        title: fields.title,
                        page_description: fields.page_description ?? undefined,
                        content: fields.content ?? undefined,
                        slug: fields.slug,
                    });
                } catch (e) {
                    throw new Error('Failed to translate page', { cause: e });
                }
            }
        }

        if (fieldsToUpdate.length === 0 && !data.translations) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' };

        const { results } = await db
            .prepare(`
                SELECT p.id, p.page_image, p.page_order, p.active, pt.title, pt.page_description, pt.content, pt.slug, pt.translation_language
                FROM tb_page p
                JOIN page_translation pt ON pt.page_id = p.id
                WHERE p.id = ?`)
            .bind(id)
            .all<IPageTranslated>();

        return {
            success: true,
            data: results as IPageTranslated[],
            message: 'Page updated successfully'
        };

    } catch (err) {
        console.error('updatePage database error', err);
        throw err;
    }
}

// delete
export async function deletePage(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();
        const TARGET_TYPE = 'page';

        const protectedPages: number = DEFAULT_PAGE_IDS.DEFAULT;
        if (protectedPages === id) return { success: false, error: 'Default page cannot be deleted', code: 'VALIDATION_ERROR' };

        const stmtMetadata = db
            .prepare('DELETE FROM metadata WHERE target_type = ? AND target_id = ?')
            .bind(TARGET_TYPE, id);

        const stmtPage = db
            .prepare('DELETE FROM tb_page WHERE id = ?')
            .bind(id);

        const [, pageResult] = await db
            .batch([stmtMetadata, stmtPage]);

        if (pageResult.meta.changes === 0) return { success: false, error: 'Page not found', code: 'NOT_FOUND' };

        return {
            success: true,
            message: 'Page and associated metadata deleted successfully'
        };

    } catch (err) {
        console.error('deletePage database error', err);
        throw err;
    }
}
