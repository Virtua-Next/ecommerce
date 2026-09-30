import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildImageUrl, getCanonicalUrl } from '@/lib/utils';
import { getCachedConfig } from '@/lib/cache/config'
import { DEFAULT_LANGUAGE, NO_FAVICON, NO_IMAGE, SEGMENT_BY_LOCALE } from '@/lib/constants';
// export const dynamic = 'force-dynamic';


interface RouteParams {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
    const t = await getTranslations('AccountHome');

    const { locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const config = await getCachedConfig(effectiveLocale);

    const canonicalUrl = getCanonicalUrl({ domain: config?.domain, path: SEGMENT_BY_LOCALE['account']?.[effectiveLocale] ?? 'account' });

    const domainUrl = getCanonicalUrl({ domain: config?.domain });
    const imageFallback = getCanonicalUrl({ domain: config?.domain, path: NO_IMAGE });
    const faviconFallback = getCanonicalUrl({ domain: config?.domain, path: NO_FAVICON });

    const faviconUrl = buildImageUrl(config?.cdn, config?.favicon, faviconFallback);
    const ogImageUrl = buildImageUrl(config?.cdn, config?.light_logo || config?.dark_logo, imageFallback);

    return {
        metadataBase: new URL(domainUrl),
        title: `${config?.site_name ?? 'Online Shopping'} - ${t('metaTitle')}`,
        description: `${config?.site_name ?? 'Online Shopping'} - ${t('metaDescription')}`,
        alternates: { canonical: canonicalUrl },
        icons: { icon: faviconUrl },
        openGraph: {
            title: `${config?.site_name ?? 'Online Shopping'} - ${t('metaTitle')}`,
            description: `${config?.site_name ?? 'Online Shopping'} - ${t('metaDescription')}`,
            url: canonicalUrl,
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${config?.site_name ?? 'Online Shopping'} - ${t('metaTitle')}` }],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${config?.site_name ?? 'Online Shopping'} - ${t('metaTitle')}`,
            description: `${config?.site_name ?? 'Online Shopping'} - ${t('metaDescription')}`,
            images: [{ url: ogImageUrl, alt: `${config?.site_name ?? 'Online Shopping'} - ${t('metaTitle')}` }],
            site: config?.domain,
        },
        robots: { index: false, follow: false, nocache: false, googleBot: { index: false, follow: false } },
    };
}

export default async function AccountHome() { return (<></>) }
