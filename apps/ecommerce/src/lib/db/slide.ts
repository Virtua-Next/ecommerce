import type { ISlideTranslated  } from '@/lib/schemas/slide';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function publicAllSlides(locale?: string): Promise<ISlideTranslated[]> {
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
                    COALESCE(st.button_text, st_default.button_text) AS button_text
                FROM slide s
                LEFT JOIN slide_translation st ON st.slide_id = s.id AND st.translation_language = ?
                LEFT JOIN slide_translation st_default ON st_default.slide_id = s.id AND st_default.translation_language = ?
                WHERE s.active = 1
                ORDER BY s.active DESC, s.slide_order ASC`)
            .bind(language, DEFAULT_LANGUAGE)
            .all();

        return (results as any[]).map((row) => ({
            ...row,
            active: Boolean(row.active),
            slide_location: JSON.parse(row.slide_location),
        })) as ISlideTranslated[];

    } catch (err) {
        console.error('publicAllSlides database error', err);
        throw err;
    }
}
