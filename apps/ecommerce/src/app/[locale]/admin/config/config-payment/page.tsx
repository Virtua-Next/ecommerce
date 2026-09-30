import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import PaymentComponent from './PaymentComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('PaymentAdmin');
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

export default function PaymentPage() {
    return <PaymentComponent />;
}
