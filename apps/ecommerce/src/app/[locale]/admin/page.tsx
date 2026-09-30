import type { Metadata } from 'next';
import Dashboard from './Dashboard';
import { getSalesReport } from '@/lib/db/sale-admin';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';


export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('Dashboard');
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

export default async function AdminPage() {
    const sales = await getSalesReport();
    if(!sales) return notFound();
    
    return (
        <Dashboard initialSales={sales} />
    );
}
