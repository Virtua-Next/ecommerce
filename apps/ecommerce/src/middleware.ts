import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { jwtDecode } from 'jwt-decode'
import { parseCookies } from 'nookies'
import { isSystemSetup } from './lib/db/setup';
import { getCachedConfig } from './lib/cache/config';
// export const runtime = 'experimental-edge';


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
    const prefixed = locale === routing.defaultLocale ? path : `/${locale}${path}`;

    return new URL(prefixed, request.url);
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const cleanPathName = pathname.trim();
    const { locale, path } = stripLocale(cleanPathName);
    const encodedCallback = encodeURIComponent(cleanPathName);

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

    const isSetupPath = (p: string) => ['/setup', '/instalacao'].some(s => p.startsWith(s));

    /** SETUP DO SISTEMA (PRIORIDADE) — cache via cookie */
    if (!setupStatus || setupStatus !== 'configured') {
        try {
            const setup = await isSystemSetup();
            setupStatus = setup ? 'configured' : 'not-configured';
            shouldRefreshSetupCookie = true;
        } catch (error) {
            return NextResponse.redirect(localizedUrl('/setup', locale, request));
        }
    }

    if (setupStatus !== 'configured' && !isSetupPath(path)) {
        console.log(localizedUrl('/setup', locale, request)) // URL {  }
        return attachCookies(NextResponse.redirect(localizedUrl('/setup', locale, request)));
    }
    if (setupStatus === 'configured' && isSetupPath(path)) {
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
    const onMaintenancePath = path.startsWith('/maintenance') || path.startsWith('/manutencao');
    const onLoginPath = path.startsWith('/login') || path.startsWith('/entrar');

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
    const publicRoutes = [
        '/unauthorized', '/nao-autorizado',
        '/maintenance', '/manutencao',
        '/setup', '/instalacao',
        '/login', '/entrar'
    ];

    if (publicRoutes.some(p => path.startsWith(p))) {
        return attachCookies(handleI18nRouting(request));
    }

    /** ROTAS DA CONTA E CHECKOUT */
    if (path.startsWith('/account') || path.startsWith('/checkout')) {
        if (hasValidToken) {
            return attachCookies(handleI18nRouting(request));
        }

        const res = NextResponse.redirect(localizedUrl(`/login?callback=${encodedCallback}`, locale, request));
        if (token) res.cookies.delete('token');
        return attachCookies(res);
    }

    /** ROTAS ADMIN */
    if (path.startsWith('/admin')) {
        if (!hasValidToken) {
            const res = NextResponse.redirect(localizedUrl(`/login?callback=${encodedCallback}`, locale, request))
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
