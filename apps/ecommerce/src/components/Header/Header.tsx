'use client';
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { X, Menu, User, ChevronDown, LogOut, User as UserIcon, LogIn, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import ThemeToggler from './ThemeToggler';
import CategoryMenu from './CategoryMenu';
import BrandsSubmenu from './BrandSubmenu';
import { useConfig } from '@/context/ConfigContext'
import RenderLogo from '@/components/RenderLogo/RenderLogo';
import { useCartCount } from '@/hooks/useCartCount';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { IUser } from '@/lib/schemas/user';
import { Button } from '@/components/ui/button';


const Header = () => {
    const t = useTranslations('Header');
    const router = useRouter();
    const { config, brands, categories } = useConfig();
    const cartCount = useCartCount();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sticky, setSticky] = useState(false);
    const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);
    const pathname = usePathname();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Sticky navbar: rAF-throttled so we update state at most once per
    // frame instead of on every single scroll event, and `passive: true`
    // so the browser doesn't wait on this handler before scrolling.
    useEffect(() => {
        let ticking = false;
        const handleStickyNavbar = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                setSticky(window.scrollY >= 80);
                ticking = false;
            });
        };

        window.addEventListener("scroll", handleStickyNavbar, { passive: true });
        return () => window.removeEventListener("scroll", handleStickyNavbar);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
        setHoveredDropdown(null);
    }, [pathname]);

    const handleDropdownHover = (menu: string) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setHoveredDropdown(menu);
    };

    return (
        <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${sticky ? 'bg-bg/85 shadow-md backdrop-blur-sm' : 'bg-bg/90 backdrop-blur-lg'}`}>
            <div className="container mx-auto px-4">
                {/* First line - Logo and Utilities */}
                <div className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden p-2 text-gray-700 dark:text-gray-300 rounded-md" onClick={() => setMobileOpen(!mobileOpen)}>
                            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <Link prefetch={false} href={{ pathname: '/' }} className="block cursor-pointer">
                            <RenderLogo />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                            {/* Cart icon */}
                            {!pathname.includes('cart') && config?.show_price ? (
                                <Button variant={'theme'} size={'sm'} className='rounded-full' >
                                    <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/cart' })} href={{ pathname: '/cart' }} className="relative block">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" fill="none" stroke="currentColor" strokeWidth="2" className='w-5 h-5 md:h-6 md:w-6'>
                                            <circle cx="9" cy="21" r="1"></circle>
                                            <circle cx="20" cy="21" r="1"></circle>
                                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                        </svg>
                                        {cartCount > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-green-400 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                {cartCount > 9 ? '9+' : cartCount}
                                            </span>
                                        )}
                                    </Link>
                                </Button>
                            ) : (
                                !config && (
                                    <Button variant={'theme'} size={'sm'} className='rounded-full' >
                                        <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/cart' })} href={{ pathname: '/cart' }} className="relative block">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" fill="none" stroke="currentColor" strokeWidth="2" className='w-5 h-5 md:h-6 md:w-6'>
                                                <circle cx="9" cy="21" r="1"></circle>
                                                <circle cx="20" cy="21" r="1"></circle>
                                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                            </svg>

                                            {cartCount > 0 && (
                                                <span className="absolute -top-2 -right-2 bg-green-400 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                    {cartCount > 9 ? '9+' : cartCount}
                                                </span>
                                            )}
                                        </Link>
                                    </Button>
                                )
                            )}
                            <UserDropdown />
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>

                {/* Second line - Desktop navigation */}
                <nav className="justify-center hidden md:flex items-center h-10 capitalize mb-1" onMouseLeave={() => { if (timerRef.current) clearTimeout(timerRef.current); setHoveredDropdown(null); }}>
                    {/* Brands Dropdown */}
                    {brands && brands.length > 0 && (
                        <div className="relative h-full" onMouseEnter={() => handleDropdownHover('brands')}>
                            <button className={`px-4 h-full flex items-center gap-1 border rounded-full border-border`}>
                                {t('brands')}
                                <ChevronDown size={16} className={`transition-transform ${hoveredDropdown === 'brands' ? 'rotate-180' : ''}`} />
                            </button>

                            {hoveredDropdown === 'brands' && (
                                <div className="absolute left-0 top-full w-56 bg-card shadow-lg rounded-b-md z-50">
                                    <BrandsSubmenu />
                                </div>
                            )}
                        </div>
                    )}

                    {categories && categories.length > 0 && (
                        <>
                            {/* Inline categories (up to 5) */}
                            <CategoryMenu variant="inline" maxItems={5} />

                            {/* Dropdown menu with "+ Categories" if there are more than 5 */}
                            <CategoryMenu variant="dropdown" maxItems={5} />
                        </>
                    )}

                </nav>

                {/* Mobile nav */}
                {mobileOpen && (
                    <div className="md:hidden py-2 border-t border-border">
                        <ul className="space-y-1 bg-card">
                            {brands && brands.length > 0 && (
                                <li className="group">
                                    <details>
                                        <summary className="flex justify-between items-center px-4 py-2 font-medium rounded-md hover:bg-hover cursor-pointer">
                                            {t('brands')}
                                            <ChevronDown size={16} className="group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="pl-4 mt-1">
                                            <BrandsSubmenu />
                                        </div>
                                    </details>
                                </li>
                            )}
                            {categories && categories.length > 0 && (
                                <CategoryMenu variant="mobile" onItemClick={() => setMobileOpen(false)} />
                            )}

                        </ul>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;

export function UserDropdown() {
    const t = useTranslations('Header');
    const router = useRouter();
    const { user, loading } = useConfig()
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    // A user's logged-in state comes straight from context — no need to mirror it into local state with an extra effect.
    const loged: IUser | null = user ?? null;

    // matchMedia only fires when the viewport actually crosses the breakpoint, instead of a `resize` listener that fires continuously
    // (and triggers a state update) on every pixel while the user drags the window.
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 767px)');
        setIsMobile(mql.matches);
        const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            setIsOpen(false);
            window.location.href = '/';
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    if (loading) {
        return (
            <div className="w-8 h-8 rounded-full bg-white dark:bg-dark/90 animate-pulse"></div>
        );
    }

    return (
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
            {/* Container dropdown */}
            <div className="relative">
                <Button variant={'theme'} size={'sm'} className='rounded-full' onClick={() => setIsOpen(!isOpen)}>
                    {loged?.user_name ? (
                        <div className="flex items-center justify-center w-5 h-5 md:h-6 md:w-6">
                            {loged?.user_name.charAt(0).toUpperCase()}
                        </div>
                    ) : (
                        <User size={24} strokeWidth={2} />
                    )}
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 bg-card border border-border">
                        {loged?.user_name ? (
                            <>
                                <div className="px-4 py-2 border-b border-border">
                                    <p className="text-sm font-medium truncate">{loged.user_name}</p>
                                    <p className="text-xs truncate">{loged.email}</p>
                                </div>

                                <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/account' })} href={{ pathname: '/account' }} className="flex items-center px-4 py-2 text-sm hover:bg-hover" onClick={() => setIsOpen(false)}>
                                    <UserIcon size={16} className="mr-2" />
                                    {t('myAccount')}
                                </Link>

                                <button className="flex items-center w-full px-4 py-2 text-sm hover:bg-hover" onClick={handleLogout}>
                                    <LogOut size={16} className="mr-2" />
                                    {t('logout')}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link prefetch={false} href={{ pathname: '/login' }} className="flex items-center px-4 py-2 text-sm hover:bg-hover" onClick={() => setIsOpen(false)}>
                                    <LogIn size={16} className="mr-2" />
                                    {t('login')}
                                </Link>

                                <Link prefetch={false} href={{ pathname: '/register' }} className="flex items-center px-4 py-2 text-sm hover:bg-hover" onClick={() => setIsOpen(false)}>
                                    <UserPlus size={16} className="mr-2" />
                                    {t('signup')}
                                </Link>
                            </>
                        )}

                        {/* ThemeToggler mobile */}
                        {isMobile && (
                            <div className="md:hidden px-4 py-2 border-t border-border hover:bg-hover">
                                <div className="flex items-center justify-between" onClick={() => setIsOpen(false)}>
                                    <span className="text-sm">{t('theme')}</span>
                                    <ThemeToggler />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ThemeToggler  desktop */}
            {!isMobile && (
                <ThemeToggler />
            )}
        </div>
    );
}
