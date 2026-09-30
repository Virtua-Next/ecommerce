import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import BrandComponent from './BrandComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('BrandAdmin');
    return {
        title: t('metaTitle'),
        robots: {
            index: false,
            follow: false,
            nocache: true,
            googleBot: { index: false, follow: false },
        },
    };
}

export default function BrandPage() {
    return <BrandComponent />;
}
