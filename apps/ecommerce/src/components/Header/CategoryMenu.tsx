'use client';
import { Link, useRouter } from '@/i18n/navigation'
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useConfig } from '@/context/ConfigContext';
import { useParams } from 'next/navigation';


interface CategoryMenuProps {
    variant?: 'inline' | 'dropdown' | 'mobile';
    maxItems?: number;
    onItemClick?: () => void;
}

const CategoryMenu = ({ variant = 'inline', maxItems = 5, onItemClick }: CategoryMenuProps) => {
    const t = useTranslations('CategoryMenu');
    const router = useRouter();
    const { categories, loading } = useConfig();
    const params = useParams<{ slug?: string }>();
  
    if (loading) return null;

    if (variant === 'mobile') {
        return (
            <div className="w-full bg-card">
                <details className="group">
                    <summary className="flex justify-between items-center px-4 py-2 font-medium rounded-md hover:bg-hover cursor-pointer list-none">
                        {t('categories')}
                        <ChevronDown size={16} className="group-open:rotate-180 transition-transform" />
                    </summary>
                    <ul className="pl-4 mt-1 space-y-1 list-none">
                        {categories?.map((cat) => (
                            <div key={cat.id}>
                                <Link prefetch={false} href={{ pathname: '/category/[slug]', params: { slug: cat.slug } }} className={`block px-4 py-2 rounded-md hover:bg-hover ${cat.slug === params.slug ? 'bg-hover' : ''}`} onClick={onItemClick} >
                                    {cat.title}
                                </Link>
                            </div>
                        ))}
                    </ul>
                </details>
            </div>
        );
    }

    if (variant === 'dropdown' && categories && categories?.length > maxItems) {
        return (
            <div className="relative group h-full list-none">
                <button className="px-4 h-full flex items-center gap-1 border rounded-full border-border">
                    {t('moreCategories')}
                    <ChevronDown size={16} className="transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute left-0 top-full w-56 bg-card shadow-lg rounded-b-md z-50 p-2 hidden group-hover:block">
                    {categories.slice(maxItems).map((cat) => (
                        <div key={cat.id} className="list-none">
                            <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/category/[slug]', params: { slug: cat.slug } })} href={{ pathname: '/category/[slug]', params: { slug: cat.slug } }} className={`block px-4 py-2 hover:bg-hover rounded-md ${cat.slug === params.slug ? 'bg-hover' : ''}`}>
                                {cat.title}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <>
                {categories?.slice(0, maxItems).map((cat) => (
                    <div key={cat.id} className="h-full list-none">
                        <Link prefetch={false} onMouseEnter={() => router.prefetch({ pathname: '/category/[slug]', params: { slug: cat.slug } })} href={{ pathname: '/category/[slug]', params: { slug: cat.slug } }} className={`px-4 h-full flex items-center border-b-2 ${cat.slug === params.slug ? 'border-primary' : 'border-transparent hover:border-primary'}`}>
                            {cat.title}
                        </Link>
                    </div>
                ))}
            </>
        );
    }
};

export default CategoryMenu;
