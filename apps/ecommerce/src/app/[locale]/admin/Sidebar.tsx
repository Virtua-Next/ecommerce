'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaBars, FaBoxOpen, FaShoppingCart, FaUsers, FaBookOpen, FaBriefcase, FaCog, FaImage, FaAnchor, FaGripLines, FaEnvelope, FaTruck, FaMoneyBill, FaAdjust } from 'react-icons/fa';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import AdminSearch from "@/components/Features/admin-search";
import RenderLogo from "@/components/RenderLogo/RenderLogo";
import { UserDropdown } from "@/components/Header/Header";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from 'next-intl';


interface SidebarProps {
    children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
    const t = useTranslations('Sidebar');
    const pathname = usePathname();

    const isActive = (href: string) => pathname === href;

    return (
        <div className="bg-[#F5FAFD] dark:bg-[#222] grid min-h-screen md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            {/** Sidebar */}
            <div className="hidden border-r dark:border-r-gray-700 md:block">
                <div className="flex min-h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 self-center border-b dark:border-b-gray-700 px-4 lg:h-[60px] lg:px-6">
                        <Link prefetch={false} href="/" target="_blank" className="flex items-center gap-2 font-semibold">
                            <RenderLogo />
                        </Link>
                    </div>
                    <div className="flex-1 h-full max-h-screen overflow-y-auto">
                        <nav className="grid items-start px-2 gap-0.5 text-sm font-medium lg:px-4">
                            <Link prefetch={false} href="/admin" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaHome className="h-4 w-4" />
                                {t('dashboard')}
                            </Link>

                            <div className="my-2 border-b dark:border-gray-700"></div>

                            <Link prefetch={false} href="/admin/category" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/category') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaBookOpen className="h-4 w-4" />
                                {t('categories')}
                            </Link>

                            <Link prefetch={false} href="/admin/brand" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/brand') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaBriefcase className="h-4 w-4" />
                                {t('brands')}
                            </Link>

                            <Link prefetch={false} href="/admin/product" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/product') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaBoxOpen className="h-4 w-4" />
                                {t('products')}
                            </Link>

                            <div className="my-2 border-b dark:border-gray-700"></div>

                            <Link prefetch={false} href="/admin/customer" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/customer') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaUsers className="h-4 w-4" />
                                {t('customers')}
                            </Link>

                            <Link prefetch={false} href="/admin/order" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/order') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaShoppingCart className="h-4 w-4" />
                                {t('orders')}
                            </Link>

                            <div className="my-2 border-b dark:border-gray-700"></div>

                            <Link prefetch={false} href="/admin/page" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/page') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaAnchor className="h-4 w-4" />
                                {t('pages')}
                            </Link>

                            <Link prefetch={false} href="/admin/slide" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/slide') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaImage className="h-4 w-4" />
                                {t('slides')}
                            </Link>

                            <Link href="/admin/footer" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/footer') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaGripLines className="h-4 w-4" />
                                {t('footers')}
                            </Link>

                            <Link prefetch={false} href="/admin/theme" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/theme') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                <FaAdjust className="h-4 w-4" />
                                {t('themes')}
                            </Link>

                            <div className="my-2 border-b dark:border-gray-700"></div>

                            <div className="flex flex-col gap-2 p-1 border border-red-500">
                                <p className="text-center">{t('settings')}</p>
                                <Link prefetch={false} href="/admin/config/config-site" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/config/config-site') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                    <FaCog className="h-4 w-4" />
                                    {t('site')}
                                </Link>
                                <Link prefetch={false} href="/admin/config/config-email" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/config/config-email') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                    <FaEnvelope className="h-4 w-4" />
                                    {t('emails')}
                                </Link>
                                <Link prefetch={false} href="/admin/config/config-carrier" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/config/config-carrier') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                    <FaTruck className="h-4 w-4" />
                                    {t('carriers')}
                                </Link>

                                <Link prefetch={false} href="/admin/config/config-payment" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-200 hover:dark:bg-gray-700 hover:dark:text-gray-200 ${isActive('/admin/config/config-payment') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                    <FaMoneyBill className="h-4 w-4" />
                                    {t('payments')}
                                </Link>
                            </div>
                        </nav>
                    </div>
                </div>
            </div>

            <div className="flex flex-col">
                <header className="flex flex-shrink-0 h-14 items-center justify-between border-b dark:border-b-gray-700 px-4 lg:h-[60px] lg:px-6">
                    <div className="flex items-center gap-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant={'outline'} size={'sm'} className="shrink-0 md:hidden dark:border-gray-700">
                                    <FaBars className="h-5 w-5" />
                                    <span className="sr-only">{t('toggleMenu')}</span>
                                </Button>
                            </SheetTrigger>

                            <SheetContent side="left" className="flex flex-col dark:border-r-gray-700 bg-gray-100 dark:bg-dark h-auto max-h-[90vh] overflow-y-auto">
                                <nav className="grid gap-2 text-lg font-medium dark:font-light overflow-y-auto">
                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin" className={`mt-5 mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaHome className="h-5 w-5" />
                                            {t('dashboard')}
                                        </Link>
                                    </SheetClose>

                                    <div className="my-2 border-b dark:border-gray-700"></div>

                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/category" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/category') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaBookOpen className="h-5 w-5" />
                                            {t('categories')}
                                        </Link>
                                    </SheetClose>

                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/brand" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/brand') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaBriefcase className="h-5 w-5" />
                                            {t('brands')}
                                        </Link>
                                    </SheetClose>

                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/product" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/product') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaBoxOpen className="h-5 w-5" />
                                            {t('products')}
                                        </Link>
                                    </SheetClose>

                                    <div className="my-2 border-b dark:border-gray-700"></div>

                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/customer" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/customer') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaUsers className="h-5 w-5" />
                                            {t('customers')}
                                        </Link>
                                    </SheetClose>


                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/order" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/order') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaShoppingCart className="h-5 w-5" />
                                            {t('orders')}
                                        </Link>
                                    </SheetClose>


                                    <div className="my-2 border-b dark:border-gray-700"></div>

                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/page" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/page') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaAnchor className="h-5 w-5" />
                                            {t('pages')}
                                        </Link>
                                    </SheetClose>

                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/slide" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/slide') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaImage className="h-5 w-5" />
                                            {t('slides')}
                                        </Link>
                                    </SheetClose>


                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/footer" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/footer') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaGripLines className="h-5 w-5" />
                                            {t('footers')}
                                        </Link>
                                    </SheetClose>

                                    <SheetClose asChild>
                                        <Link prefetch={false} href="/admin/theme" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/theme') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            <FaAdjust className="h-5 w-5" />
                                            {t('themes')}
                                        </Link>
                                    </SheetClose>

                                    <div className="my-2 border-b dark:border-gray-700"></div>

                                    <div className="flex flex-col gap-1 p-1 border border-red-500">
                                        <p className="text-center">{t('settings')}</p>
                                        <SheetClose asChild>
                                            <Link prefetch={false} href="/admin/config/config-site" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/config/config-site') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                <FaCog className="h-4 w-4" />
                                                {t('site')}
                                            </Link>
                                        </SheetClose>

                                        <SheetClose asChild>
                                            <Link prefetch={false} href="/admin/config/config-email" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/config/config-email') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                <FaEnvelope className="h-4 w-4" />
                                                {t('emails')}
                                            </Link>
                                        </SheetClose>

                                        <SheetClose asChild>
                                            <Link prefetch={false} href="/admin/config/config-carrier" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/config/config-carrier') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                <FaTruck className="h-4 w-4" />
                                                {t('carriers')}
                                            </Link>
                                        </SheetClose>

                                        <SheetClose asChild>
                                            <Link prefetch={false} href="/admin/config/config-payment" className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/admin/config/config-payment') && 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                <FaMoneyBill className="h-4 w-4" />
                                                {t('payments')}
                                            </Link>
                                        </SheetClose>

                                    </div>

                                </nav>
                            </SheetContent>
                        </Sheet>

                        <div className={`${!['/admin/config', '/admin/footer', '/admin/slide', '/admin/theme'].some(prefix => pathname.startsWith(prefix)) && (pathname !== '/admin' || pathname.startsWith('/admin/')) ? 'hidden lg:block w-full min-w-[500px]' : 'hidden'}`}>
                            <Suspense>
                                <AdminSearch />
                            </Suspense>
                        </div>
                        <div className="lg:hidden md:hidden sm:block">
                            <Link prefetch={false} href='/' target="_blank">
                                <RenderLogo />
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <UserDropdown />
                        <LanguageSwitcher />
                    </div>

                </header>
                <div>

                </div>
                <main className="flex flex-col py-4 px-2 h-full min-h-screen">
                    {children}
                </main>
            </div>

            <div className='p-4 rounded-lg col-span-1 md:col-span-3 lg:col-span-4 text-center'>
                <Link prefetch={false} className='px-6 py-2 rounded-lg cursor-pointer font-bold text-lg dark:text-gray-400 shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-gray-700' href={'https://virtuanext.com'} target='_blank' title='Virtua Next'>
                    {t('virtuaNext')}
                </Link>
            </div>
        </div>
    );
}
