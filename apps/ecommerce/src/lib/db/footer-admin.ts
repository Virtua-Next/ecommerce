import type { IFooterTranslated, ICreateFooterPayload, IUpdateFooterPayload, ILocalizedFooterFields } from '@/lib/schemas/footer';
import type { IResult, SupportedLanguage } from '@/lib/types/generic';
import { upsertTranslation } from '@/lib/db/translation';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants'


// list
export async function adminAllFooters(locale?: string): Promise<IFooterTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    f.id,
                    f.footer_type,
                    f.footer_order,
                    f.active,
                    COALESCE(ft.title, ft_default.title) AS title,
                    COALESCE(ft.content, ft_default.content) AS content,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', ft_all.translation_language,
                                'title', ft_all.title,
                                'content', ft_all.content
                            )
                        )
                        FROM footer_translation ft_all
                        WHERE ft_all.footer_id = f.id
                    ) AS translations_json
                FROM footer f
                LEFT JOIN footer_translation ft 
                    ON ft.footer_id = f.id AND ft.translation_language = ?
                LEFT JOIN footer_translation ft_default 
                    ON ft_default.footer_id = f.id AND ft_default.translation_language = ?
                ORDER BY f.active DESC, f.footer_order ASC
            `)
            .bind(language, DEFAULT_LANGUAGE)
            .all();

        return results.map((row) => {
            const typedRow = row as Record<string, any>;
            const translations: Record<SupportedLanguage, ILocalizedFooterFields> = {} as Record<SupportedLanguage, ILocalizedFooterFields>;

            if (typedRow.translations_json) {
                try {
                    const translationsJson = typeof typedRow.translations_json === 'string'
                        ? typedRow.translations_json
                        : JSON.stringify(typedRow.translations_json ?? []);
                    const translationsArray = JSON.parse(translationsJson) as Array<Record<string, any>>;
                    translationsArray.forEach((t) => {
                        translations[t.language as SupportedLanguage] = {
                            title: t.title || '',
                            content: t.content || '',
                        };
                    });
                } catch (e) {
                    console.error('Error parsing translations for footer:', typedRow.id, e);
                }
            }

            return {
                id: typedRow.id,
                footer_type: typedRow.footer_type,
                footer_order: typedRow.footer_order,
                active: Boolean(typedRow.active),
                title: typedRow.title,
                content: typedRow.content,
                translation_language: language,
                translations,
            };
        }) as IFooterTranslated[];

    } catch (err) {
        console.error('adminAllFooters database error', err);
        throw err;
    }
}

// create
export async function createFooter(data: ICreateFooterPayload): Promise<IResult<IFooterTranslated[]>> {
    try {
        const db = getDb();

        if (Object.keys(data.translations).length === 0) return { success: false, error: 'No valid data received.', code: 'VALIDATION_ERROR' };

        const result = await db
            .prepare(`INSERT INTO footer (footer_type, footer_order, active) VALUES (?, ?, ?)`)
            .bind(data.footer_type, data.footer_order ?? 0, data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
            const fields = data.translations[lang];
            if (!fields) continue;

            try {
                await upsertTranslation('footer_translation', 'footer_id', newId, lang, {
                    title: fields.title,
                    content: fields.content,
                });
            } catch (e) {
                await db.prepare('DELETE FROM footer WHERE id = ?').bind(newId).run();
                return {
                    success: false,
                    error: 'Failed to create footer translation',
                    code: 'INTERNAL_ERROR',
                };
            }
        }

        const { results } = await db
            .prepare(`SELECT f.id, f.footer_type, f.footer_order, f.active, ft.title, ft.content, ft.translation_language FROM footer f JOIN footer_translation ft ON ft.footer_id = f.id WHERE f.id = ?`)
            .bind(newId)
            .all();

        return {
            success: true,
            data: results.map((row: any) => ({ ...row, active: Boolean(row.active) })) as IFooterTranslated[],
            message: 'Footer section created successfully'
        };

    } catch (err) {
        console.error('createFooter database error', err);
        throw err;
    }
}

// update
export async function updateFooter(id: number, data: IUpdateFooterPayload): Promise<IResult<IFooterTranslated[]>> {
    try {
        const db = getDb();
        const existingFooter = await db
            .prepare('SELECT * FROM footer WHERE id = ?')
            .bind(id)
            .first();

        if (!existingFooter) return { success: false, error: 'Footer section not found', code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        if (data.footer_type !== undefined && data.footer_type !== (existingFooter as any).footer_type) {
            fieldsToUpdate.push('footer_type = ?');
            values.push(data.footer_type);
        }
        if (data.footer_order !== undefined && data.footer_order !== (existingFooter as any).footer_order) {
            fieldsToUpdate.push('footer_order = ?');
            values.push(data.footer_order);
        }
        if (data.active !== undefined && data.active !== Boolean((existingFooter as any).active)) {
            fieldsToUpdate.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE footer SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
                const fields = data.translations[lang];
                if (!fields) continue;

                try {
                    await upsertTranslation('footer_translation', 'footer_id', id, lang, {
                        title: fields.title,
                        content: fields.content,
                    });
                } catch (e) {
                    throw new Error('Failed to translate footer', { cause: e });
                }
            }
        }

        if (fieldsToUpdate.length === 0 && !data.translations) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' };

        const { results } = await db
            .prepare(`SELECT f.id, f.footer_type, f.footer_order, f.active, ft.title, ft.content, ft.translation_language FROM footer f JOIN footer_translation ft ON ft.footer_id = f.id WHERE f.id = ?`)
            .bind(id)
            .all();

        return {
            success: true,
            data: results.map((row: any) => ({ ...row, active: Boolean(row.active) })) as IFooterTranslated[],
            message: 'Footer section updated successfully'
        };

    } catch (err) {
        console.error('updateFooter database error', err);
        throw err;
    }
}

// delete
export async function deleteFooter(id: number): Promise<IResult<null>> {
    try {
        const db = getDb();
        const existing = await db
            .prepare('SELECT id FROM footer WHERE id = ?')
            .bind(id)
            .first();

        if (!existing) return { success: false, error: 'Footer section not found', code: 'NOT_FOUND' };

        // (ON DELETE CASCADE)
        await db
            .prepare('DELETE FROM footer WHERE id = ?')
            .bind(id)
            .run();

        return {
            success: true,
            message: 'Footer section deleted successfully'
        };

    } catch (err) {
        console.error('deleteFooter database error', err);
        throw err;
    }
}
