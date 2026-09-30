import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from "@/components/Providers/ThemeProvider";
import { ConfigProvider } from '@/context/ConfigContext'
import { Inter } from 'next/font/google';
import GoogleAnalytics from '@/components/GoogleAnalytcs/GoogleAnalytcs';
import { getCachedConfig } from '@/lib/cache/config';
import { getCachedCategories, getCachedBrands } from '@/lib/cache/catalog';
import { getCachedPublicAllSlides, getCachedPublicAllFooters } from '@/lib/cache/site-chrome';
import { DEFAULT_LANGUAGE } from '@/lib/constants';
import { ToastProvider } from '@/components/ToastSystem';
//@ts-ignore
import "@/styles/globals.css"


const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params ?? { locale: undefined };
    const effectiveLocale = locale ?? DEFAULT_LANGUAGE;

    if (!hasLocale(routing.locales, effectiveLocale)) notFound();

    const [config, categories, brands, slides, footer] = await Promise.all([
        getCachedConfig(effectiveLocale),
        getCachedCategories(effectiveLocale),
        getCachedBrands(effectiveLocale),
        getCachedPublicAllSlides(effectiveLocale),
        getCachedPublicAllFooters(effectiveLocale)
    ])

    const messages = await getMessages();

    return (
        <html lang={effectiveLocale} suppressHydrationWarning>
            <body className={`${config?.theme ?? 'theme-pastel'} ${inter.className}`} suppressHydrationWarning>
                <ConfigProvider initialData={{ config: config, products: null, categories: categories, brands: brands, slides: slides, footers: footer, user: null}}>
                    <GoogleAnalytics />
                    <NextIntlClientProvider messages={messages}>
                        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                            <ToastProvider>
                                {children}
                            </ToastProvider>
                        </ThemeProvider>

                    </NextIntlClientProvider>
                </ConfigProvider>
            </body>
        </html>
    );
}
