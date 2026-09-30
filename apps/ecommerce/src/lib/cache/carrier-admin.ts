import { revalidateTag } from 'next/cache';
import { ICreateCarrierPayload, IUpdateCarrierPayload } from '@/lib/schemas/carrier';
import { createCarrier as createCarrierDb, updateCarrier as updateCarrierDb, deleteCarrier as deleteCarrierDb } from '@/lib/db/carrier-admin';


// create
export async function createCarrier(data: ICreateCarrierPayload) {
    const result = await createCarrierDb(data);
    if (result.success) {
        revalidateTag('carriers', { expire: 0 });
    }
    return result;
}


// update
export async function updateCarrier(id: number, data: IUpdateCarrierPayload) {
    const result = await updateCarrierDb(id, data);
    if (result.success) {
        revalidateTag('carriers', { expire: 0 });
        revalidateTag(`carrier:${id}`, { expire: 0 });
    }
    return result;
}


// delete
export async function deleteCarrier(id: number) {
    const result = await deleteCarrierDb(id);
    if (result.success) {
        revalidateTag('carriers', { expire: 0 });
        revalidateTag(`carrier:${id}`, { expire: 0 });
    }
    return result;
}
