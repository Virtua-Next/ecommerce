import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing, Locale } from '@/i18n/routing';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/constants';
import { isSupported, parseLanguages } from '@/i18n/languages';
import { jwtDecode } from 'jwt-decode'
import { parseCookies } from 'nookies'
import { isSystemSetup } from './lib/db/setup';
import { getCachedConfig } from './lib/cache/config';


interface JwtPayload {
    profile_id: number
    uuid: number
    exp?: number
}

// Static i18n middleware: used during setup and as a fallback.
const handleI18nRouting = createMiddleware(routing);

const SETUP_COOKIE = 'setup_status';
const SETUP_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

const MAINT_COOKIE = 'maintenance_status';
const MAINT_COOKIE_MAX_AGE = 60; // 60 segundos

const LANG_COOKIE = 'store_languages';
const LANG_COOKIE_MAX_AGE = 60; // 60 segundos

/**
 * Tabela construída uma vez: para cada idioma, as rotas estáticas do routing
 * com o caminho traduzido (external) e o nome interno (internal).
 * Ordenada pelo caminho mais longo primeiro, para que '/conta/perfil'
 * ganhe de '/conta'.
 */
type Route = { internal: string; external: string };

const routesByLocale = {} as Record<Locale, Route[]>;
for (const locale of routing.locales) {
    routesByLocale[locale] = Object.entries(routing.pathnames)
        .filter(([internal]) => internal !== '/' && !internal.includes('['))
        .map(([internal, localized]) => ({
            internal,
            external: typeof localized === 'string'
                ? localized
                : (localized as Record<Locale, string>)[locale] ?? internal,
        }))
        .sort((a, b) => b.external.length - a.external.length);
}

/**
 * '/finalizar-compra' (pt-BR) -> '/checkout'
 * '/conta/pedido/123' (pt-BR) -> '/account/order/123'
 * Caminhos desconhecidos são devolvidos como estão.
 */
function toInternalPath(path: string, locale: Locale): string {
    for (const { internal, external } of routesByLocale[locale]) {
        if (path === external) return internal;
        if (path.startsWith(`${external}/`)) return internal + path.slice(external.length);
    }
    return path;
}

/**
 * Idiomas da loja (vêm do banco). Em cookie de 60s para não consultar o banco a cada requisição.
 * Formato do cookie: "pt-BR|pt-BR,en-US"  (padrão | ativos)
 */
type StoreLanguages = { enabled: Locale[]; default: Locale };

// Used during setup, or when the config can't be read: never locks anybody out.
const FALLBACK_LANGUAGES: StoreLanguages = {
    enabled: [...SUPPORTED_LANGUAGES],
    default: DEFAULT_LANGUAGE,
};

function serializeLanguages(l: StoreLanguages): string {
    return `${l.default}|${l.enabled.join(',')}`;
}

function parseLanguagesCookie(value: string | undefined): StoreLanguages | null {
    if (!value) return null;

    const [def, list] = value.split('|');
    const enabled = (list ?? '').split(',').filter(isSupported);

    if (!isSupported(def) || enabled.length === 0 || !enabled.includes(def)) return null;

    return { enabled, default: def };
}

function languagesFromConfig(config: any): StoreLanguages {
    // If the config getter doesn't return the language columns, don't filter anything.
    if (!config || config.enabled_languages === undefined) return FALLBACK_LANGUAGES;

    const enabled = parseLanguages(config.enabled_languages);
    const def: Locale = isSupported(config.default_language) ? config.default_language : DEFAULT_LANGUAGE;

    return { enabled: enabled.includes(def) ? enabled : [...enabled, def], default: def };
}

// next-intl middleware per combination of (default | enabled), created once and reused.
const intlCache = new Map<string, ReturnType<typeof createMiddleware>>();

function getIntlMiddleware(l: StoreLanguages) {
    const key = serializeLanguages(l);
    let mw = intlCache.get(key);

    if (!mw) {
        mw = createMiddleware({
            ...routing,
            locales: l.enabled,
            defaultLocale: l.default,
        } as unknown as typeof routing);
        intlCache.set(key, mw);
    }

    return mw;
}

function stripLocale(pathname: string) {
    for (const locale of routing.locales) {
        if (pathname === `/${locale}`) return { locale, path: '/', hasPrefix: true };
        if (pathname.startsWith(`/${locale}/`)) {
            return { locale, path: pathname.slice(locale.length + 1), hasPrefix: true };
        }
    }
    return { locale: routing.defaultLocale, path: pathname, hasPrefix: false };
}

// routing uses localePrefix 'always': every URL carries the locale
function localizedUrl(path: string, locale: string, request: NextRequest) {
    const prefixed = path === '/' ? `/${locale}` : `/${locale}${path}`;

    return new URL(prefixed, request.url);
}

