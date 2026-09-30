'use client';
import { usePathname, Link, useRouter } from '@/i18n/navigation';
import { FaUser, FaMapMarkerAlt, FaShoppingBag } from 'react-icons/fa';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useTranslations } from 'next-intl';


export function AccountNavCards() {
    const pathname = usePathname();
    const router = useRouter();
    const isActive = (href: string) => pathname.startsWith(href);
    const t = useTranslations('AccountNavCards');

    const baseClass = 'border border-border bg-card transition-colors hover:bg-hover hover:border-primary/40';
    const activeClass = 'border-primary bg-hover';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">

            <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/account/profile' })} href={{ pathname: '/account/profile' }} className="block">
                <Card className={`${baseClass} ${isActive('/account/profile') && activeClass}`}>
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <FaUser className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle>{t('personalData.title')}</CardTitle>
                            <CardDescription>{t('personalData.subtitle')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>{t('personalData.content')}</CardContent>
                </Card>
            </Link>

            <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/account/address' })} href={{ pathname: '/account/address' }} className="block">
                <Card className={`${baseClass} ${isActive('/account/address') && activeClass}`}>
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <FaMapMarkerAlt className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle>{t('address.title')}</CardTitle>
                            <CardDescription>{t('address.subtitle')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>{t('address.content')}</CardContent>
                </Card>
            </Link>

            <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/account/order' })} href={{ pathname: '/account/order' }} className="block">
                <Card className={`cursor-pointer ${baseClass} ${isActive('/account/order') && activeClass}`}>
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <FaShoppingBag className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle>{t('orders.title')}</CardTitle>
                            <CardDescription>{t('orders.subtitle')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>{t('orders.content')}</CardContent>
                </Card>
            </Link>

        </div>
    );
}
