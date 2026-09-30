import { revalidateTag } from 'next/cache';
import { ICreateSlidePayload, IUpdateSlidePayload } from '@/lib/schemas/slide';
import { ICreateFooterPayload, IUpdateFooterPayload } from '@/lib/schemas/footer';


// ============ SLIDES ============


// create
export async function createSlide(data: ICreateSlidePayload) {
    const { createSlide } = await import('@/lib/db/slide-admin');
    const result = await createSlide(data);
    if (result.success) {
        revalidateTag('slides', { expire: 0 });
    }
    return result;
}

// update
export async function updateSlide(id: number, data: IUpdateSlidePayload) {
    const { updateSlide } = await import('@/lib/db/slide-admin');
    const result = await updateSlide(id, data);
    if (result.success) {
        revalidateTag('slides', { expire: 0 });
        revalidateTag(`slide:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deleteSlide(id: number) {
    const { deleteSlide } = await import('@/lib/db/slide-admin');
    const result = await deleteSlide(id);
    if (result.success) {
        revalidateTag('slides', { expire: 0 });
        revalidateTag(`slide:${id}`, { expire: 0 });
    }
    return result;
}


// ============ FOOTERS ============


// create
export async function createFooter(data: ICreateFooterPayload) {
    const { createFooter } = await import('@/lib/db/footer-admin');
    const result = await createFooter(data);
    if (result.success) {
        revalidateTag('footers', { expire: 0 });
    }
    return result;
}

// update
export async function updateFooter(id: number, data: IUpdateFooterPayload) {
    const { updateFooter } = await import('@/lib/db/footer-admin');
    const result = await updateFooter(id, data);
    if (result.success) {
        revalidateTag('footers', { expire: 0 });
        revalidateTag(`footer:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deleteFooter(id: number) {
    const { deleteFooter } = await import('@/lib/db/footer-admin');
    const result = await deleteFooter(id);
    if (result.success) {
        revalidateTag('footers', { expire: 0 });
        revalidateTag(`footer:${id}`, { expire: 0 });
    }
    return result;
}
