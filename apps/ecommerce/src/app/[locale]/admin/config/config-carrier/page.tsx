import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import CarrierComponent from './CarrierComponent';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('CarrierAdmin');
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

export default function CarrierPage() {
    return <CarrierComponent />;
}
