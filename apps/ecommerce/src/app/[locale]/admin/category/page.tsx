import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import CategoryComponent from './CategoryComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('CategoryAdmin');
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

export default function CategoryPage() {
    return <CategoryComponent />;
}
