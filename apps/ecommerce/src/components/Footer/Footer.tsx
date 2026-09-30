'use client'
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useConfig } from '@/context/ConfigContext'
import { Link } from '@/i18n/navigation';
import { IFooterTranslated, parseFooterContent } from "@/lib/schemas/footer";
import { ICON_MAP_FOOTER } from '@/components/IconDropdown/IconDropdown';
import { isExternalUrl } from '@/lib/utils';


const GRID_COLS_CLASS: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
};

function renderLinkItem(url: string | undefined, text: string, className: string) {
    if (!url || url === '#') return <span className={className}>{text}</span>;
    
    if (isExternalUrl(url)) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
                {text}
            </a>
        );
    }
    return (
        <Link prefetch={false} href={{ pathname: url as any }} className={className}>
            {text}
        </Link>
    );
}

function renderFooterContent(footer: IFooterTranslated) {
    try {
        const content = parseFooterContent(footer);
        switch (footer.footer_type) {
            case 'contact':
                return (
                    <ul className="space-y-2">
                        {Array.isArray(content) && content.map((item, index) => {
                            const Icon = item.icon ? ICON_MAP_FOOTER[item.icon] : null;
                            return (
                                <li key={index} className="flex items-start gap-2 text-gray-300">
                                    {Icon && <Icon className="flex-shrink-0 mt-0.5 h-4 w-4 text-blue-200" />}
                                    {renderLinkItem(item.url, item.text, "hover:text-white")}
                                </li>
                            );
                        })}
                    </ul>
                );

            case 'links':
                return (
                    <ul className="space-y-2">
                        {Array.isArray(content) && content.map((item, index) => {
                            const Icon = item.icon ? ICON_MAP_FOOTER[item.icon] : null;
                            return (
                                <li key={index} className="flex items-start gap-2 text-gray-300">
                                    {Icon && <Icon className="flex-shrink-0 mt-0.5 h-4 w-4 text-blue-200" />}
                                    {renderLinkItem(item.url, item.text, "text-gray-300 hover:text-white")}
                                </li>
                            );
                        })}
                    </ul>
                );

            case 'schedule':
                return (
                    <ul className="space-y-2">
                        {Array.isArray(content) && content.map((item, index) => {
                            const Icon = item.icon ? ICON_MAP_FOOTER[item.icon] : null;
                            return (
                                <li key={index} className="flex items-start gap-2 text-gray-300">
                                    {Icon && <Icon className="flex-shrink-0 mt-0.5 h-4 w-4 text-blue-200" />}
                                    <div>
                                        <span className="font-medium">{item.days}: </span><span>{item.hours}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                );

            case 'social_media':
                return (
                    <div className="flex gap-4 justify-center md:justify-start">
                        {Array.isArray(content) && content.map((item, index) => {
                            const Icon = item.icon ? ICON_MAP_FOOTER[item.icon] : null;
                            return (
                                <a key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white" aria-label={item.name}>
                                    {Icon && <Icon className="h-5 w-5" />}
                                </a>
                            );
                        })}
                    </div>
                );

            default:
                return null;
        }
    } catch {
        return null;
    }
}

export default function Footer() {
    const t = useTranslations('Footer');
    const { config, footers } = useConfig();

    const footerItems = useMemo<IFooterTranslated[]>(() => {
        if (!footers) return [];
        return footers
            .filter((f: { active: any }) => f.active)
            .sort((a: { footer_order: number }, b: { footer_order: number }) => a.footer_order - b.footer_order)
            .map((footer) => ({
                ...footer,
                content: parseFooterContent(footer as IFooterTranslated),
            })) as IFooterTranslated[];
    }, [footers]);

    const gridColsClass = GRID_COLS_CLASS[Math.min(Math.max(footerItems.length, 1), 4)] || 'lg:grid-cols-3';

    return (
        <footer className="bg-footer text-white py-12 lg:mt-20 mt-2">
            <div className="container mx-auto px-4">
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridColsClass} gap-8 mb-8`}>
                    {footerItems.map((footer) => (
                        <div key={footer.id} className="flex flex-col gap-3 items-center">
                            <h4 className="text-xl font-bold">{footer.title}</h4>
                            {renderFooterContent(footer)}
                        </div>
                    ))}
                </div>

                <div className="border-t border-border pt-8 text-center text-gray-400 flex flex-col items-center">
                    <p>{t('copyright', { year: new Date().getFullYear(), site: config?.site_name || 'Online Shopping' })}</p>
                    <a href={'https://virtuanext.com'} target="_blank" className="mt-2 cursor-pointer bg-gradient-to-r from-blue-400 via-teal-300 to-green-400 bg-clip-text text-transparent">
                        VirtuaNext
                    </a>
                </div>
            </div>
        </footer>
    );
}
