import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import SlideComponent from './SlideComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('SlideAdmin');
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

export default function ProductPage() {
    return <SlideComponent />;
}
