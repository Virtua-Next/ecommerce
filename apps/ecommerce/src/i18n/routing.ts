import { defineRouting } from 'next-intl/routing';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/constants';
import { SupportedLanguage } from "@/lib/types/generic";


type InternalPath = keyof typeof routing.pathnames;

export const loginHref = (callback: InternalPath) => ({
    pathname: '/login' as const,
    query: { callback },
});

// First argument: path used by every language.
// Second argument: only the exceptions (translated URLs per language).
const p = (
    path: string,
    overrides: Partial<Record<SupportedLanguage, string>> = {}
): Record<SupportedLanguage, string> =>
    Object.fromEntries(
        SUPPORTED_LANGUAGES.map((l) => [l, overrides[l] ?? path])
    ) as Record<SupportedLanguage, string>;

export const routing = defineRouting({
    locales: SUPPORTED_LANGUAGES,       // locales: ['en-US', 'pt-BR']
    defaultLocale: DEFAULT_LANGUAGE,    // defaultLocale: 'en-US'

    pathnames: {
        '/': '/',
        '/setup': p('/setup', { 'pt-BR': '/instalacao' }),
        '/unauthorized': p('/unauthorized', { 'pt-BR': '/nao-autorizado' }),
        '/maintenance': p('/maintenance', { 'pt-BR': '/manutencao' }),

        // Storefront
        '/page/[slug]': p('/page/[slug]', { 'pt-BR': '/pagina/[slug]' }),
        '/product/[slug]': p('/product/[slug]', { 'pt-BR': '/produto/[slug]' }),
        '/category/[slug]': p('/category/[slug]', { 'pt-BR': '/categoria/[slug]' }),
        '/brand/[slug]': p('/brand/[slug]', { 'pt-BR': '/marca/[slug]' }),
        '/cart': p('/cart', { 'pt-BR': '/carrinho' }),
        '/checkout': p('/checkout', { 'pt-BR': '/finalizar-compra' }),
        '/checkout/confirm': p('/checkout/confirm', { 'pt-BR': '/finalizar-compra/confirmacao' }),

        // Customer account
        '/account': p('/account', { 'pt-BR': '/conta' }),
        '/account/profile': p('/account/profile', { 'pt-BR': '/conta/perfil' }),
        '/account/address': p('/account/address', { 'pt-BR': '/conta/endereco' }),
        '/account/order': p('/account/order', { 'pt-BR': '/conta/pedido' }),

        // Auth
        '/login': p('/login', { 'pt-BR': '/entrar' }),
        '/reset': p('/reset', { 'pt-BR': '/redefinir' }),
        '/reset/password': p('/reset/password', { 'pt-BR': '/redefinir/senha' }),
        '/register': p('/register', { 'pt-BR': '/cadastro' }),
        '/register/confirm': p('/register/confirm', { 'pt-BR': '/cadastro/confirmacao' }),

        // Admin
        '/admin': p('/admin'),
        '/admin/brand': p('/admin/brand', { 'pt-BR': '/admin/marca' }),
        '/admin/category': p('/admin/category', { 'pt-BR': '/admin/categoria' }),
        '/admin/product': p('/admin/product', { 'pt-BR': '/admin/produto' }),
        '/admin/page': p('/admin/page', { 'pt-BR': '/admin/pagina' }),

        // Admin routes that previously existed only as login callbacks.
        '/admin/slide': p('/admin/slide'),
        '/admin/footer': p('/admin/footer', { 'pt-BR': '/admin/rodape' }),
        '/admin/theme': p('/admin/theme', { 'pt-BR': '/admin/tema' }),
        '/admin/customer': p('/admin/customer', { 'pt-BR': '/admin/cliente' }),
        '/admin/order': p('/admin/order', { 'pt-BR': '/admin/pedido' }),
        '/admin/config/config-site': p('/admin/config/config-site'),
        '/admin/config/config-carrier': p('/admin/config/config-carrier', { 'pt-BR': '/admin/config/config-transportadora' }),
        '/admin/config/config-payment': p('/admin/config/config-payment', { 'pt-BR': '/admin/config/config-pagamento' }),
        '/admin/config/config-email': p('/admin/config/config-email'),
    }
});

export type Locale = (typeof routing.locales)[number];