/** Redireciona para o login levando o caminho INTERNO como callback (independe de idioma) */
function loginRedirect(request: NextRequest, locale: Locale, internalPath: string) {
    const url = localizedUrl('/login', locale, request);
    url.searchParams.set('callback', internalPath);
    return NextResponse.redirect(url);
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const cleanPathName = pathname.trim();
    const { locale, path: localizedPath, hasPrefix } = stripLocale(cleanPathName);

    // A partir daqui, todas as comparações usam o nome interno da rota (em inglês)
    const path = toInternalPath(localizedPath, locale);

    const bypass = ['/api', '/_next', '/favicon.png'];
    if (bypass.some(p => path.startsWith(p))) {
        return NextResponse.next();
    }

    const cookies = parseCookies({
        req: { headers: { cookie: request.headers.get('cookie') || '' } }
    });

    let setupStatus = cookies[SETUP_COOKIE];
    let shouldRefreshSetupCookie = false;

    let maintStatus = cookies[MAINT_COOKIE];
    let shouldRefreshMaintCookie = false;

    let langCookie = cookies[LANG_COOKIE];
    let shouldRefreshLangCookie = false;

    function attachCookies(response: NextResponse) {
        if (shouldRefreshSetupCookie) {
            response.cookies.set(SETUP_COOKIE, setupStatus, {
                maxAge: setupStatus === 'configured' ? SETUP_COOKIE_MAX_AGE : 0,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
            });
        }
        if (shouldRefreshMaintCookie) {
            response.cookies.set(MAINT_COOKIE, maintStatus, {
                maxAge: MAINT_COOKIE_MAX_AGE,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
            });
        }
        if (shouldRefreshLangCookie && langCookie) {
            response.cookies.set(LANG_COOKIE, langCookie, {
                maxAge: LANG_COOKIE_MAX_AGE,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
            });
        }
        return response;
    }

    const isSetupPath = path.startsWith('/setup');

    /** SETUP DO SISTEMA (PRIORIDADE) — cache via cookie */
    if (!setupStatus || setupStatus !== 'configured') {
        try {
            const setup = await isSystemSetup();
            setupStatus = setup ? 'configured' : 'not-configured';
            shouldRefreshSetupCookie = true;
        } catch (error) {
            // Banco ainda não pronto: trata como não configurado, sem gravar cookie.
            // (Redirecionar aqui, mesmo já estando em /setup, causava loop de redirects.)
            setupStatus = 'not-configured';
        }
    }

    if (setupStatus !== 'configured' && !isSetupPath) {
        return attachCookies(NextResponse.redirect(localizedUrl('/setup', locale, request)));
    }
    if (setupStatus === 'configured' && isSetupPath) {
        return attachCookies(NextResponse.redirect(localizedUrl('/login', locale, request)));
    }

    /** IDIOMAS DA LOJA — só depois do setup; durante o setup vale o routing estático (constantes) */
    let intl = handleI18nRouting;

    if (setupStatus === 'configured') {
        let languages = parseLanguagesCookie(langCookie);

        if (!languages) {
            try {
                const config = await getCachedConfig();
                languages = languagesFromConfig(config);
                langCookie = serializeLanguages(languages);
                shouldRefreshLangCookie = true;
            } catch (error) {
                // Not cached in a cookie, so the next request tries again.
                console.error('[middleware] could not load store languages, using constants', error);
                languages = FALLBACK_LANGUAGES;
            }
        }

        intl = getIntlMiddleware(languages);

        // No locale in the URL: next-intl picks one among the ENABLED languages
        // (NEXT_LOCALE cookie, then browser language, then the store default) and redirects.
        if (!hasPrefix) return attachCookies(intl(request));

        // Locale in the URL is disabled: go to the home of the store's default language.
        // (Deep paths are not preserved: slugs are translated per language.)
        if (!languages.enabled.includes(locale)) {
            return attachCookies(NextResponse.redirect(localizedUrl('/', languages.default, request)));
        }
    }

    /** TOKEN */
    const token = cookies.token
    let isAdmin = false
    let hasValidToken = false

    if (token) {
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            const expired = decoded.exp && Date.now() > decoded.exp * 1000;
            if (!expired) {
                isAdmin = decoded.profile_id === 1;
                hasValidToken = true;
            }
        } catch (err) {
            console.error('Error decoding token:', err);
        }
    }


    /** MANUTENÇÃO — roda sempre (menos admin), inclusive na própria /maintenance */
    const onMaintenancePath = path.startsWith('/maintenance');
    const onLoginPath = path.startsWith('/login');

    if (!isAdmin && maintStatus === undefined) {
        try {
            const config = await getCachedConfig();
            maintStatus = config?.maintenance ? '1' : '0';
            shouldRefreshMaintCookie = true;
        } catch {
            maintStatus = '0';
        }
    }

    if (!isAdmin && maintStatus === '1' && !onMaintenancePath && !onLoginPath) {
        const res = NextResponse.redirect(localizedUrl('/maintenance', locale, request));
        res.cookies.delete('token');
        return attachCookies(res);
    }

    if (!isAdmin && maintStatus === '0' && onMaintenancePath && !onLoginPath) {
        return attachCookies(NextResponse.redirect(localizedUrl('/', locale, request)));
    }

    /** PÁGINAS PÚBLICAS */
    const publicRoutes = ['/unauthorized', '/maintenance', '/setup', '/login'];

    if (publicRoutes.some(p => path.startsWith(p))) {
        return attachCookies(intl(request));
    }

    /** ROTAS DA CONTA E CHECKOUT */
    if (path.startsWith('/account') || path.startsWith('/checkout')) {
        if (hasValidToken) {
            return attachCookies(intl(request));
        }

        const res = loginRedirect(request, locale, path);
        if (token) res.cookies.delete('token');
        return attachCookies(res);
    }

    /** ROTAS ADMIN */
    if (path.startsWith('/admin')) {
        if (!hasValidToken) {
            const res = loginRedirect(request, locale, path);
            if (token) res.cookies.delete('token')
            return attachCookies(res);
        }

        if (!isAdmin) {
            const res = NextResponse.redirect(localizedUrl('/unauthorized', locale, request))
            res.cookies.delete('token')
            return attachCookies(res);
        }
    }

    return attachCookies(intl(request));
}

export const config = {
    matcher: ['/((?!api|trpc|_next|_vercel|favicon.png|images|icons|fonts|.*\\..*).*)']
};