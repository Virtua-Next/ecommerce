import type { ISlideTranslated, ICreateSlidePayload, IUpdateSlidePayload, ILocalizedSlideFields } from '@/lib/schemas/slide';
import type { IResult, SupportedLanguage } from '@/lib/types/generic';
import { upsertTranslation } from '@/lib/db/translation';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function adminAllSlides(locale?: string): Promise<ISlideTranslated[]> {
    try {
        const db = getDb();
        const language = locale ?? DEFAULT_LANGUAGE;

        const { results } = await db
            .prepare(`
                SELECT
                    s.id,
                    s.slide_image,
                    s.button_link,
                    s.button_background,
                    s.button_border,
                    s.button_text_color,
                    s.title_color,
                    s.subtitle_color,
                    s.slide_location,
                    s.slide_order,
                    s.active,
                    COALESCE(st.title, st_default.title) AS title,
                    COALESCE(st.subtitle, st_default.subtitle) AS subtitle,
                    COALESCE(st.button_text, st_default.button_text) AS button_text,
                    (
                        SELECT json_group_array(
                            json_object(
                                'language', st_all.translation_language,
                                'title', st_all.title,
                                'subtitle', st_all.subtitle,
                                'button_text', st_all.button_text
                            )
                        )
                        FROM slide_translation st_all
                        WHERE st_all.slide_id = s.id
                    ) AS translations_json
                FROM slide s
                LEFT JOIN slide_translation st ON st.slide_id = s.id AND st.translation_language = ?
                LEFT JOIN slide_translation st_default ON st_default.slide_id = s.id AND st_default.translation_language = ?
                ORDER BY s.active DESC, s.slide_order ASC`)
            .bind(language, DEFAULT_LANGUAGE)
            .all();

        return results.map((row) => {
            const typedRow = row as Record<string, any>;
            let translations: Record<SupportedLanguage, ILocalizedSlideFields> = {} as Record<SupportedLanguage, ILocalizedSlideFields>;

            if (typedRow.translations_json) {
                try {
                    const translationsJson = typeof typedRow.translations_json === 'string'
                        ? typedRow.translations_json
                        : JSON.stringify(typedRow.translations_json ?? []);
                    const translationsArray = JSON.parse(translationsJson) as Array<Record<string, any>>;
                    translationsArray.forEach((t) => {
                        translations[t.language as SupportedLanguage] = {
                            title: t.title,
                            subtitle: t.subtitle,
                            button_text: t.button_text,
                        };
                    });
                } catch (e) {
                    console.error('Error parsing translations for slide:', typedRow.id, e);
                }
            }

            return {
                ...typedRow,
                active: Boolean(typedRow.active),
                slide_location: typeof typedRow.slide_location === 'string' ? JSON.parse(typedRow.slide_location) : typedRow.slide_location,
                translation_language: language,
                translations,
            };
        }) as ISlideTranslated[];

    } catch (err) {
        console.error('adminAllSlides database error', err);
        throw err;
    }
}

