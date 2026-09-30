'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';


const SEARCH_PARAM = 'search';
const DEBOUNCE_MS = 400;

export function useGlobalSearch() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const searchTerm = searchParams.get(SEARCH_PARAM) ?? '';

    // Limpa o timer pendente se o componente desmontar no meio do debounce
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const applySearch = useCallback((term: string) => {
        const params = new URLSearchParams(searchParams.toString());
        const trimmed = term.trim();

        if (trimmed) {
            params.set(SEARCH_PARAM, trimmed);
        }

        const query = params.toString();
        const url = query ? `${pathname}?${query}` : pathname;

        // @ts-expect-error -- pathname é a rota atual, o next-intl exige
        // params tipados apenas para rotas dinâmicas com [slug]; busca
        // não é uma dessas rotas, mas o tipo genérico ainda reclama aqui.
        router.replace(url);
    }, [searchParams, pathname, router]);

    // Debounced: evita disparar navegação a cada tecla digitada
    const setSearchTerm = useCallback((term: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => applySearch(term), DEBOUNCE_MS);
    }, [applySearch]);

    // Sem debounce: útil pro botão "buscar" ou tecla Enter
    const submitSearch = useCallback((term: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        applySearch(term);
    }, [applySearch]);

    const clearSearch = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        applySearch('');
    }, [applySearch]);

    return { searchTerm, setSearchTerm, submitSearch, clearSearch };
}
