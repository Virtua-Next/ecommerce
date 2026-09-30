'use client';
import { useTranslations } from 'next-intl';
import { Sanitize } from '@/components/Sanitizer/Sanitizer';
import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import type { IPageTranslated } from '@/lib/schemas/page';


interface PageContentProps {
    page: IPageTranslated;
}

export default function PageContent({ page }: PageContentProps) {
    const t = useTranslations('Page');

    return (
        <>
            <div className="container">
                <Breadcrumb items={[{ name: t('home'), href: '/' }, { name: page.title }]} className="my-4" />
            </div>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 my-12">
                <article itemScope itemType="https://schema.org/Article">
                    <header className="mb-12 text-center">
                        <h1 itemProp="headline" className="text-3xl font-bold mb-6">{page.title}</h1>
                        {page.page_description && (
                            <p itemProp="description" className="text-lg text-gray-600 dark:text-gray-300 py-5">
                                {page.page_description}
                            </p>
                        )}
                    </header>

                    <div className="prose max-w-none dark:prose-invert">
                        <Sanitize html={page.content ?? ''} />
                    </div>
                </article>
            </main>
        </>
    );
}
