import { getDb } from "@/lib/cloudflare/context";
import { IEmailApiTranslated, ICreateEmailApiPayload, IUpdateEmailApiPayload, ICreateTriggerEmailPayload, IUpdateTriggerEmailPayload, ITriggerEmail } from "@/lib/schemas/email";
import { IResult } from "@/lib/types/generic";
import { DEFAULT_LANGUAGE } from "@/lib/constants";


// API

// list
export async function adminAllEmailAPIs(locale?: string): Promise<IEmailApiTranslated[]> {
    try {
        const db = getDb();

        const { results } = await db
            .prepare(`
                SELECT 
                    e.id, 
                    e.api_server,
                    e.api_key,
                    e.active
                FROM email_api e
                ORDER BY e.active DESC, e.api_server ASC`)
            .all();

        return results.map((row: any) => ({
            ...row,
            active: Boolean(row.active),
            title: row.api_server,
            translation_language: locale ?? DEFAULT_LANGUAGE,
        })) as IEmailApiTranslated[];

    } catch (err) {
        console.error('adminAllEmailAPIs database error', err);
        throw err;
    }
}

// create
export async function createEmailAPI(data: ICreateEmailApiPayload): Promise<IResult<IEmailApiTranslated>> {
    try {
        const db = getDb();

        if (!data.api_server || !data.api_key) return { success: false, error: "API server ans API key is required", code: 'VALIDATION_ERROR' };

        const existing = await db
            .prepare(`SELECT 1 FROM email_api WHERE api_server = ?`)
            .bind(data.api_server)
            .first();

        if (existing) return { success: false, error: "An email API with this server already exists", code: 'DUPLICATE' };

        const result = await db
            .prepare(`INSERT INTO email_api (api_server, api_key, active) VALUES (?, ?, ?)`)
            .bind(data.api_server, data.api_key, data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        const emailApi = await adminEmailApiById(newId);
        if (!emailApi) return { success: false, error: 'Falied to get Email API', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: emailApi,
            message: 'Email API created successfully'
        };

    } catch (err) {
        console.error('createEmailAPI database error', err);
        throw err;
    }
}

// update
export async function updateEmailAPI(id: number, data: IUpdateEmailApiPayload): Promise<IResult<IEmailApiTranslated>> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id FROM email_api WHERE id = ?`)
            .bind(id)
            .first();

        if (!existing) return { success: false, error: "Email API not found", code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            api_server: 'api_server',
            api_key: 'api_key',
            active: 'active',
        };

        for (const [key, value] of Object.entries(data)) {
            if (!fieldMap[key]) continue;

            const columnName = fieldMap[key];
            if (columnName === 'active') {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value ? 1 : 0);
            } else {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value);
            }
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE email_api SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        const emailApi = await adminEmailApiById(id);
        if (!emailApi) return { success: false, error: 'Failed to get Email API', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: emailApi,
            message: 'Email API updated successfully',
        };

    } catch (err) {
        console.error('updateEmailAPI database error', err);
        throw err;
    }
}

// delete
export async function deleteEmailAPI(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id FROM email_api WHERE id = ?`)
            .bind(id)
            .first();

        if (!existing) return { success: false, error: "Email API not found", code: 'NOT_FOUND' };

        const linkedTrigger = await db
            .prepare(`SELECT id FROM trigger_email WHERE api_id = ? LIMIT 1`)
            .bind(id)
            .first();

        if (linkedTrigger) return { success: false, error: 'Email API has triggers linked and cannot be deleted', code: 'HAS_DEPENDENTS' };

        await db.prepare(`DELETE FROM email_api WHERE id = ?`).bind(id).run();

        return {
            success: true,
            message: "Email API deleted successfully",
        };

    } catch (err) {
        console.error('deleteEmailAPI database error', err);
        throw err;
    }
}

// by id
async function adminEmailApiById(id: number): Promise<IEmailApiTranslated | null> {
    try {
        const db = getDb();
        const emailApi = await db
            .prepare(`SELECT * FROM email_api WHERE id = ?`)
            .bind(id)
            .first<IEmailApiTranslated>();

        if (!emailApi) return null;

        return {
            id: emailApi.id,
            api_server: emailApi.api_server,
            api_key: emailApi.api_key,
            active: Boolean(emailApi.active),
            title: emailApi.api_server,
            translation_language: DEFAULT_LANGUAGE,
        };

    } catch (err) {
        console.error('adminEmailApiById database error', err);
        throw err;
    }
}


// TRIGGER


// list
export async function adminAllTriggerEmail(locale?: string): Promise<ITriggerEmail[]> {
    try {
        const db = getDb();

        const { results } = await db
            .prepare(`
                SELECT 
                    t.id, 
                    t.trigger_type,
                    t.email,
                    t.api_id,
                    t.active
                FROM trigger_email t
                ORDER BY t.active DESC, t.trigger_type ASC`)
            .all();

        return results.map((row: any) => ({
            ...row,
            active: Boolean(row.active),
            subject: row.trigger_type,
            body: '',
            translation_language: locale ?? DEFAULT_LANGUAGE,
        })) as ITriggerEmail[];

    } catch (err) {
        console.error('adminAllTriggerEmail database error', err);
        throw err;
    }
}

