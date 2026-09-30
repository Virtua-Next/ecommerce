'use client';
import { useConfig } from '@/context/ConfigContext';
import { Link, usePathname, useRouter } from '@/i18n/navigation'


const BrandsSubmenu = () => {
    const router = useRouter();
    const { brands, loading } = useConfig();
    const pathName = usePathname();


    if (loading) return null;

    return (
        <>
            {brands?.map((bra: any) => (
                <li key={bra.id} className={`flex-shirink-0 mx-1 my-1 list-none`}>
                    <Link prefetch={false} onMouseEnter={() => router.prefetch({pathname: '/brand/[slug]', params: {slug: bra.slug}})} href={{pathname: '/brand/[slug]', params: {slug: bra.slug}}} className={`block px-4 py-2 hover:bg-hover rounded-md transition-colors ${pathName === `/brand/[slug]` ? 'bg-hover' : ''}`}>
                        {bra.title}
                    </Link>
                </li>
            ))}
        </>
    );
};

export default BrandsSubmenu;
