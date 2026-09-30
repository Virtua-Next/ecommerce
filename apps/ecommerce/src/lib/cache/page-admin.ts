import { revalidateTag } from 'next/cache';
import { ICreatePagePayload, IUpdatePagePayload } from '@/lib/schemas/page';


// create
export async function createPage(data: ICreatePagePayload) {
    const { createPage } = await import('@/lib/db/page-admin')
    const result = await createPage(data);
    if (result.success) {
        revalidateTag('pages', { expire: 0 });
    }
    return result;
}

// update
export async function updatePage(id: number, data: IUpdatePagePayload) {
    const { updatePage } = await import('@/lib/db/page-admin');
    const result = await updatePage(id, data);
    if (result.success) {
        revalidateTag('pages', { expire: 0 });
        revalidateTag(`page:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deletePage(id: number) {
    const { deletePage } = await import('@/lib/db/page-admin');
    const result = await deletePage(id);
    if (result.success) {
        revalidateTag('pages', { expire: 0 });
        revalidateTag(`page:${id}`, { expire: 0 });
    }
    return result;
}
