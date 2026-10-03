import { type ClassValue, clsx } from "clsx";
// @ts-ignore
import psl from 'psl';
import { z } from 'zod'
import { twMerge } from "tailwind-merge"
import { parseDocument } from 'htmlparser2';
import { IProductTranslated } from "@/lib/schemas/product";
import { NextResponse } from "next/server";
import { decode } from 'html-entities';
import { ApiErrorCode, CountryCode, SupportedCurrency, SupportedLanguage } from "@/lib/types/generic";
import { DEFAULT_LANGUAGE, ERROR_CODE_KEYS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { AddressFormState } from "./schemas/user";
import { AddressFieldKey, AddressValidationResult, CONDITIONALLY_REQUIRED, COUNTRY_CONFIGS, REQUIRED_FIELDS } from "./schemas/country-configs";
import slugify from 'slugify';


// Scripts slugify can't transliterate: the slug would be empty or a stray fragment.
// (new RegExp avoids TS complaining about \p{...} when the target is below ES2018)
const UNTRANSLITERABLE = new RegExp(
    '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}' +
    '\\p{Script=Thai}\\p{Script=Devanagari}\\p{Script=Hebrew}\\p{Script=Arabic}]',
    'u'
);

export function makeSlug(title: string, lang: SupportedLanguage, fallback = ''): string {
    if (UNTRANSLITERABLE.test(title)) return fallback;
    return slugify(title, { lower: true, strict: true, locale: lang.split('-')[0] }) || fallback;
}

export function capitalizeWords(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function resolveLocale(raw: string | null | undefined): SupportedLanguage | undefined {
    const localeSchema = z.enum(SUPPORTED_LANGUAGES);

    const parsed = localeSchema.safeParse(raw);

    return parsed.success ? parsed.data : undefined;
}

export function resolveApiErrorKey(code?: string | null): string | undefined {
    if (!code || !(code in ERROR_CODE_KEYS)) return undefined;
    return ERROR_CODE_KEYS[code as ApiErrorCode];
}

export async function apiFetch(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    const data: any = await response.json().catch(() => null);

    if (!response.ok) {
        const err: any = new Error(data?.error || data?.message || `Request failed (${response.status})`);
        err.status = response.status;
        err.code = data?.code;
        err.data = data;
        throw err;
    }

    return data;
}

export function jsonNoStore(body: unknown, status: number) {
    return NextResponse.json(body, {
        status,
        headers: { 'Cache-Control': 'no-store' },
    });
}

export function formatPrice(value: number, locale: string, currency: SupportedCurrency = 'USD'): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(value);
}

export function stripHtmlToText(html: string | null | undefined, maxLength?: number): string {
    if (!html) return '';

    function decodeEntities(text: string): string {
        return decode(text);
    }

    const withoutTags = html
        // remove conteúdo de tags perigosas por completo (script/style), não só a tag
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
        // remove todas as outras tags, mantendo o texto interno
        .replace(/<[^>]+>/g, ' ');

    const decoded = decodeEntities(withoutTags);

    const normalized = decoded.replace(/\s+/g, ' ').trim();

    return maxLength ? normalized.slice(0, maxLength) : normalized;
}

export function getCookieDomain(hostname: string): string | undefined {
    if (!hostname) return undefined;

    const cleanHost = hostname
        .trim()
        .replace(/^(https?:\/\/)/, '')
        .replace(/:\d+$/, '')
        .replace(/\/.*$/, '')
        .toLowerCase();

    // Localhost ou IP — não seta domain (cookie fica restrito ao host exato)
    if (cleanHost === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(cleanHost)) {
        return undefined;
    }

    const parsed = psl.parse(cleanHost) as any;

    if ('error' in parsed || !parsed.domain) {
        return undefined;
    }

    return `.${parsed.domain}`;
}

/**
 * Builds a wa.me deep link pre-filled with a product inquiry message.
 * Centralized so ClientProductPage and ProductsGrid don't each maintain
 * their own copy of the message template.
 */
export function buildProductWhatsAppUrl(whatsAppNumber: string, domain: string | undefined, product: IProductTranslated, formattedPrice: string, t: (key: string, values?: Record<string, string>) => string) {
    const message = t('message', {
        product_title: product.title,
        product_code: product.sku,
        product_price: formattedPrice,
        product_link: `${domain ?? ''}/product/${product.slug}`,
    });

    return `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(message)}`;
}

export function extrairTextoDoPrimeiroParagrafo(html: string) {
    const { children } = parseDocument(html);

    const p: any = children.find(
        node => node.type === 'tag' && node.name === 'p'
    );

    if (!p) return '';

    return p.children
        .filter((child: { type: string; }) => child.type === 'text' || child.type === 'tag')
        .map((child: { children: { data: any; }[]; data: any; }) => child.children?.[0]?.data || child.data || '')
        .join('');
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const isValidImageUrl = (url?: string) => !!url && /^(https?:\/\/|\/).+/i.test(url);

export const buildImageUrl = (cdn: string | null | undefined, path: unknown, fallback: string = '/images/no-image.svg') => {
    if (!path || typeof path !== 'string' || path.trim() === '') {
        return fallback;
    }

    if (
        path.includes('slide-example-1') ||
        path.includes('slide-example-2') ||
        path.includes('slide-example-3') ||
        path.includes('no-image.svg')
    ) {
        return path;
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    if (path.startsWith('/')) {
        return cdn ? `${cdn}${path}` : path;
    }

    return cdn ? `${cdn}/${path}` : `/${path}`;
};

export const isExternalUrl = (url: string) => { return /^https?:\/\//i.test(url) };

type CanonicalUrlParams = {
    domain?: string;
    slug?: string;
    path?: string;
};
export const getCanonicalUrl = ({ domain, slug, path }: CanonicalUrlParams): string => {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const cleanDomain = domain?.replace(/^(https?:\/\/)?/, '').replace(/\/+$/, '');
    const urlParts = [`${protocol}://${cleanDomain}`];

    [path, slug].forEach(part => {
        if (part) urlParts.push(part.replace(/^\/+|\/+$/g, ''));
    });

    return urlParts.join('/');
};

export function parseNumber(input: unknown, fallback = 0): number {
    if (typeof input === 'number') {
        return Number.isFinite(input) ? input : fallback;
    }

    if (typeof input !== 'string') return fallback;

    const raw = input.trim();
    if (!raw) return fallback;

    // Remove tudo que não for dígito, vírgula, ponto ou sinal
    const cleaned = raw.replace(/[^\d,.-]/g, '');
    if (!cleaned) return fallback;

    let normalized: string;

    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
        // Qual veio por último é o separador decimal
        normalized =
            cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
                ? cleaned.replace(/\./g, '').replace(',', '.')
                : cleaned.replace(/,/g, '');
    } else if (hasComma) {
        normalized = cleaned.replace(',', '.');
    } else {
        normalized = cleaned;
    }

    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : fallback;
}

export function formatDate(dateString: string, locale: string = DEFAULT_LANGUAGE): string {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Verifica se a data é válida
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export async function fetchAddressByCep(cep: string, signal: AbortSignal) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            signal
        });
        const data = await response.json() as any;
        if (data.erro) {
            return null;
        }

        return {
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            address_state: data.uf
        };

    } catch (error: any) {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
            return {
                ok: false,
                status: 499,
                data: null,
                message: 'Requisição cancelada',
                isAborted: true
            };
        }
        console.error("Erro ao buscar CEP:", error);
        return null;
    }
};

