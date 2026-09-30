import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Slider from '@/components/Slider/Slider';
import Header from "@/components/Header/Header";
import Footer from '@/components/Footer/Footer';
import WhatsApp from "@/components/WhatsApp/WhatsApp";
import PageContent from '@/app/[locale]/page/PageContent';
import { buildImageUrl } from '@/lib/utils';
import { getCachedConfig } from '@/lib/cache/config';
import { getCachedPageBySlug } from '@/lib/cache/page';
import { DEFAULT_LANGUAGE, NO_FAVICON } from '@/lib/constants';
import { buildEntityMetadata } from '@/lib/metadata-generator';
// export const dynamic = 'force-dynamic';


interface RouteParams {
    params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
    const t = await getTranslations('Page');

    const { slug, locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const config = await getCachedConfig(effectiveLocale);

    try {
        const page = await getCachedPageBySlug(slug, effectiveLocale);
        if(!page) throw new Error('Page not found');
        
        return buildEntityMetadata({ targetType: 'page', config, locale: effectiveLocale, entity: page as any, image: 'page_image' as string });

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

export default async function Page({ params }: RouteParams) {
    const { slug, locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const page = await getCachedPageBySlug(slug, effectiveLocale);

    if (!page || !page.active) notFound();

    return (
        <>
            <Header />
            <Slider />
            <PageContent page={page} />
            <Footer />
            <WhatsApp />
        </>
    );
}
