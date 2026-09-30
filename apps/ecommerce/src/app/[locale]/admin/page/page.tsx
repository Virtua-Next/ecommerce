import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import PageComponent from './PageComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('PageAdmin');
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

export default function ContentPagePage() {
    return <PageComponent />;
}