export const limparNumero = (valor: string) => valor?.replace(/\D/g, '') || null;

export const formatarTelefone = (valor: string) => {
    const numeros = limparNumero(valor);
    if (!numeros) return '';

    // Se for formato brasileiro (10 ou 11 dígitos)
    if (numeros.length === 10) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    if (numeros.length === 11) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }

    // Para outros formatos: mostra só os números sem formatação
    return numeros.slice(0, 15);
};

// Função de validação flexível
export const validarTelefone = (telefone: string): boolean => {
    const numeros = limparNumero(telefone);
    if (!numeros) return false;

    // Aceita números com 8 a 15 dígitos
    return numeros.length >= 8 && numeros.length <= 15;
};

/**
 * Extrai o primeiro item da resposta da API.
 * Suporta:
 * - { data: [item] }
 * - { data: { data: [item] } }
 * - { data: item }
 * - { data: { data: item } }
 * 
 * Retorna o item ou undefined se não encontrar.
 */
// lib/utils/extractData.ts
export const extractData = <T = any>(responseData: any, responseType: 'array' | 'object'): T | undefined => {
    let data = responseData?.data?.data ?? responseData?.data ?? responseData;

    if (responseType === 'array') {
        if (Array.isArray(data)) {
            return data as T;
        }
        return [data] as T;
    }
    if (responseType === 'object') {
        if (Array.isArray(data) && data.length === 1) {
            return data[0] as T;
        }
        if (Array.isArray(data) && data.length === 0) {
            return undefined;
        }
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            return data as T;
        }
        return undefined;
    }

    return undefined;
};

export const toBoolean = (value: any) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    if (typeof value === 'number') {
        return value > 0;
    }
    return Boolean(value);
};

export function validateAddress(country: CountryCode, address: AddressFormState, zipValid: boolean): AddressValidationResult {
    const config = COUNTRY_CONFIGS[country];
    const errors: Partial<Record<AddressFieldKey, string>> = {};
    const missing: AddressFieldKey[] = [];

    // Campos presentes nesse país
    const fieldsForCountry = new Set(config.addressFields);

    // 1) ZIP
    if (fieldsForCountry.has('zip')) {
        const zip = (address.zip ?? '').replace(/\D/g, '');

        if (!zip) {
            errors.zip = 'required';
            missing.push('zip');
        } else if (config.hasZipLookup && !zipValid) {
            // Se o país tem lookup, o zip só é válido se o lookup passou
            errors.zip = 'invalid';
            missing.push('zip');
        } else if (!config.hasZipLookup && zip.length < 4) {
            // Sem lookup, validação mínima por tamanho
            errors.zip = 'invalid';
            missing.push('zip');
        }
    }

    // 2) Demais campos obrigatórios presentes no país
    const requiredForCountry = [
        ...REQUIRED_FIELDS,
        ...CONDITIONALLY_REQUIRED,
    ].filter(f => fieldsForCountry.has(f));

    for (const field of requiredForCountry) {
        if (field === 'zip') continue; // já tratado

        const value = address[field];
        if (typeof value !== 'string' || value.trim() === '') {
            errors[field] = 'required';
            missing.push(field);
        }
    }

    // 3) Validações específicas por país (extensível)
    if (country === 'BR' && fieldsForCountry.has('address_state')) {
        if (address.address_state && address.address_state.length !== 2) {
            errors.address_state = 'invalid';
            if (!missing.includes('address_state')) missing.push('address_state');
        }
    }

    return {
        valid: missing.length === 0,
        errors,
        missing,
    };
}