// by type
interface TriggerEmailWithApiKey extends ITriggerEmail { api_key: number; }
export async function adminTriggerEmailByType(type: string): Promise<TriggerEmailWithApiKey | null> {
    try {
        const db = getDb();

        const trigger = await db
            .prepare(`
                SELECT
                t.email,
                t.api_id,
                e.api_key
                FROM trigger_email t
                LEFT JOIN email_api e
                ON t.api_id = e.id
                WHERE trigger_type = ?`)
            .bind(type)
            .first<TriggerEmailWithApiKey>();

        if (!trigger) return null;

        return {
            id: trigger.id,
            trigger_type: trigger.trigger_type,
            email: trigger.email,
            api_id: trigger.api_id,
            active: Boolean(trigger.active),
            api_key: trigger.api_key
        };

    } catch (err) {
        console.error('adminTriggerEmailByType database error', err);
        throw err;
    }
}

// create
export async function createTriggerEmail(data: ICreateTriggerEmailPayload): Promise<IResult<ITriggerEmail>> {
    try {
        const db = getDb();

        if (!data.trigger_type || !data.email) return { success: false, error: "Trigger type and email is required", code: 'VALIDATION_ERROR' };

        const existing = await db
            .prepare(`SELECT 1 FROM trigger_email WHERE trigger_type = ? AND email = ?`)
            .bind(data.trigger_type, data.email)
            .first();

        if (existing) return { success: false, error: "A trigger email with this type and email already exists", code: 'DUPLICATE' };

        const result = await db
            .prepare(`INSERT INTO trigger_email (trigger_type, email, api_id, active) VALUES (?, ?, ?, ?)`)
            .bind(data.trigger_type, data.email, data.api_id ?? null, data.active ? 1 : 0)
            .run();

        const newId = result.meta.last_row_id;

        const trigger = await adminTriggerEmailById(newId);
        if (!trigger) return { success: false, error: 'Failed to get Email trigger', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: trigger,
            message: 'Email trigger created successfully',
        };

    } catch (err) {
        console.error('createTriggerEmail database error', err);
        throw err;
    }
}

// update
export async function updateTriggerEmail(id: number, data: IUpdateTriggerEmailPayload): Promise<IResult<ITriggerEmail>> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id FROM trigger_email WHERE id = ?`)
            .bind(id)
            .first();

        if (!existing) return { success: false, error: "Trigger email not found", code: 'NOT_FOUND' };

        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            trigger_type: 'trigger_type',
            email: 'email',
            api_id: 'api_id',
            active: 'active',
        };

        for (const [key, value] of Object.entries(data)) {
            if (!fieldMap[key]) continue;

            const columnName = fieldMap[key];
            if (columnName === 'active') {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value ? 1 : 0);
            } else {
                fieldsToUpdate.push(`${columnName} = ?`);
                values.push(value);
            }
        }

        if (fieldsToUpdate.length > 0) {
            await db
                .prepare(`UPDATE trigger_email SET ${fieldsToUpdate.join(', ')} WHERE id = ?`)
                .bind(...values, id)
                .run();
        }

        const trigger = await adminTriggerEmailById(id);
        if (!trigger) return { success: false, error: 'Failed to get Email trigger', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            data: trigger,
            message: 'Email trigger updated successfully',
        };

    } catch (err) {
        console.error('updateTriggerEmail database error', err);
        throw err;
    }
}

// delete
export async function deleteTriggerEmail(id: number): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id FROM trigger_email WHERE id = ?`)
            .bind(id)
            .first();

        if (!existing) return { success: false, error: "Trigger email not found", code: 'NOT_FOUND' };

        await db.prepare(`DELETE FROM trigger_email WHERE id = ?`).bind(id).run();

        return {
            success: true,
            message: "Trigger email deleted successfully",
        };

    } catch (err) {
        console.error('deleteTriggerEmail database error', err);
        throw err;
    }
}

// by id
async function adminTriggerEmailById(id: number): Promise<ITriggerEmail | null> {
    try {
        const db = getDb();
        const trigger = await db
            .prepare(`SELECT * FROM trigger_email WHERE id = ?`)
            .bind(id)
            .first<ITriggerEmail>();

        if (!trigger) return null;

        return {
            id: trigger.id,
            trigger_type: trigger.trigger_type,
            email: trigger.email,
            api_id: trigger.api_id,
            active: Boolean(trigger.active),
        };

    } catch (err) {
        console.error('adminTriggerEmailById database error', err);
        throw err;
    }
}