export async function createSlide(data: ICreateSlidePayload): Promise<IResult<ISlideTranslated[]>> {
    try {
        const db = getDb();
        if (Object.keys(data.translations).length === 0) return { success: false, error: 'At least one translation is required', code: 'VALIDATION_ERROR' };

        const result = await db
            .prepare(`
                INSERT INTO slide (
                    slide_image, title_color, subtitle_color, button_text_color,
                    button_background, button_border, button_link, slide_location,
                    slide_order, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(
                data.slide_image,
                data.title_color ?? null,
                data.subtitle_color ?? null,
                data.button_text_color ?? null,
                data.button_background ?? null,
                data.button_border ?? null,
                data.button_link ?? null,
                JSON.stringify(data.slide_location),
                data.slide_order ?? 0,
                data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
            const fields = data.translations[lang];
            if (!fields) continue;

            try {
                await upsertTranslation('slide_translation', 'slide_id', newId, lang, {
                    title: fields.title,
                    subtitle: fields.subtitle,
                    button_text: fields.button_text,
                });
            } catch (e) {
                await db.prepare('DELETE FROM slide WHERE id = ?').bind(newId).run();
                return {
                    success: false,
                    error: 'Failed to create slide translation',
                    code: 'INTERNAL_ERROR',
                };
            }
        }

        const { results } = await db
            .prepare(`
                SELECT s.id, s.slide_image, s.title_color, s.subtitle_color, s.button_text_color,
                    s.button_background, s.button_border, s.button_link, s.slide_location,
                    s.slide_order, s.active,
                    st.title, st.subtitle, st.button_text, st.translation_language
                FROM slide s
                JOIN slide_translation st ON st.slide_id = s.id
                WHERE s.id = ?`)
            .bind(newId)
            .all();

        return {
            success: true,
            data: (results as any[]).map((row) => ({
                ...row,
                active: Boolean(row.active),
                slide_location: JSON.parse(row.slide_location),
            })) as ISlideTranslated[],
            message: 'Slide created successfully'
        };

    } catch (err) {
        console.error('Database error', err);
        return { success: false, error: 'Failed to create slide in database', code: 'INTERNAL_ERROR' };
    }
}

export async function updateSlide(id: number, data: IUpdateSlidePayload): Promise<IResult<ISlideTranslated[]>> {
    try {
        const db = getDb();
        const existingSlide = await db
            .prepare('SELECT * FROM slide WHERE id = ?')
            .bind(id)
            .first();

        if (!existingSlide) return { success: false, error: 'Slide not found', code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        const simpleFields: Array<keyof typeof data> = [
            'slide_image',
            'title_color',
            'subtitle_color',
            'button_text_color',
            'button_background',
            'button_border',
            'button_link',
            'slide_order',
        ];
        for (const field of simpleFields) {
            if (data[field] !== undefined && data[field] !== (existingSlide as any)[field]) {
                fieldsToUpdate.push(`${String(field)} = ?`);
                values.push(data[field]);
            }
        }

        if (data.slide_location !== undefined) {
            const newLocation = JSON.stringify(data.slide_location);
            if (newLocation !== (existingSlide as any).slide_location) {
                fieldsToUpdate.push('slide_location = ?');
                values.push(newLocation);
            }
        }

        if (data.active !== undefined && data.active !== Boolean((existingSlide as any).active)) {
            fieldsToUpdate.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE slide SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        if (data.translations) {
            for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
                const fields = data.translations[lang];
                if (!fields) continue;

                try {
                    await upsertTranslation('slide_translation', 'slide_id', id, lang, {
                        title: fields.title,
                        subtitle: fields.subtitle,
                        button_text: fields.button_text,
                    });
                } catch (e) {
                    throw new Error('Failed to translate slide', { cause: e });
                }
            }
        }

        if (fieldsToUpdate.length === 0 && !data.translations) return { success: false, error: 'No data was changed', code: 'NO_CHANGES' }

        const { results } = await db
            .prepare(`
                SELECT s.id, s.slide_image, s.title_color, s.subtitle_color, s.button_text_color,
                    s.button_background, s.button_border, s.button_link, s.slide_location,
                    s.slide_order, s.active,
                    st.title, st.subtitle, st.button_text, st.translation_language
                FROM slide s
                JOIN slide_translation st ON st.slide_id = s.id
                WHERE s.id = ?`)
            .bind(id)
            .all();

        return {
            success: true,
            data: (results as any[]).map((row) => ({
                ...row,
                active: Boolean(row.active),
                slide_location: JSON.parse(row.slide_location),
            })) as ISlideTranslated[],
            message: 'Slide updated successfully'
        };

    } catch (err) {
        console.error('updateSlide database error', err);
        throw err;
    }
}

export async function deleteSlide(id: number): Promise<IResult<null>> {
    try {
        const db = getDb();
        const existing = await db
            .prepare('SELECT id FROM slide WHERE id = ?')
            .bind(id)
            .first();

        if (!existing) return { success: false, error: 'Slide not found', code: 'NOT_FOUND' };

        // (ON DELETE CASCADE)
        await db
            .prepare('DELETE FROM slide WHERE id = ?')
            .bind(id)
            .run();

        return {
            success: true,
            message: 'Slide deleted successfully'
        };

    } catch (err) {
        console.error('deleteSlide database error', err);
        throw err;
    }
}
