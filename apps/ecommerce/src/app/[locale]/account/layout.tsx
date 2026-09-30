import { Link } from '@/i18n/navigation'
import { UserDropdown } from '@/components/Header/Header'
import RenderLogo from '@/components/RenderLogo/RenderLogo'
import { routing } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AccountNavCards } from './AccountNavCards';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';


export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function AccountLayout({ children, params }: { children: React.ReactNode, params: Promise<{ locale: string }> }) {
    const t = await getTranslations('AccountHome');

    return (
        <div className="min-h-screen">
            <header className="shadow-sm p-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link prefetch={false} href="/" className="block">
                            <RenderLogo />
                        </Link>

                        <div className="flex items-center gap-4">
                            <Button variant={'theme'} size={'sm'} className='rounded-full' >
                                <Link prefetch={false} href={{ pathname: '/cart' }} className="relative block">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" fill="none" stroke="currentColor" strokeWidth="2" className='w-5 h-5 md:h-6 md:w-6'>
                                        <circle cx="9" cy="21" r="1"></circle>
                                        <circle cx="20" cy="21" r="1"></circle>
                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                    </svg>
                                </Link>
                            </Button>
                            <UserDropdown />
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="rounded-lg shadow-sm p-6">
                    <AccountNavCards />
                    {children}
                </div>
            </main>

        </div>

    )
}
