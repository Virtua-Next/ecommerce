'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Sanitize } from '@/components/Sanitizer/Sanitizer';
import Image from 'next/image';
import { buildImageUrl, isExternalUrl, formatPrice, apiFetch, extractData } from '@/lib/utils';
import { buildProductWhatsAppUrl } from '@/lib/utils';
import { IProductTranslated, IProductImage } from '@/lib/schemas/product';
import { AddToCart } from '@/components/AddToCart/AddToCart'
import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import { useConfig } from '@/context/ConfigContext';
import { Link, useRouter } from '@/i18n/navigation'
import { IConfig } from '@/lib/schemas/config';


export default function ClientProductPage({ initialProduct }: { initialProduct: IProductTranslated }) {
    const t = useTranslations('CatalogProduct');
    const locale = useLocale();
    const params = useParams();
    const { config } = useConfig();

    const [product, setProduct] = useState<IProductTranslated | null>(initialProduct);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!initialProduct && params.slug) {
            const fetchProduct = async () => {
                setLoading(true);
                try {
                    const data = await apiFetch(`/api/product/${params.slug}?locale=${locale}`);
                    if (data.success) {
                        const product = extractData(data, 'object');
                        setProduct(product);
                    }
                } catch (error) {
                    console.error('Failed to fetch products:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [initialProduct, params.slug, locale]);

    const selectedImage = useMemo(() => {
        if (!product) return null;
        return product.images?.find((img: IProductImage) => img.image_primary) || product.images?.[0] || null;
    }, [product]);

    if (loading) return <LoadingSkeleton />;
    if (!product) return <ErrorPage message={t('notFound')} />;

    return (
        <>
            <div className='container'>
                <Breadcrumb items={[{ name: t('home'), href: '/' }, { name: product?.title || t('currentProduct') }]} className="my-4" />
            </div>
            <div className="bg-card rounded max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 my-12">
                <div className="grid md:grid-cols-2 gap-12">
                    <ProductGallery product={product} primaryImage={selectedImage as IProductImage} config={config as IConfig} />
                    <ProductInfo product={product} config={config as IConfig} />
                    <ProductSpecifications product={product} />
                </div>
            </div>
        </>
    );
}

const LoadingSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
        <div className="grid md:grid-cols-2 gap-12">
            <div className="rounded-xl aspect-square bg-gray-200 dark:bg-gray-700"></div>
            <div className="space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-8"></div>
            </div>
        </div>
    </div>
);

const ErrorPage = ({ message }: { message: string }) => {
    const t = useTranslations('CatalogProduct');
    return (
        <div className="text-center mt-10">
            <h3 className="mt-2 text-lg font-medium text-primary">{t('unavailable')}</h3>
            <p className="mt-1 text-sm text-secondary">{message}</p>
            <div className="mt-6 mb-5">
                <Link prefetch={false} href="/" className="px-4 py-2 bg-button hover:bg-buttonHover border border-border rounded-md">
                    {t('seeOtherProducts')}
                </Link>
            </div>
        </div>
    );
}

const ProductGallery = ({ product, primaryImage, config }: { product: IProductTranslated; primaryImage?: IProductImage; config: IConfig }) => {
    const [selectedImage, setSelectedImage] = useState<IProductImage | null>(primaryImage || null);

    const imgSrc = useMemo(() => {
        if (!selectedImage) return buildImageUrl(config?.cdn, null);
        return buildImageUrl(config?.cdn, selectedImage.image_path);
    }, [selectedImage, config]);

    const handleSelect = (imagem: IProductImage) => {
        setSelectedImage(imagem);
    };

    return (
        <div className="space-y-4">
            {/* Primary image */}
            <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 border border-border rounded-xl overflow-hidden">
                <Image src={imgSrc} alt={product.title} fill className="object-contain" priority unoptimized={isExternalUrl(imgSrc)} sizes="(max-width: 768px) 100vw, 50vw" />
            </div>

            {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-8 gap-2">
                    {product.images.map((imagem) => (
                        <Thumbnail key={imagem.id} image={imagem} product={product} isSelected={selectedImage?.id === imagem.id} onSelect={() => handleSelect(imagem)} config={config} />
                    ))}
                </div>
            )}
        </div>
    );
};

const Thumbnail = ({ image, product, isSelected, onSelect, config }: { image: IProductImage; product: IProductTranslated; isSelected: boolean; onSelect: () => void; config: IConfig; }) => {
    const thumbSrc = useMemo(
        () => buildImageUrl(config?.cdn, image.image_path),
        [image.image_path, config]
    );

    return (
        <div className={`relative aspect-square bg-gray-50 dark:bg-gray-800 rounded overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`} onClick={onSelect}>
            <Image src={thumbSrc} alt={`${product.title} - ${image.image_order}`} fill className="object-cover" unoptimized={isExternalUrl(thumbSrc)} sizes="(max-width: 768px) 20vw, 10vw" />
        </div>
    );
};

const ProductInfo = ({ product, config }: { product: IProductTranslated; config: IConfig }) => {
    const t = useTranslations('CatalogProduct');
    const router = useRouter();
    const locale = useLocale();

    const formatedPrice = formatPrice(Number(product.price), locale, config.currency);
    const formadedPromoPrice = product.promotional_price ? formatPrice(Number(product.promotional_price), locale, config.currency) : null;
    const whatsAppUrl = useMemo(() => {
        if (!config?.whatsapp) return null;
        return buildProductWhatsAppUrl(config.whatsapp, config.domain, product, formatedPrice, t);
    }, [config?.whatsapp, config?.domain, product, formatedPrice, t]);

    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <div>
                <p className='text-sm'>{t('code')}: <span className='text-primary'>{product.sku}</span></p>
            </div>
            <div className="pt-4">
                <h2 className="text-lg mb-2">{t('description')}:</h2>
                <Sanitize html={product.product_description || t('noDescription')} />
            </div>

            {!config || config?.show_price ? (
                <>
                    <div className='py-2 flex items-baseline gap-2'>
                        {formadedPromoPrice ? (
                            <>
                                <span className="text-xl text-secondary/70 line-through">{formatedPrice}</span>
                                <span className="text-2xl font-bold text-primary">{formadedPromoPrice}</span>
                            </>
                        ) : (
                            <span className="text-2xl font-bold text-primary">{formatedPrice}</span>
                        )}
                    </div>

                    {product?.stock && product.stock > 0 ? (
                        <AddToCart productId={product.id as number} isGrid={false} />
                    ) : (
                        <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded-full">
                            {t('outOfStock')}
                        </span>
                    )}
                </>
            ) : (
                <div className='flex flex-col py-8 gap-2'>
                    {whatsAppUrl && (
                        <>
                            <p>{t('whatsAppHint')}</p>
                            <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                                <p className='inline-flex p-2 rounded text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white hover:dark:bg-green-600 dark:hover:text-white transition-colors'>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span className='text-xl ml-2'>{t('whatsapp')}</span>
                                </p>
                            </a>
                        </>
                    )}
                </div>
            )}

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1">
                    {t('category')}:
                    <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/category/[slug]', params: { slug: String(product.category_slug) } })} href={{ pathname: '/category/[slug]', params: { slug: String(product.category_slug) } }} className="text-link hover:underline transition-colors">
                        {product.category_title}
                    </Link>
                </span>

                <span className="inline-flex items-center gap-1">
                    {t('brand')}:
                    <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/brand/[slug]', params: { slug: String(product.brand_slug) } })} href={{ pathname: '/brand/[slug]', params: { slug: String(product.brand_slug) } }} className="text-link hover:underline transition-colors">
                        {product.brand_title}
                    </Link>
                </span>
            </p>
        </div>
    );
}

const ProductSpecifications = ({ product }: { product: IProductTranslated }) => {
    const t = useTranslations('CatalogProduct');
    const isEmpty = !product.specification || product.specification === '<p></p>';

    return (
        <div className="my-10 md:col-span-2 rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
                <h2 className="text-xl font-semibold">{t('specifications')}</h2>
            </div>

            <div className="px-6 py-5">
                {isEmpty ? (
                    <div className="text-center py-8">
                        <p>{t('noSpecifications')}</p>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Sanitize html={String(product.specification)} />
                    </div>
                )}
            </div>
        </div>
    );
};
