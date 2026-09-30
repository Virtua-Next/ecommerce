import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ProductGrid from '@/components/Product/ProductsGrid';
import Slider from '@/components/Slider/Slider';
import Header from "@/components/Header/Header";
import Footer from '@/components/Footer/Footer';
import WhatsApp from "@/components/WhatsApp/WhatsApp";
import { buildImageUrl } from '@/lib/utils';
import { getCachedConfig } from '@/lib/cache/config';
import { getCachedCategoryBySlug } from '@/lib/cache/catalog';
import { DEFAULT_LANGUAGE, NO_FAVICON } from '@/lib/constants';
import { buildEntityMetadata } from '@/lib/metadata-generator';
import { notFound } from 'next/navigation';
// export const dynamic = 'force-dynamic';


interface RouteParams {
    params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
    const t = await getTranslations('CatalogCategory');

    const { slug, locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const config = await getCachedConfig(effectiveLocale);

    try {
        const category = await getCachedCategoryBySlug(slug, effectiveLocale);
        if (!category) throw new Error('Category not found');

        return buildEntityMetadata({ targetType: 'category', config, locale: effectiveLocale, entity: category as any, image: 'category_image' as string });

    } catch (err) {
        console.error('Error generating metadata:', err);
        return {
            title: `${config?.site_name ?? 'Online Shopping'} - ${t('metaTitle')}`,
            description: `${config?.site_name ?? 'Online Shopping'} - ${t('metaDescription')}`,
            icons: { icon: buildImageUrl(config?.cdn, config?.favicon, NO_FAVICON) },
            robots: { index: true, follow: true, nocache: false, googleBot: { index: true, follow: true } },
        };
    }
}


export default async function CategoryPage({ params }: RouteParams) {
    const { slug, locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const category = await getCachedCategoryBySlug(slug, effectiveLocale);
    if (!category || !category.active) notFound();
    return (
        <>
            <Header />
            <Slider />
            <div className="container mx-auto px-4">
                <ProductGrid />
            </div>
            <Footer />
            <WhatsApp />
        </>
    );
}
