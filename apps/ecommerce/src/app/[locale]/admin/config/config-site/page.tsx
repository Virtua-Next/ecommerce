import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import ConfigComponent from './ConfigComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('ConfigAdmin');
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

export default function ConfigPage() {
    return (
        <ConfigComponent />
    );
}
