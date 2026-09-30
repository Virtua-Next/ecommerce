import { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildImageUrl, getCanonicalUrl } from '@/lib/utils';
import { getCachedConfig } from '@/lib/cache/config';
import { DEFAULT_LANGUAGE, NO_FAVICON, NO_IMAGE, SEGMENT_BY_LOCALE } from '@/lib/constants';
// export const dynamic = 'force-dynamic';


interface RouteParams {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
    const t = await getTranslations('Unauthorized');

    const { locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const config = await getCachedConfig(effectiveLocale);

    const canonicalUrl = getCanonicalUrl({ domain: config?.domain, path: SEGMENT_BY_LOCALE['unauthorized']?.[effectiveLocale] ?? 'unauthorized' });

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

export default async function UnauthorizedPage() {
    const t = await getTranslations('Unauthorized');
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg overflow-hidden border-l-4 border-red-500">
                <div className="text-center mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('restrictAccess')}</h1>
                    <p className="text-gray-600 mt-2">{t('restrictAccessMessage')}</p>
                </div>

                <div className="space-y-4">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">{t('permitionRequired')}</h3>
                                <p className="text-sm text-red-700 mt-1">{t('permitionRequiredMessage')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-6">
                        <Link prefetch={false} href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition duration-150 ease-in-out text-center">Página Inicial</Link>
                        <Link prefetch={false} href="/login" className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md shadow-sm transition duration-150 ease-in-out text-center">Fazer Login</Link>
                    </div>
                </div>
                <div className="mt-8 text-center text-xs text-gray-500">
                    <p>{t('errorCode')}: <span className="font-mono">{t('errorCodeDetails')}</span></p>
                    <p className="mt-1">{t('errorCodeMessage')}</p>
                </div>
            </div>
        </div>
    );
}
