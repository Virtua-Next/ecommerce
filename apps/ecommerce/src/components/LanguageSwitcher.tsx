'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from './ui/button';
import { ENTITY_TYPE_BY_PATH, SUPPORTED_LANGUAGES, LANGUAGE_FLAGS } from "@/lib/constants";
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

    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const translationAbortControllerRef = useRef<AbortController | null>(null);

    // Close the dropdown when clicking outside
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const handleChange = async (nextLocale: string) => {
        setOpen(false);

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

    const enabled: readonly string[] = isSetupPage ? SUPPORTED_LANGUAGES : config?.enabled_languages ?? [];
    const options = LANGUAGE_FLAGS.filter((l) => enabled.includes(l.code));
    const current = LANGUAGE_FLAGS.find((l) => l.code === locale) ?? LANGUAGE_FLAGS[0];

    return (
        <div ref={containerRef} className="relative">
            <Button type="button" variant={'theme'} size={'sm'} className="rounded-full" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
                <span className="sr-only">{t('label')}</span>
                <current.Flag className="h-4 w-5 rounded-sm" />
            </Button>

            {open && (
                <ul role="listbox" className="absolute right-0 z-50 mt-1 w-40 rounded-md border bg-bg py-1 text-popover-foreground shadow-md">
                    {options.map(({ code, label, Flag }) => (
                        <li key={code} role="option" aria-selected={code === locale}>
                            <button type="button" onClick={() => handleChange(code)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-hover">
                                <Flag className="h-4 w-6 rounded-sm" />
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}



/*
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
*/