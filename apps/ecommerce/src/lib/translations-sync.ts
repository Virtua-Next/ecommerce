export type TranslationTable = {
    baseTable: string;
    translationTable: string;
    fkColumn: string;
    contentColumns: string[];
};

export const TRANSLATION_TABLES: TranslationTable[] = [
    { baseTable: 'config', translationTable: 'config_translation', fkColumn: 'config_id', contentColumns: ['site_name', 'site_description'] },
    { baseTable: 'slide', translationTable: 'slide_translation', fkColumn: 'slide_id', contentColumns: ['title', 'subtitle', 'button_text'] },
    { baseTable: 'footer', translationTable: 'footer_translation', fkColumn: 'footer_id', contentColumns: ['title', 'content'] },
    { baseTable: 'metadata', translationTable: 'metadata_translation', fkColumn: 'metadata_id', contentColumns: ['title', 'metadata_description', 'keywords', 'og_title', 'og_description', 'x_title', 'x_description'] },
    { baseTable: 'tb_page', translationTable: 'page_translation', fkColumn: 'page_id', contentColumns: ['slug', 'title', 'page_description', 'content'] },
    { baseTable: 'carrier', translationTable: 'carrier_translation', fkColumn: 'carrier_id', contentColumns: ['carrier_name'] },
    { baseTable: 'brand', translationTable: 'brand_translation', fkColumn: 'brand_id', contentColumns: ['title', 'brand_description', 'slug'] },
    { baseTable: 'category', translationTable: 'category_translation', fkColumn: 'category_id', contentColumns: ['title', 'category_description', 'slug'] },
    { baseTable: 'product', translationTable: 'product_translation', fkColumn: 'product_id', contentColumns: ['title', 'slug', 'product_description', 'specification'] },
    { baseTable: 'tb_profile', translationTable: 'profile_translation', fkColumn: 'profile_id', contentColumns: ['profile_description'] },
    { baseTable: 'payment_api', translationTable: 'payment_api_translation', fkColumn: 'payment_api_id', contentColumns: ['title'] },
    { baseTable: 'payment_method', translationTable: 'payment_method_translation', fkColumn: 'payment_method_id', contentColumns: ['title', 'method_description'] },
];

/**
 * Builds the statements that create translations for the added languages,
 * copying every row that exists in sourceLanguage.
 *
 * Nothing is ever deleted: translations of disabled languages are kept, so
 * re-enabling a language brings back the work already done. Only the rows that
 * are MISSING are created (existing translations are never overwritten), which
 * also fills the gaps for items created while the language was disabled.
 *
 * sourceLanguage should be the language that had the content before this change
 * (the previous default language), not one that is being added in the same request.
 */
export function buildTranslationSyncStatements(db: D1Database, added: string[], sourceLanguage: string): D1PreparedStatement[] {
    const statements: D1PreparedStatement[] = [];

    for (const { translationTable, fkColumn, contentColumns } of TRANSLATION_TABLES) {
        const insertCols = [fkColumn, 'translation_language', ...contentColumns].join(', ');
        const selectCols = [`src.${fkColumn}`, '?', ...contentColumns.map((c) => `src.${c}`)].join(', ');

        for (const lang of added) {
            // NOT EXISTS keeps this safe even without a UNIQUE(fk, language) constraint:
            // it never duplicates or overwrites a translation that is already there.
            statements.push(
                db
                    .prepare(`
                        INSERT INTO ${translationTable} (${insertCols})
                        SELECT ${selectCols}
                        FROM ${translationTable} AS src
                        WHERE src.translation_language = ?
                          AND NOT EXISTS (
                              SELECT 1 FROM ${translationTable} AS existing
                              WHERE existing.${fkColumn} = src.${fkColumn}
                                AND existing.translation_language = ?
                          )
                    `)
                    .bind(lang, sourceLanguage, lang)
            );
        }
    }

    return statements;
}