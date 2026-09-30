import type { IFooterTranslated } from '@/lib/schemas/footer';
import { getDb } from '@/lib/cloudflare/context';
import { DEFAULT_LANGUAGE } from '@/lib/constants'


// list
export async function publicAllFooters(locale?: string): Promise<IFooterTranslated[]> {
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
                    COALESCE(ft.content, ft_default.content) AS content
                FROM footer f
                LEFT JOIN footer_translation ft ON ft.footer_id = f.id AND ft.translation_language = ?
                LEFT JOIN footer_translation ft_default ON ft_default.footer_id = f.id AND ft_default.translation_language = ?
                WHERE f.active = 1
                ORDER BY f.footer_order ASC`)
            .bind(language, DEFAULT_LANGUAGE)
            .all<IFooterTranslated>();

        return results.map((row) => ({ ...row, active: Boolean(row.active) }));

    } catch (err) {
        console.error('publicAllFooters database error', err);
        throw err;
    }
}
