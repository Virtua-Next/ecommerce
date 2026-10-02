import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing, Locale } from '@/i18n/routing';
import { jwtDecode } from 'jwt-decode'
import { parseCookies } from 'nookies'
import { isSystemSetup } from './lib/db/setup';
import { getCachedConfig } from './lib/cache/config';


interface JwtPayload {
    profile_id: number
    uuid: number
    exp?: number
}

const handleI18nRouting = createMiddleware(routing);

const SETUP_COOKIE = 'setup_status';
const SETUP_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

const MAINT_COOKIE = 'maintenance_status';
const MAINT_COOKIE_MAX_AGE = 60; // 60 segundos

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

function stripLocale(pathname: string) {
    for (const locale of routing.locales) {
        if (pathname === `/${locale}`) return { locale, path: '/' };
        if (pathname.startsWith(`/${locale}/`)) {
            return { locale, path: pathname.slice(locale.length + 1) };
        }
    }
    return { locale: routing.defaultLocale, path: pathname };
}

function localizedUrl(path: string, locale: string, request: NextRequest) {
    // routing uses localePrefix 'always': every URL carries the locale
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
    const { locale, path: localizedPath } = stripLocale(cleanPathName);

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
        return attachCookies(handleI18nRouting(request));
    }

    /** ROTAS DA CONTA E CHECKOUT */
    if (path.startsWith('/account') || path.startsWith('/checkout')) {
        if (hasValidToken) {
            return attachCookies(handleI18nRouting(request));
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

    return attachCookies(handleI18nRouting(request));
}

export const config = {
    matcher: ['/((?!api|trpc|_next|_vercel|favicon.png|images|icons|fonts|.*\\..*).*)']
};
