import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ClientProductPage from '@/components/Product/ClientProductPage';
import { notFound } from 'next/navigation';
import Slider from '@/components/Slider/Slider';
import Header from "@/components/Header/Header";
import Footer from '@/components/Footer/Footer';
import WhatsApp from "@/components/WhatsApp/WhatsApp";
import { buildImageUrl } from '@/lib/utils';
import { getCachedConfig } from '@/lib/cache/config';
import { getCachedProductBySlug } from '@/lib/cache/catalog';
import { DEFAULT_LANGUAGE, NO_FAVICON } from '@/lib/constants';
import { buildEntityMetadata } from '@/lib/metadata-generator';
// export const dynamic = 'force-dynamic';


interface RouteParams {
    params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
    const t = await getTranslations('CatalogProduct');

    const { slug, locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const config = await getCachedConfig(effectiveLocale);

    try {
        const product = await getCachedProductBySlug(slug, effectiveLocale);
        if (!product) throw new Error('Product not found');

        return buildEntityMetadata({
            targetType: 'product',
            config,
            locale: effectiveLocale,
            entity: product as any,
            image: (product) => product.images?.find((img: { image_primary: string; }) => img.image_primary)?.image_path ?? product.images?.[0]?.image_path
        });

    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: `${config?.site_name ?? 'Online Shopping'} - ${t('metaTitle')}`,
            description: `${config?.site_name ?? 'Online Shopping'} - ${t('metaDescription')}`,
            icons: { icon: buildImageUrl(config?.cdn, config?.favicon, NO_FAVICON) },
            robots: { index: true, follow: true, nocache: false, googleBot: { index: true, follow: true } },
        };
    }
}

export default async function ProductPage({ params }: RouteParams) {
    const { slug, locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const product = await getCachedProductBySlug(slug, effectiveLocale);

    if (!product || !product.active) notFound();

    return (
        <>
            <Header />
            <Slider />
            <ClientProductPage initialProduct={product} />
            <Footer />
            <WhatsApp />
        </>
    );
}
