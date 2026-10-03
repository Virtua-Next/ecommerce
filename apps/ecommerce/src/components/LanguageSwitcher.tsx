'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from './ui/button';
import { useRef } from 'react';
import { LANGUAGE_LABELS, LANGUAGE_FLAGS, ENTITY_TYPE_BY_PATH, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { apiFetch, extractData } from '@/lib/utils';
import { useConfig } from '@/context/ConfigContext';


export function LanguageSwitcher() {
    const t = useTranslations('LanguageSwitcher');
    const { config } = useConfig();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams<{ slug?: string }>();
    const isSetupPage = pathname.startsWith('/setup');

    const translationAbortControllerRef = useRef<AbortController | null>(null);

    const handleChange = async (nextLocale: string) => {
        const entityType = ENTITY_TYPE_BY_PATH[pathname];

        if (!entityType || !params?.slug) {
            // @ts-expect-error -- pathname/params sempre correspondem em runtime
            router.replace({ pathname, params }, { locale: nextLocale });
            return;
        }

        translationAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        translationAbortControllerRef.current = abortController;

        try {
            const data = await apiFetch(`/api/translation?slug=${params.slug}&entityType=${entityType}&locale=${locale}&nextLocale=${nextLocale}`, { signal: abortController.signal });
            const translation = extractData(data, 'object');

            if (translation?.slug) {
                router.replace(
                    // @ts-expect-error -- pathname/params sempre correspondem em runtime
                    { pathname, params: { slug: translation.slug } },
                    { locale: nextLocale }
                );
            } else {
                router.replace('/', { locale: nextLocale });
            }
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Eror translating slug:', error);
            router.replace('/', { locale: nextLocale });
        } finally {
            if (translationAbortControllerRef.current === abortController) {
                translationAbortControllerRef.current = null;
            }
        }
    };

    return (
        <Button variant={'theme'} size={'sm'} className="rounded-full">
            <span className="sr-only">{t('label')}</span>
            <select value={locale} onChange={(e) => handleChange(e.target.value)} className="bg-transparent text-base">
                {(isSetupPage ? SUPPORTED_LANGUAGES : config?.enabled_languages ?? []).map((l) => (
                    <option key={l} value={l} title={LANGUAGE_LABELS[l] ?? l}>
                        {LANGUAGE_FLAGS[l] ?? l}
                    </option>
                ))}
            </select>
        </Button>
    );
}
