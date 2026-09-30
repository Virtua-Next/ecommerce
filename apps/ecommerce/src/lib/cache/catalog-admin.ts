import { revalidateTag, unstable_cache } from 'next/cache';

import { ICreateBrandPayload, IUpdateBrandPayload } from '@/lib/schemas/brand';
import { adminAllBrands } from '@/lib/db/brand-admin';

import { ICreateCategoryPayload, IUpdateCategoryPayload } from '@/lib/schemas/category';
import { adminAllCategories } from '@/lib/db/category-admin';

import type { ICreateProductPayload, IUpdateProductPayload } from '@/lib/schemas/product';



// ============ BRANDS ============


// list all
const getCachedAdminBrandsInternal = unstable_cache(
    async (locale: string) => adminAllBrands(locale),
    ['admin-brands'],
    { revalidate: false, tags: ['admin-brands'] }
);

export async function getCachedAdminBrands(locale: string) {
    return getCachedAdminBrandsInternal(locale);
}

// create
export async function createBrand(data: ICreateBrandPayload) {
    const { createBrand } = await import('@/lib/db/brand-admin');
    const result = await createBrand(data);
    if (result.success) {
        revalidateTag('admin-brands', { expire: 0 });
        revalidateTag('brands', { expire: 0 });
    }
    return result;
}

// update
export async function updateBrand(id: number, data: IUpdateBrandPayload) {
    const { updateBrand } = await import('@/lib/db/brand-admin');
    const result = await updateBrand(id, data);
    if (result.success) {
        revalidateTag('admin-brands', { expire: 0 });
        revalidateTag('brands', { expire: 0 });
    }
    return result;
}

// delete
export async function deleteBrand(id: number) {
    const { deleteBrand } = await import('@/lib/db/brand-admin');
    const result = await deleteBrand(id);
    if (result.success) {
        revalidateTag('admin-brands', { expire: 0 });
        revalidateTag('brands', { expire: 0 });
    }
    return result;
}


// ============ CATEGORIES ============


// list all
const getCachedAdminCategoriesInternal = unstable_cache(
    async (locale: string) => adminAllCategories(locale),
    ['admin-categories'],
    { revalidate: false, tags: ['admin-categories'] }
);

export async function getCachedAdminCategories(locale: string) {
    return getCachedAdminCategoriesInternal(locale);
}

// create
export async function createCategory(data: ICreateCategoryPayload) {
    const { createCategory } = await import('@/lib/db/category-admin');
    const result = await createCategory(data);
    if (result.success) {
        revalidateTag('admin-categories', { expire: 0 });
        revalidateTag('categories', { expire: 0 });
    }
    return result;
}

// update
export async function updateCategory(id: number, data: IUpdateCategoryPayload) {
    const { updateCategory } = await import('@/lib/db/category-admin');
    const result = await updateCategory(id, data);
    if (result.success) {
        revalidateTag('admin-categories', { expire: 0 });
        revalidateTag('categories', { expire: 0 });
        revalidateTag(`category:${id}`, { expire: 0 });
    }
    return result;
}

// delete
export async function deleteCategory(id: number) {
    const { deleteCategory } = await import('@/lib/db/category-admin');
    const result = await deleteCategory(id);
    if (result.success) {
        revalidateTag('admin-categories', { expire: 0 });
        revalidateTag('categories', { expire: 0 });
        revalidateTag(`category:${id}`, { expire: 0 });
    }
    return result;
}


// ============ PRODUCTS ============


// create
export async function createProduct(data: ICreateProductPayload) {
    const { createProduct } = await import('@/lib/db/product-admin');
    const result = await createProduct(data);
    if (result.success) {
        revalidateTag('products', { expire: 0 });
    }

    return result;
}

// update
export async function updateProduct(id: number, data: IUpdateProductPayload) {
    const { updateProduct } = await import('@/lib/db/product-admin');
    const result = await updateProduct(id, data);
    if (result.success) {
        revalidateTag('products', { expire: 0 });
        revalidateTag(`product:${id}`, { expire: 0 });
    }

    return result;
}

// delete
export async function deleteProduct(id: number) {
    const { deleteProduct } = await import('@/lib/db/product-admin');
    const result = await deleteProduct(id);
    if (result.success) {
        revalidateTag('products', { expire: 0 });
        revalidateTag(`product:${id}`, { expire: 0 });
    }

    return result;
}
