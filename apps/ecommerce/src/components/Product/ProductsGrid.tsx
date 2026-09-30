'use client'
import React from 'react';
import { useConfig } from '@/context/ConfigContext';
import Image from 'next/image';
import Pagination from './Pagination'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { IProductTranslated } from '@/lib/schemas/product'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl'
import { buildImageUrl, isExternalUrl, formatPrice, extractData } from '@/lib/utils';
import { buildProductWhatsAppUrl, apiFetch } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import { AddToCart } from '@//components/AddToCart/AddToCart'
import { Button } from '@/components/ui/button';
import { IConfig } from '@/lib/schemas/config';
import { DEFAULT_CURRENCY } from '@/lib/constants';


const GRID_COLS_CLASS: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
};

export default function ProductGrid() {
    const t = useTranslations('Catalog');
    const buttonRef = useRef(null)
    const { addToCart } = useCart();
    const { config } = useConfig();
    const pathName = usePathname()
    const params = useParams<{ slug?: string }>();
    const locale = useLocale();
    const [products, setProducts] = useState<IProductTranslated[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1)
    const productsPerRow = config?.products_per_row || 4;
    const productsPerPage = config?.products_per_page || 12;
    const showPrice = config?.show_price == null ? true : (typeof config.show_price === 'boolean' ? config.show_price : config.show_price > 0);

    const filters = useMemo(() => {

        if (!pathName) return { category: undefined, brand: undefined };

        if (pathName.startsWith('/category/') && params?.slug) return { category: params.slug as string, brand: undefined };

        if (pathName.startsWith('/brand/') && params?.slug) return { brand: params.slug as string, category: undefined };

        return { category: undefined, brand: undefined };

    }, [pathName, params?.slug]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);

        const queryParams = new URLSearchParams({ locale, page: String(currentPage), limit: String(productsPerPage) });
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.brand) queryParams.append('brand', filters.brand);
        try {
            const data = await apiFetch(`/api/product?${queryParams}`);
            if (!data.success) {
                setProducts([]);
                setTotal(0);
            }
            setProducts(extractData(data, 'array') || []);
            setTotal(data.pagination?.total || 0);
        } catch (error) {
            setProducts([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, filters, locale, productsPerPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const gridClass = useMemo(() => {
        const effectiveColumns = Math.min(Math.max(1, productsPerRow), 6);
        const colsClass = GRID_COLS_CLASS[effectiveColumns] || 'lg:grid-cols-4';
        return `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${colsClass} gap-8`;
    }, [productsPerRow]);

    if (loading) {
        return (
            <div className={`${gridClass} py-10`}>
                {[...Array(productsPerPage)].map((_, i) => (
                    <div key={i} className="rounded-xl shadow-sm overflow-hidden animate-pulse">
                        <div className="relative pt-[100%] overflow-hidden bg-card"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-4 bg-card rounded w-3/4"></div>
                            <div className="h-4 bg-card rounded w-1/2"></div>
                            <div className="h-6 bg-card rounded w-1/4"></div>
                            <div className="h-10 bg-card rounded mt-4"></div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-10">
                <h3 className="text-lg font-medium">{t('empty.title')}</h3>
                <p className="mt-2">{t('empty.subtitle')}</p>
            </div>
        )
    }

    const pageHeading = pathName.includes('/brand')
        ? products[0]?.brand_title || t('ourProducts')
        : pathName.includes('/category')
            ? products[0]?.category_title || t('ourProducts')
            : t('ourProducts');

    const breadcrumbLabel = pathName.includes('/brand')
        ? products[0]?.brand_title || t('brand')
        : pathName.includes('/category')
            ? products[0]?.category_title || t('category')
            : pathName.split('/').pop() || t('page');

    return (
        <>
            <Breadcrumb className="my-4" items={[{ name: t('home'), href: '/' }, ...(pathName !== '/' ? [{ name: breadcrumbLabel }] : [])]} />

            <h2 className="text-3xl font-bold text-center m-8">{pageHeading}</h2>
            <div className={`p-3 rounded-lg w-full ${gridClass}`}>
                {products.map((produto) => (
                    <ProductCard key={produto.id} product={produto} config={config as IConfig} showPrice={showPrice} buttonRef={buttonRef} addToCart={addToCart} />
                ))}
            </div>
            <Pagination totalItems={total} itemsPerPage={productsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} className="mt-8" />
        </>
    )
}

const ProductCard = React.memo(function ProductCard({ product, config, showPrice, buttonRef, addToCart }: { product: IProductTranslated; config: IConfig; showPrice: boolean; buttonRef: React.RefObject<any>; addToCart: (id: number) => void }) {
    const t = useTranslations('Catalog');
    const router = useRouter();
    const locale = useLocale();
    const formatedPrice = formatPrice(Number(product.price), locale, config?.currency || DEFAULT_CURRENCY);
    const formatedPromoPrice = product.promotional_price ? formatPrice(Number(product.promotional_price), locale, config?.currency || DEFAULT_CURRENCY) : null;

    const whatsAppUrl = useMemo(() => {
        if (!config?.whatsapp) return null;
        return buildProductWhatsAppUrl(config.whatsapp, config.domain, product, formatedPrice, t);
    }, [config?.whatsapp, config?.domain, product, formatedPrice, t]);

    return (
        <div className="bg-card/70 min-w-0 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-border hover:bg-hover/10">
            <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/product/[slug]', params: { slug: product.slug } })} href={{ pathname: '/product/[slug]', params: { slug: product.slug } }} className="block group flex flex-col justify-around cursor-pointer">
                <ProductImage product={product} config={config} />
            </Link>

            <div className="px-2 pt-8 flex justify-between mb-1">
                <span className="text-xs font-medium px-2 py-1">{t('brand')}</span>
                <span className="text-xs font-medium px-2 py-1">{t('category')}</span>
            </div>

            <div className="px-2 pb-8 flex justify-between mb-1">
                <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/brand/[slug]', params: { slug: product.brand_slug as string } })} href={{ pathname: '/brand/[slug]', params: { slug: product.brand_slug as string } }} className="block group cursor-pointer">
                    <span className="text-xs font-medium px-2 py-1 text-link hover:underline">
                        {product.brand_title || t('noBrand')}
                    </span>
                </Link>
                <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/category/[slug]', params: { slug: product.category_slug as string } })} href={{ pathname: '/category/[slug]', params: { slug: product.category_slug as string } }} className="block group cursor-pointer">
                    <span className="text-xs font-medium text-link px-2 py-1 hover:underline">
                        {product.category_title || t('noCategory')}
                    </span>
                </Link>
            </div>

            <h3 className="text-center px-2 py-8 text-lg font-semibold leading-tight line-clamp-2 min-h-[6.8rem]">{product.title}</h3>

            {showPrice ? (
                <div className="flex text-base px-2 py-8 justify-center gap-1 items-center">
                    {formatedPromoPrice ? (
                        <>
                            <span className="text-secondary/70 line-through">{formatedPrice}</span>
                            <span className="font-bold text-primary">{formatedPromoPrice}</span>
                        </>
                    ) : (
                        <span className="font-bold text-primary">{formatedPrice}</span>
                    )}

                    {product.stock && product.stock > 0 ? (
                        <Button variant={'theme'} size={'lg'} className="pt-1.5 px-3 rounded-full text-xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer shadow-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product.id as number); }}>
                            <AddToCart productId={product.id as number} isGrid={true} fromButtonRef={buttonRef} />
                        </Button>
                    ) : (
                        <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded-full">{t('outOfStock')}</span>
                    )}
                </div>
            ) : (
                whatsAppUrl && (
                    <div className="px-2 py-8 flex items-center justify-center gap-2">
                        <a href={whatsAppUrl} target="_blank">
                            <p className='inline-flex p-2 rounded text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white hover:dark:bg-green-600 dark:hover:text-white'>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                <span className='text-xl ml-2'>{t('whatsapp')}</span>
                            </p>
                        </a>
                    </div>
                )
            )}

            <Button variant={'theme'} size={'full'} className='mb-4 ml-4 mr-4 max-w-[90%]'>
                <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/product/[slug]', params: { slug: product.slug } })} href={{ pathname: '/product/[slug]', params: { slug: product.slug } }} >
                    <div className=",transition-colors font-medium flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
                        </svg>
                        {t('viewProduct')}
                    </div>
                </Link>
            </Button>
        </div>
    );
});

const ProductImage = React.memo(function ProductImage({ product, config }: { product: IProductTranslated; config: IConfig }) {
    const [isHovered, setIsHovered] = useState(false);

    const imgSrc = useMemo(() => {
        const primaryImage = product.images?.find(img => img.image_primary);
        const firstImage = product.images?.[0];
        const imageFound = primaryImage?.image_path || firstImage?.image_path;
        return buildImageUrl(config?.cdn, imageFound);
    }, [product.images, config?.cdn]);

    return (
        <div className="cursor-pointer relative pt-[100%] overflow-hidden bg-gray-100 dark:bg-gray-800" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <Image src={imgSrc} unoptimized={isExternalUrl(imgSrc)} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                alt={product.brand_title ? `${product.title} - ${product.brand_title}` : product.title}
                className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : 'scale-100'}`}
            />
        </div>
    );
});
