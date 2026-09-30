import { defineRouting } from 'next-intl/routing';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/constants';


export const routing = defineRouting({
    locales: SUPPORTED_LANGUAGES,       // locales: ['en-US', 'pt-BR']
    defaultLocale: DEFAULT_LANGUAGE,    // defaultLocale: 'en-US'
    pathnames: {
        '/': '/',
        '/setup': {
            'en-US': '/setup',
            'pt-BR': '/instalacao',
        },
        '/unauthorized': {
            'en-US': '/unauthorized',
            'pt-BR': '/nao-autorizado',
        },
        '/page/[slug]': {
            'en-US': '/page/[slug]',
            'pt-BR': '/pagina/[slug]',
        },
        '/product/[slug]': {
            'en-US': '/product/[slug]',
            'pt-BR': '/produto/[slug]',
        },
        '/category/[slug]': {
            'en-US': '/category/[slug]',
            'pt-BR': '/categoria/[slug]',
        },
        '/brand/[slug]': {
            'en-US': '/brand/[slug]',
            'pt-BR': '/marca/[slug]',
        },
        '/cart': {
            'en-US': '/cart',
            'pt-BR': '/carrinho',
        },
        '/login?callback=/checkout': {
            'en-US': '/login?callback=/checkout',
            'pt-BR': '/entrar?callback=/finalizar-compra',
        },
        '/login?callback=/account/profile': {
            'en-US': '/login?callback=/account/profile',
            'pt-BR': '/entrar?callback=/conta/perfil',
        },
        '/login?callback=/account/address': {
            'en-US': '/login?callback=/account/address',
            'pt-BR': '/entrar?callback=/conta/endereco',
        },
        '/login?callback=/account/order': {
            'en-US': '/login?callback=/account/order',
            'pt-BR': '/entrar?callback=/conta/pedido',
        },
        '/checkout': {
            'en-US': '/checkout',
            'pt-BR': '/finalizar-compra',
        },
        '/checkout/confirm': {
            'en-US': '/checkout/confirm',
            'pt-BR': '/finalizar-compra/confirmacao',
        },
        '/account': {
            'en-US': '/account',
            'pt-BR': '/conta',
        },
        '/account/profile': {
            'en-US': '/account/profile',
            'pt-BR': '/conta/perfil',
        },
        '/account/address': {
            'en-US': '/account/address',
            'pt-BR': '/conta/endereco',
        },
        '/account/order': {
            'en-US': '/account/order',
            'pt-BR': '/conta/pedido',
        },
        '/login': {
            'en-US': '/login',
            'pt-BR': '/entrar',
        },
        '/reset': {
            'en-US': '/reset',
            'pt-BR': '/redefinir',
        },
        '/reset/password': {
            'en-US': '/reset/password',
            'pt-BR': '/redefinir/senha',
        },
        '/register': {
            'en-US': '/register',
            'pt-BR': '/cadastro',
        },
        '/register/confirm': {
            'en-US': '/register/confirm',
            'pt-BR': '/cadastro/confirmacao',
        },
        '/admin': {
            'en-US': '/admin',
            'pt-BR': '/admin',
        },
        '/admin/brand': {
            'en-US': '/admin/brand',
            'pt-BR': '/admin/marca',
        },
        '/admin/category': {
            'en-US': '/admin/category',
            'pt-BR': '/admin/categoria',
        },
        '/admin/product': {
            'en-US': '/admin/product',
            'pt-BR': '/admin/produto',
        },
        '/admin/page': {
            'en-US': '/admin/page',
            'pt-BR': '/admin/pagina',
        },
        '/login?callback=/admin/brand': {
            'en-US': '/login?callback=/admin/brand',
            'pt-BR': '/entrar?callback=/admin/marca',
        },
        '/login?callback=/admin/category': {
            'en-US': '/login?callback=/admin/category',
            'pt-BR': '/entrar?callback=/admin/categoria',
        },
        '/login?callback=/admin/product': {
            'en-US': '/login?callback=/admin/product',
            'pt-BR': '/entrar?callback=/admin/produto',
        },
        '/login?callback=/admin/page': {
            'en-US': '/login?callback=/admin/page',
            'pt-BR': '/entrar?callback=/admin/pagina',
        },
        '/login?callback=/admin/slide': {
            'en-US': '/login?callback=/admin/slide',
            'pt-BR': '/login?callback=/admin/slide',
        },
        '/login?callback=/admin/footer': {
            'en-US': '/login?callback=/admin/footer',
            'pt-BR': '/login?callback=/admin/rodape',
        },
        '/login?callback=/admin/theme': {
            'en-US': '/login?callback=/admin/theme',
            'pt-BR': '/login?callback=/admin/tema',
        },
        '/login?callback=/admin/config/config-site': {
            'en-US': '/login?callback=/admin/config/config-site',
            'pt-BR': '/login?callback=/admin/config/config-site'
        },
        '/login?callback=/admin/config/config-carrier': {
            'en-US': '/login?callback=/admin/config/config-carrier',
            'pt-BR': '/login?callback=/admin/config/config-transportadora'
        },
        '/login?callback=/admin/config/config-payment': {
            'en-US': '/login?callback=/admin/config/config-payment',
            'pt-BR': '/login?callback=/admin/config/config-pagamento'
        },
        '/login?callback=/admin/config/config-email': {
            'en-US': '/login?callback=/admin/config/config-email',
            'pt-BR': '/login?callback=/admin/config/config-email'
        },
        '/login?callback=/admin/customer': {
            'en-US': '/login?callback=/admin/customer',
            'pt-BR': '/entrar?callback=/admin/cliente',
        },
        '/login?callback=/admin/order': {
            'en-US': '/login?callback=/admin/order',
            'pt-BR': '/entrar?callback=/admin/pedido',
        },
        '/maintenance': {
            'en-US': '/maintenance',
            'pt-BR': '/manutencao'
        }
    }
});

export type Locale = (typeof routing.locales)[number];
