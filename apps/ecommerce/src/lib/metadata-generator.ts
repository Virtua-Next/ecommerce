import type { Metadata } from 'next';
import { buildImageUrl, getCanonicalUrl } from '@/lib/utils';
import { SEGMENT_BY_LOCALE, NO_IMAGE, NO_FAVICON } from '@/lib/constants';
import { IEntityVersion } from '@/lib/schemas/metadata';


interface MetadataTranslation {
    title?: string;
    metadata_description?: string;
    keywords?: string;
    og_title?: string;
    og_description?: string;
    og_image?: string;
    x_title?: string;
    x_description?: string;
    x_image?: string;
    robots_directive?: Metadata['robots'];
}

interface EntityWithMetadata {
    id: number | string;
    slug: string;
    title: string;
    active: boolean;
    metadata?: MetadataTranslation;
    versions?: IEntityVersion[]
}

interface BuildEntityMetadataParams<T extends EntityWithMetadata> {
    targetType: string;  // 'page' | 'product' | etc — usado no SEGMENT_BY_LOCALE e nos fallbacks
    config: any;
    locale: string;
    entity: T | null;
    image?: keyof T | ((entity: T) => string | undefined);  // campo de imagem específico da entidade (ex: page_image, product_image)
    noImagePath?: string;
    noFaviconPath?: string;
}

function resolveEntityImage<T extends EntityWithMetadata>(entity: T, image?: keyof T | ((entity: T) => string | undefined)): string | undefined {
    if (!image) return undefined;
    if (typeof image === 'function') return image(entity);
    return entity[image] as unknown as string;
}

export function buildEntityMetadata<T extends EntityWithMetadata>({ targetType, config, locale, entity, image, noImagePath = NO_IMAGE, noFaviconPath = NO_FAVICON }: BuildEntityMetadataParams<T>): Metadata {
    const domainUrl = getCanonicalUrl({ domain: config?.domain });
    const imageFallback = getCanonicalUrl({ domain: config?.domain, path: noImagePath });
    const faviconUrl = buildImageUrl(config?.cdn, config?.favicon, noFaviconPath);

    const defaultTitle = `${config?.site_name ?? 'Online Shopping'} - ${targetType}`;
    const defaultDescription = `${config?.site_name ?? 'Online Shopping'} - Information ${targetType}`;

    // não encontrado ou inativo
    if (!entity || !entity.active) {
        const canonicalUrl = getCanonicalUrl({ domain: config?.domain, path: SEGMENT_BY_LOCALE[targetType]?.[locale] ?? targetType });
        const fallbackImage = buildImageUrl(config?.cdn, config?.light_logo || config?.dark_logo, imageFallback);

        return {
            title: defaultTitle,
            description: defaultDescription,
            keywords: `${targetType} not found`,
            metadataBase: new URL(domainUrl),
            alternates: { canonical: canonicalUrl },
            icons: {
                icon: faviconUrl,
                shortcut: faviconUrl,
                apple: faviconUrl,
                other: { rel: 'apple-touch-icon-precomposed', url: faviconUrl },
            },
            openGraph: {
                title: defaultTitle,
                description: defaultDescription,
                url: canonicalUrl,
                images: [{ url: fallbackImage, width: 1200, height: 630, alt: `${targetType} not found` }],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: defaultTitle,
                description: defaultDescription,
                images: [{ url: fallbackImage, alt: `${targetType} not found` }],
                site: config?.domain,
            },
            robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
        };
    }

    const meta = entity.metadata;
    const versions = entity.versions || [];

    const canonicalUrl = getCanonicalUrl({ domain: config?.domain, path: SEGMENT_BY_LOCALE[targetType]?.[locale] ?? targetType, slug: entity.slug });

    const languages: Record<string, string> = { [locale]: canonicalUrl };
    for (const version of versions) {
        if (version.translation_language !== locale) {
            languages[version.translation_language] = getCanonicalUrl({
                domain: config?.domain,
                path: SEGMENT_BY_LOCALE[targetType]?.[version.translation_language] ?? targetType,
                slug: version.slug,
            });
        }
    }

    const entityImage = resolveEntityImage(entity, image);

    let ogImageUrl = buildImageUrl(config?.cdn, config?.light_logo || config?.dark_logo, imageFallback);
    ogImageUrl = buildImageUrl(config?.cdn, entityImage, ogImageUrl);
    ogImageUrl = buildImageUrl(config?.cdn, meta?.og_image, ogImageUrl);

    let twitterImageUrl = buildImageUrl(config?.cdn, config?.light_logo || config?.dark_logo, imageFallback);
    twitterImageUrl = buildImageUrl(config?.cdn, entityImage, twitterImageUrl);
    twitterImageUrl = buildImageUrl(config?.cdn, meta?.x_image, twitterImageUrl);

    const title = meta?.title || `${config?.site_name} - ${entity.title}` || defaultTitle;
    const description = meta?.metadata_description || `${config?.site_name} - ${entity.title}` || defaultDescription;

    return {
        title,
        description,
        keywords: meta?.keywords || entity.title || defaultTitle,
        metadataBase: new URL(domainUrl),
        alternates: { canonical: canonicalUrl, languages },
        icons: {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
            other: { rel: 'apple-touch-icon-precomposed', url: faviconUrl },
        },
        openGraph: {
            title: meta?.og_title || title,
            description: meta?.og_description || description,
            url: canonicalUrl,
            images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: meta?.og_title || entity.title || title }] : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: meta?.x_title || meta?.og_title || title,
            description: meta?.x_description || meta?.og_description || description,
            images: twitterImageUrl
                ? [{ url: twitterImageUrl, alt: meta?.x_title || meta?.og_title || entity.title || title }]
                : ogImageUrl
                    ? [{ url: ogImageUrl, alt: meta?.og_title || entity.title || title }]
                    : [],
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
