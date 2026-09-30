import { updateConfig as updateConfigDb } from '@/lib/db/config-admin';
import { revalidateTag } from 'next/cache';
import { IUpdateConfigPayload } from '@/lib/schemas/config';


// update
export async function updateConfig(data: IUpdateConfigPayload) {
    const result = await updateConfigDb(data);
    if (result.success) {
        revalidateTag('config', { expire: 0 });
    }
    return result;
}
