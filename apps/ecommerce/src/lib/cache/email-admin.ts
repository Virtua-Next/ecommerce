import { revalidateTag } from 'next/cache';
import { ICreateEmailApiPayload, ICreateTriggerEmailPayload, IUpdateEmailApiPayload, IUpdateTriggerEmailPayload } from '@/lib/schemas/email';


// ============ EMAIL APIs ============


// create
export async function createEmailAPI(data: ICreateEmailApiPayload) {
    const { createEmailAPI } = await import('@/lib/db/email-admin');

    const result = await createEmailAPI(data);
    if (result.success) {
        revalidateTag('email-apis', { expire: 0 });
    }
    return result;
}

// update
export async function updateEmailAPI(id: number, data: IUpdateEmailApiPayload) {
    const { updateEmailAPI } = await import('@/lib/db/email-admin')
    const result = await updateEmailAPI(id, data);
    if (result.success) {
        revalidateTag('email-apis', { expire: 0 });
        revalidateTag(`email-api:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deleteEmailAPI(id: number) {
    const { deleteEmailAPI } = await import('@/lib/db/email-admin');
    const result = await deleteEmailAPI(id);
    if (result.success) {
        revalidateTag('email-apis', { expire: 0 });
        revalidateTag(`email-api:${id}`, { expire: 0 });
    }
    return result;
}


// ============ TRIGGER EMAILS ============


// create
export async function createTriggerEmail(data: ICreateTriggerEmailPayload) {
    const { createTriggerEmail } = await import('@/lib/db/email-admin')
    const result = await createTriggerEmail(data);
    if (result.success) {
        revalidateTag('email-apis', { expire: 0 });
        revalidateTag('trigger-emails', { expire: 0 });
    }
    return result;
}

// update
export async function updateTriggerEmail(id: number, data: IUpdateTriggerEmailPayload) {
    const { updateTriggerEmail } = await import('@/lib/db/email-admin');
    const result = await updateTriggerEmail(id, data);
    if (result.success) {
        revalidateTag('trigger-emails', { expire: 0 });
        revalidateTag(`trigger-email:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deleteTriggerEmail(id: number) {
    const { deleteTriggerEmail } = await import('@/lib/db/email-admin')
    const result = await deleteTriggerEmail(id);
    if (result.success) {
        revalidateTag('trigger-emails', { expire: 0 });
        revalidateTag(`trigger-email:${id}`, { expire: 0 });
    }
    return result;
}
