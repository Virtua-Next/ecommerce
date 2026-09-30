import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import CustomerComponent from './CustomerComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('CustomerAdmin');
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

export default function CstomerPage() {
    return <CustomerComponent />;
}
