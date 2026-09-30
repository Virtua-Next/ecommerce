'use client'
import Header from "@/components/Header/Header";
import Footer from '@/components/Footer/Footer';
import WhatsApp from "@/components/WhatsApp/WhatsApp";
import { usePathname } from '@/i18n/navigation'


export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    return (
        <>
            <Header />
            <div className="flex w-full items-center justify-center pt-20 pb-20">
                <div className={`w-full ${pathname.includes('/register') ? 'max-w-2xl' : 'max-w-md'}`}>
                    {children}
                </div>
            </div>
            <Footer />
            <WhatsApp />
        </>
    );
}
