import Link from 'next/link';
import { FaChevronRight } from 'react-icons/fa';


interface BreadcrumbItem {
    name: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    return (
        <nav aria-label="Navegação hierárquica" className={`mb-6 ${className}`}>
            <ol className="flex items-center gap-2 text-sm">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        {index > 0 && (
                            <FaChevronRight className="h-3 w-3 font-medium text-secondary/70 mx-2" aria-hidden="true" />
                        )}

                        {item.href && items.length > 1 ? (
                            <Link prefetch={false} href={item.href} className="text-link/70 hover:underline transition-colors duration-200" aria-current={index === items.length - 1 ? undefined : 'false'}>{item.name}</Link>
                        ) : (
                            <span className="font-medium text-primary" aria-current="page">
                                {item.name}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
