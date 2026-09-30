import { ILocalizedMetadataFields, IMetadataTranslated, UpdateMetadataRequestInput, CreateMetadataRequestInput, IMetadataOutput } from "@/lib/schemas/metadata";
import { fetchTranslations, upsertTranslation } from "./translation";
import { IResult } from '@/lib/types/generic';
import { getDb } from '@/lib/cloudflare/context';
import { SupportedLanguage } from "@/lib/types/generic";
import { stripHtmlToText } from '@/lib/utils';


// by target_type, target_id
export async function getMetadataByTarget(targetType: string, targetId: number): Promise<IMetadataOutput | null> {
    try {
        const db = getDb();
        const metadata = await db
            .prepare(`SELECT * FROM metadata WHERE target_type = ? AND target_id = ?`)
            .bind(targetType, targetId)
            .first<IMetadataTranslated>();

        if (!metadata) return null;

        const translationsByLanguage = await fetchTranslations('metadata_translation', 'metadata_id', metadata.id);
        const translations: Record<string, ILocalizedMetadataFields> = {};
        for (const [language, row] of Object.entries(translationsByLanguage)) {
            translations[language] = {
                title: row.title ?? '',
                metadata_description: row.metadata_description ?? '',
                keywords: row.keywords ?? '',
                og_title: row.og_title ?? '',
                og_description: row.og_description ?? '',
                x_title: row.x_title ?? '',
                x_description: row.x_description ?? '',
            };
        }

        return {
            id: metadata.id,
            target_type: metadata.target_type,
            target_id: metadata.target_id,
            robots_directive: metadata.robots_directive,
            og_image: metadata.og_image,
            x_image: metadata.x_image,
            created_at: metadata.created_at,
            updated_at: metadata.updated_at,
            translations,
        };

    } catch (err) {
        console.error('getMetadataByTarget database error', err);
        throw err;
    }
}

// create
export async function createMetadata(data: CreateMetadataRequestInput): Promise<IResult<IMetadataTranslated[]>> {
    try {
        const db = getDb();
        const existing = await db
            .prepare(`SELECT id FROM metadata WHERE target_type = ? AND target_id = ?`)
            .bind(data.target_type, data.target_id)
            .first();

        if (existing) return { success: false, error: "Metadata already exists for this target", code: 'DUPLICATE' };

        const result = await db
            .prepare(`INSERT INTO metadata (robots_directive, og_image, x_image, target_type, target_id)VALUES (?, ?, ?, ?, ?)`)
            .bind(data.robots_directive ?? null, data.og_image ?? null, data.x_image ?? null, data.target_type, data.target_id)
            .run();

        const newId = result.meta.last_row_id;

        for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
            const fields = data.translations[lang as keyof typeof data.translations];
            if (!fields) continue;

            try {
                await upsertTranslation('metadata_translation', 'metadata_id', newId, lang, {
                    title: fields.title ?? undefined,
                    metadata_description: stripHtmlToText(fields.metadata_description) ?? undefined,
                    keywords: fields.keywords ?? undefined,
                    og_title: fields.og_title ?? undefined,
                    og_description: stripHtmlToText(fields.og_description) ?? undefined,
                    x_title: fields.x_title ?? undefined,
                    x_description: stripHtmlToText(fields.x_description) ?? undefined,
                });
            } catch (e) {
                await db.prepare('DELETE FROM metadate WHERE id = ?').bind(newId).run();
                return {
                    success: false,
                    error: 'Failed to create metadata translation',
                    code: 'INTERNAL_ERROR',
                };
            }
        }

        const { results } = await db
            .prepare(`
                SELECT m.id, m.robots_directive, m.og_image, m.x_image,
                    m.created_at, m.updated_at, m.target_type, m.target_id,
                    mt.title, mt.metadata_description, mt.keywords, mt.og_title,
                    mt.og_description, mt.x_title, mt.x_description, mt.translation_language
                FROM metadata m
                JOIN metadata_translation mt ON mt.metadata_id = m.id
                WHERE m.id = ?`)
            .bind(newId)
            .all<IMetadataTranslated>();

        return {
            success: true,
            data: results as IMetadataTranslated[],
            message: 'Metadata created successfully'
        };

    } catch (err) {
        console.error('createMetadata database error', err);
        throw err;
    }
}

