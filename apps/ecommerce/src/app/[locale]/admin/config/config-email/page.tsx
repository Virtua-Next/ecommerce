import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import EmailComponent from './EmailComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('EmailAdmin');
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

export default function EmailPage() {
    return <EmailComponent />;
}
