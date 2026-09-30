import { AdminConfigProvider } from '@/context/AdminConfigContext';
import { getAdminConfig } from '@/lib/db/config-admin';
import Sidebar from './Sidebar';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ToastSystem';
import { DEFAULT_LANGUAGE } from '@/lib/constants';
// export const dynamic = 'force-dynamic';


//@ts-ignore
import "@/styles/globals.css";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const effectiveLocale = locale || DEFAULT_LANGUAGE;
    const config = await getAdminConfig(effectiveLocale);
  
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AdminConfigProvider initialConfig={config}>
                <Sidebar>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </Sidebar>
            </AdminConfigProvider>
        </ThemeProvider>

    );
}