// update
export async function updateMetadata(targetType: string, targetId: number, data: UpdateMetadataRequestInput): Promise<IResult<IMetadataTranslated[]>> {
    try {
        const db = getDb();
        const existing = await db
            .prepare(`SELECT * FROM metadata WHERE target_type = ? AND target_id = ?`)
            .bind(targetType, targetId)
            .first<IMetadataTranslated>();

        if (!existing) return { success: false, error: "Metadata not found", code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];
        const simpleFields = ['robots_directive', 'og_image', 'x_image'] as const;

        for (const field of simpleFields) {
            const value = data[field];
            if (value !== undefined && value !== existing[field]) {
                fieldsToUpdate.push(`${field} = ?`);
                values.push(value);
            }
        }

        if (fieldsToUpdate.length > 0) {
            fieldsToUpdate.push(`updated_at = datetime('now')`);
            await db
                .prepare(`UPDATE metadata SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, existing.id)
                .run();
        }

        if (data.translations) {
            for (const lang of Object.keys(data.translations) as Array<SupportedLanguage>) {
                const fields = data.translations[lang as keyof typeof data.translations];
                if (!fields) continue;

                try {
                    await upsertTranslation('metadata_translation', 'metadata_id', existing.id, lang, {
                        title: fields.title ?? undefined,
                        metadata_description: stripHtmlToText(fields.metadata_description) ?? undefined,
                        keywords: fields.keywords ?? undefined,
                        og_title: fields.og_title ?? undefined,
                        og_description: stripHtmlToText(fields.og_description) ?? undefined,
                        x_title: fields.x_title ?? undefined,
                        x_description: stripHtmlToText(fields.x_description) ?? undefined,
                    });
                } catch (e) {
                    throw new Error('Failed to translate metadata', { cause: e });
                }
            }
        }

        if (fieldsToUpdate.length === 0 && !data.translations) return { success: false, error: "No data was changed", code: 'NO_CHANGES' };

        const { results } = await db
            .prepare(`
                SELECT m.id, m.robots_directive, m.og_image, m.x_image,
                    m.created_at, m.updated_at, m.target_type, m.target_id,
                    mt.title, mt.metadata_description, mt.keywords, mt.og_title,
                    mt.og_description, mt.x_title, mt.x_description, mt.translation_language
                FROM metadata m
                JOIN metadata_translation mt ON mt.metadata_id = m.id
                WHERE m.id = ?`)
            .bind(existing.id)
            .all<IMetadataTranslated>();

        return {
            success: true,
            data: results as IMetadataTranslated[],
            message: 'Metadata updated successfully'
        };

    } catch (err) {
        console.error('updateMetadata database error', err);
        throw err;
    }
}

// delete
export async function deleteMetadata(targetType: string, targetId: number): Promise<IResult<null>> {
    try {
        const db = getDb();
        const existing = await db
            .prepare(`SELECT id FROM metadata WHERE target_type = ? AND target_id = ?`)
            .bind(targetType, targetId)
            .first();

        if (!existing) return { success: false, error: "Metadata not found", code: 'NOT_FOUND' };

        // (ON DELETE CASCADE)
        await db
            .prepare(`DELETE FROM metadata WHERE target_type = ? AND target_id = ?`)
            .bind(targetType, targetId)
            .run();

        return {
            success: true,
            message: 'Metadata deleted successfully'
        };

    } catch (err) {
        console.error('deleteMetadata database error', err);
        throw err;
    }
}
