import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import OrderComponent from './OrderComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('OrderAdmin');
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

export default function OrderPage() {
    return <OrderComponent />;
}
