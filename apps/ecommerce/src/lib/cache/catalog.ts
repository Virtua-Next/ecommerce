import { getCachedProductBySlug as getCachedProductBySlugDb, publicPaginatedProducts } from '@/lib/db/product';
import { publicAllCategories, getCachedCategoryBySlug as getCachedCategoryBySlugDb } from '@/lib/db/category';
import { publicAllBrands, getCachedBrandBySlug as getCachedBrandBySlugDb } from '@/lib/db/brand';
import { unstable_cache } from 'next/cache';


interface PaginatedProductsOptions {
    locale?: string;
    page: number;
    limit: number;
    category?: string;
    brand?: string;
}


// ============ BRANDS ============


// list all
const getCachedBrandsInternal = unstable_cache(
    async (locale: string) => publicAllBrands(locale),
    [`public-brands`],
    { revalidate: 86400, tags: ['brands'] }
);

export async function getCachedBrands(locale: string) {
    return getCachedBrandsInternal(locale);
}

// by slug
const getCachedBrandBySlugInternal = unstable_cache(
    async (slug: string, locale: string) => getCachedBrandBySlugDb(slug, locale),
    ['brand-slug'],
    {
        revalidate: 86400,
        tags: ['brands']
    }
);

export async function getCachedBrandBySlug(slug: string, locale: string) {
    return getCachedBrandBySlugInternal(slug, locale);
}


// ============ CATEGORIES ============


// list all
const getCachedCategoriesInternal = unstable_cache(
    async (locale: string) => publicAllCategories(locale),
    ['public-categories'],
    { revalidate: 86400, tags: ['categories'] }
);

export async function getCachedCategories(locale: string) {
    return getCachedCategoriesInternal(locale);
}

// by slug
const getCachedCategoryBySlugInternal = unstable_cache(
    async (slug: string, locale: string) => getCachedCategoryBySlugDb(slug, locale),
    ['category-slug'],
    {
        revalidate: 86400,
        tags: ['categories']
    }
);

export async function getCachedCategoryBySlug(slug: string, locale: string) {
    return getCachedCategoryBySlugInternal(slug, locale);
}


// ============ PRODUCTS ============


// list paginated
const getCachedPaginatedProductsInternal = unstable_cache(
    async (options: PaginatedProductsOptions) => publicPaginatedProducts(options),
    ['public-products-paginated'],
    {
        revalidate: 86400,
        tags: ['products']
    }
);

export async function getCachedPaginatedProducts(options: PaginatedProductsOptions) {
    return getCachedPaginatedProductsInternal(options);
}

// by slug
const getCachedProductBySlugInternal = unstable_cache(
    async (slug: string, locale: string) => getCachedProductBySlugDb(slug, locale),
    ['product-slug'],
    {
        revalidate: 86400,
        tags: ['products']
    }
);

export async function getCachedProductBySlug(slug: string, locale: string) {
    return getCachedProductBySlugInternal(slug, locale);
}
