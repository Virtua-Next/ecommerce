import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import ProductGrid from "@/components/Product/ProductsGrid";
import Slider from "@/components/Slider/Slider";
import WhatsApp from "@/components/WhatsApp/WhatsApp";
import { DEFAULT_LANGUAGE, NO_FAVICON, NO_IMAGE } from "@/lib/constants";
import { getCachedConfig } from "@/lib/cache/config";
import { buildImageUrl, getCanonicalUrl } from "@/lib/utils";
import { Metadata } from "next";
// export const dynamic = 'force-dynamic';


interface RouteParams {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
    const { locale } = await params;
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const config = await getCachedConfig(effectiveLocale);

    const domainUrl = getCanonicalUrl({ domain: config?.domain });
    const imageFallback = getCanonicalUrl({ domain: config?.domain, path: NO_IMAGE });
    const faviconFallback = getCanonicalUrl({ domain: config?.domain, path: NO_FAVICON });

    const faviconUrl = buildImageUrl(config?.cdn, config?.favicon, faviconFallback);
    const logoUrl = buildImageUrl(config?.cdn, config?.light_logo || config?.dark_logo, imageFallback);

    const meta = config?.metadata;
    const title = meta?.title || config?.site_name || 'Online Shopping';
    const description = meta?.metadata_description || config?.site_description || 'Home page';
    const ogImageUrl = buildImageUrl(config?.cdn, meta?.og_image, logoUrl);
    const twitterImageUrl = buildImageUrl(config?.cdn, meta?.x_image, logoUrl);

    return {
        title,
        description,
        keywords: meta?.keywords,
        metadataBase: new URL(domainUrl),
        alternates: { canonical: domainUrl },
        icons: { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl },
        openGraph: {
            title: meta?.og_title || title,
            description: meta?.og_description || description,
            url: domainUrl,
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: meta?.x_title || meta?.og_title || title,
            description: meta?.x_description || meta?.og_description || description,
            images: [{ url: twitterImageUrl, alt: title }],
            site: config?.domain,
        },
        robots: meta?.robots_directive || {
            index: true,
            follow: true,
            nocache: false,
            googleBot: { index: true, follow: true },
        },
    };

}

export default async function HomePage() {
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
    )
}
