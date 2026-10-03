import { ApiErrorCode, SupportedLanguage, CountryCode, TranslationEntityTypes } from '@/lib/types/generic';

// --------- ERRORS ----------
export const API_ERROR_CODES = ['NOT_FOUND', 'VALIDATION_ERROR', 'FORBIDDEN', 'NO_CHANGES', 'UPDATE_FAILED',
    'INTERNAL_ERROR', 'MISSING_CREDENTIALS', 'INVALID_CREDENTIALS', 'INACTIVE_USER', 'UNAUTHORIZED', 'DUPLICATE',
    'INVALID_TOKEN', 'DUPLICATE_EMAIL', 'DUPLICATE_TAX_ID', 'DUPLICATE_PHONE', 'TAX_ID_VALIDATION_ERROR', 'HAS_DEPENDENTS',
    'TAX_ID_REQUIRED', 'MELHOR_ENVIO_TOKEN_RENEW_ERROR', 'MUST_HAVE_PRIMARY', 'INVALID_TRANSITION', 'ORDER_STATUS_CONFLICT',
    'INVALID_COUNTRY'] as const;

export const ERROR_CODE_KEYS: Record<ApiErrorCode, string> = {
    NOT_FOUND: 'notFound',
    VALIDATION_ERROR: 'validation',
    FORBIDDEN: 'forbidden',
    NO_CHANGES: 'noChanges',
    UPDATE_FAILED: 'updateFailed',
    INTERNAL_ERROR: 'internal',
    MISSING_CREDENTIALS: 'missingCredentials',
    INVALID_CREDENTIALS: 'invalidCredentials',
    INACTIVE_USER: 'inactiveUser',
    UNAUTHORIZED: 'unauthorized',
    DUPLICATE: 'duplicatedEntity',
    INVALID_TOKEN: 'invalidToken',
    DUPLICATE_EMAIL: 'duplicateEmail',
    DUPLICATE_TAX_ID: 'duplicateTaxId',
    DUPLICATE_PHONE: 'duplicatePhone',
    TAX_ID_VALIDATION_ERROR: 'taxIdValidation',
    TAX_ID_REQUIRED: 'taxIdRequired',
    MELHOR_ENVIO_TOKEN_RENEW_ERROR: 'melhorEnvioTokenRenew',
    MUST_HAVE_PRIMARY: 'mustHavePrimary',
    INVALID_TRANSITION: 'invalidTransition',
    ORDER_STATUS_CONFLICT: 'orderStatusConflict',
    HAS_DEPENDENTS: 'entityHasDependent',
    INVALID_COUNTRY: 'invalidContryForCarrier'
};

// --------- COUNTRY ----------
export const SUPPORTED_COUNTRIES = [
    'AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE',
    'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BV', 'BR', 'IO', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'KY', 'CF', 'TD', 'CL',
    'CN', 'CX', 'CC', 'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ',
    'ER', 'EE', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU',
    'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'VA', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP',
    'JE', 'JO', 'KZ', 'KE', 'KI', 'KR', 'KP', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MK', 'MG', 'MW',
    'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP',
    'NL', 'AN', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL',
    'PT', 'PR', 'QA', 'RE', 'RO', 'RU', 'RW', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL',
    'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'ES', 'LK', 'SD', 'SR', 'SJ', 'SZ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG',
    'TK', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UM', 'UY', 'UZ', 'VU', 'VE', 'VN', 'VG', 'VI', 'WF',
    'EH', 'YE', 'ZM', 'ZW'] as const;

export const COUNTRY_LABELS: Record<CountryCode, string> = {
    'AF': 'Afghanistan', 'AX': 'Aland Islands', 'AL': 'Albania', 'DZ': 'Algeria', 'AS': 'American Samoa', 'AD': 'Andorra',
    'AO': 'Angola', 'AI': 'Anguilla', 'AQ': 'Antarctica', 'AG': 'Antigua And Barbuda', 'AR': 'Argentina', 'AM': 'Armenia', 'AW': 'Aruba',
    'AU': 'Australia', 'AT': 'Austria', 'AZ': 'Azerbaijan', 'BS': 'Bahamas', 'BH': 'Bahrain', 'BD': 'Bangladesh', 'BB': 'Barbados',
    'BY': 'Belarus', 'BE': 'Belgium', 'BZ': 'Belize', 'BJ': 'Benin', 'BM': 'Bermuda', 'BT': 'Bhutan', 'BO': 'Bolivia',
    'BA': 'Bosnia And Herzegovina', 'BW': 'Botswana', 'BV': 'Bouvet Island', 'BR': 'Brazil', 'IO': 'British Indian Ocean Territory',
    'BN': 'Brunei Darussalam', 'BG': 'Bulgaria', 'BF': 'Burkina Faso', 'BI': 'Burundi', 'KH': 'Cambodia', 'CM': 'Cameroon', 'CA': 'Canada',
    'CV': 'Cape Verde', 'KY': 'Cayman Islands', 'CF': 'Central African Republic', 'TD': 'Chad', 'CL': 'Chile', 'CN': 'China',
    'CX': 'Christmas Island', 'CC': 'Cocos (Keeling) Islands', 'CO': 'Colombia', 'KM': 'Comoros', 'CG': 'Congo',
    'CD': 'Congo, Democratic Republic', 'CK': 'Cook Islands', 'CR': 'Costa Rica', 'CI': 'Cote D\'Ivoire', 'HR': 'Croatia',
    'CU': 'Cuba', 'CY': 'Cyprus', 'CZ': 'Czech Republic', 'DK': 'Denmark', 'DJ': 'Djibouti', 'DM': 'Dominica', 'DO': 'Dominican Republic',
    'EC': 'Ecuador', 'EG': 'Egypt', 'SV': 'El Salvador', 'GQ': 'Equatorial Guinea', 'ER': 'Eritrea', 'EE': 'Estonia', 'ET': 'Ethiopia',
    'FK': 'Falkland Islands (Malvinas)', 'FO': 'Faroe Islands', 'FJ': 'Fiji', 'FI': 'Finland', 'FR': 'France', 'GF': 'French Guiana',
    'PF': 'French Polynesia', 'TF': 'French Southern Territories', 'GA': 'Gabon', 'GM': 'Gambia', 'GE': 'Georgia', 'DE': 'Germany',
    'GH': 'Ghana', 'GI': 'Gibraltar', 'GR': 'Greece', 'GL': 'Greenland', 'GD': 'Grenada', 'GP': 'Guadeloupe', 'GU': 'Guam',
    'GT': 'Guatemala', 'GG': 'Guernsey', 'GN': 'Guinea', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HT': 'Haiti',
    'HM': 'Heard Island & Mcdonald Islands', 'VA': 'Holy See (Vatican City State)', 'HN': 'Honduras', 'HK': 'Hong Kong', 'HU': 'Hungary',
    'IS': 'Iceland', 'IN': 'India', 'ID': 'Indonesia', 'IR': 'Iran, Islamic Republic Of', 'IQ': 'Iraq', 'IE': 'Ireland',
    'IM': 'Isle Of Man', 'IL': 'Israel', 'IT': 'Italy', 'JM': 'Jamaica', 'JP': 'Japan', 'JE': 'Jersey', 'JO': 'Jordan', 'KZ': 'Kazakhstan',
    'KE': 'Kenya', 'KI': 'Kiribati', 'KR': 'Korea', 'KP': 'North Korea', 'KW': 'Kuwait', 'KG': 'Kyrgyzstan',
    'LA': 'Lao People\'s Democratic Republic', 'LV': 'Latvia', 'LB': 'Lebanon', 'LS': 'Lesotho', 'LR': 'Liberia',
    'LY': 'Libyan Arab Jamahiriya', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'MO': 'Macao', 'MK': 'Macedonia',
    'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaysia', 'MV': 'Maldives', 'ML': 'Mali', 'MT': 'Malta', 'MH': 'Marshall Islands',
    'MQ': 'Martinique', 'MR': 'Mauritania', 'MU': 'Mauritius', 'YT': 'Mayotte', 'MX': 'Mexico', 'FM': 'Micronesia, Federated States Of',
    'MD': 'Moldova', 'MC': 'Monaco', 'MN': 'Mongolia', 'ME': 'Montenegro', 'MS': 'Montserrat', 'MA': 'Morocco', 'MZ': 'Mozambique',
    'MM': 'Myanmar', 'NA': 'Namibia', 'NR': 'Nauru', 'NP': 'Nepal', 'NL': 'Netherlands', 'AN': 'Netherlands Antilles',
    'NC': 'New Caledonia', 'NZ': 'New Zealand', 'NI': 'Nicaragua', 'NE': 'Niger', 'NG': 'Nigeria', 'NU': 'Niue', 'NF': 'Norfolk Island',
    'MP': 'Northern Mariana Islands', 'NO': 'Norway', 'OM': 'Oman', 'PK': 'Pakistan', 'PW': 'Palau',
    'PS': 'Palestinian Territory, Occupied', 'PA': 'Panama', 'PG': 'Papua New Guinea', 'PY': 'Paraguay', 'PE': 'Peru',
    'PH': 'Philippines', 'PN': 'Pitcairn', 'PL': 'Poland', 'PT': 'Portugal', 'PR': 'Puerto Rico', 'QA': 'Qatar', 'RE': 'Reunion',
    'RO': 'Romania', 'RU': 'Russian Federation', 'RW': 'Rwanda', 'BL': 'Saint Barthelemy', 'SH': 'Saint Helena',
    'KN': 'Saint Kitts And Nevis', 'LC': 'Saint Lucia', 'MF': 'Saint Martin', 'PM': 'Saint Pierre And Miquelon',
    'VC': 'Saint Vincent And Grenadines', 'WS': 'Samoa', 'SM': 'San Marino', 'ST': 'Sao Tome And Principe', 'SA': 'Saudi Arabia',
    'SN': 'Senegal', 'RS': 'Serbia', 'SC': 'Seychelles', 'SL': 'Sierra Leone', 'SG': 'Singapore', 'SK': 'Slovakia', 'SI': 'Slovenia',
    'SB': 'Solomon Islands', 'SO': 'Somalia', 'ZA': 'South Africa', 'GS': 'South Georgia And Sandwich Isl.', 'ES': 'Spain',
    'LK': 'Sri Lanka', 'SD': 'Sudan', 'SR': 'Suriname', 'SJ': 'Svalbard And Jan Mayen', 'SZ': 'Swaziland', 'SE': 'Sweden',
    'CH': 'Switzerland', 'SY': 'Syrian Arab Republic', 'TW': 'Taiwan', 'TJ': 'Tajikistan', 'TZ': 'Tanzania', 'TH': 'Thailand',
    'TL': 'Timor-Leste', 'TG': 'Togo', 'TK': 'Tokelau', 'TO': 'Tonga', 'TT': 'Trinidad And Tobago', 'TN': 'Tunisia', 'TR': 'Turkey',
    'TM': 'Turkmenistan', 'TC': 'Turks And Caicos Islands', 'TV': 'Tuvalu', 'UG': 'Uganda', 'UA': 'Ukraine', 'AE': 'United Arab Emirates',
    'GB': 'United Kingdom', 'US': 'United States', 'UM': 'United States Outlying Islands', 'UY': 'Uruguay', 'UZ': 'Uzbekistan',
    'VU': 'Vanuatu', 'VE': 'Venezuela', 'VN': 'Vietnam', 'VG': 'Virgin Islands, British', 'VI': 'Virgin Islands, U.S.',
    'WF': 'Wallis And Futuna', 'EH': 'Western Sahara', 'YE': 'Yemen', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
};

export const DEFAULT_COUNTRY: CountryCode = 'BR';

export const MERCADOPAGO_IDENTIFICATION_TYPE: Partial<Record<CountryCode, string>> = {
    BR: 'CPF', // CNPJ tratado à parte, ver função abaixo
    // Mercado Pago não opera oficialmente em US nem PT — não preencher esses.
    // Se SUPPORTED_COUNTRIES for expandido para outros países da América Latina
    // que o Mercado Pago atende, os tipos oficiais são:
    // AR: 'DNI',   // ou CUIT/CUIL dependendo do fluxo
    // CL: 'RUT',
    // CO: 'CC',    // ou CE/NIT
    // PE: 'DNI',   // ou CE/RUC
    // UY: 'CI',
};

// --------- LANGUAGE -----------
export const DEFAULT_LANGUAGE = 'pt-BR' as const;
export const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'ja-JP'] as const;
export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
    'pt-BR': 'Português',
    'en-US': 'English',
    'ja-JP': '日本語'
};
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
    'pt-BR': '🇧🇷',
    'en-US': '🇺🇸',
    'ja-JP': '🇯🇵',
};

// ---------- CURRENCY ----------
export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'JPY'] as const;
export const DEFAULT_CURRENCY = 'BRL' as const;


// ----------- CARRIERS ---------
export const CARRIER_TYPES = ['personalized', 'correios', 'melhor_envio'] as const;
export const DELIVERY_OPTIONS = ['pickup', 'delivery'] as const;


// ----------- ORDERS ----------
export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled', 'archived', 'payment_error', 'refunded'] as const;


// ----------- PAYMENTS ---------
export const PAYMENT_API_PROVIDERS = ['offline', 'stripe', 'mercadopago'] as const;
export const PAYMENT_METHODS = ['cash', 'boleto', 'transfer', 'pix', 'card'] as const;
export const STRIPE_API_VERSION = '2026-08-26.dahlia' as const;
export const STRIPE_ALLOWED_INSTALLMENTS = ['mxn', 'jpy'] as const;

// ---------- EMAILS -------------
export const EMAIL_PROVIDERS = ['resend'] as const;
export const EMAIL_TRIGGER_TYPES = ['sales', 'account', 'support'] as const;
export const EMAIL_SUBJECTS: Record<string, Record<SupportedLanguage, string>> = {
    account_register: {
        'pt-BR': 'Confirme seu cadastro',
        'en-US': 'Confirm your registration',
        'ja-JP': '登録を確認する'
    },
    password_reset: {
        'pt-BR': 'Recuperação de senha',
        'en-US': 'Password reset',
        'ja-JP': 'パスワードをリセットする'
    },
    order_confirmation: {
        'pt-BR': 'Confirmação de Pedido #{orderId}',
        'en-US': 'Order Confirmation #{orderId}',
        'ja-JP': '注文確認 #{orderId}'
    },
    order_confirmation_transfer: {
        'pt-BR': 'Pedido #{orderId} recebido — Aguardando pagamento',
        'en-US': 'Order #{orderId} received — Awaiting payment',
        'ja-JP': '注文 #{orderId} 受信 — 支払いを待っています'
    },
    order_confirmation_pix_offline: {
        'pt-BR': 'Pedido #{orderId} recebido — Aguardando pagamento',
        'en-US': 'Order #{orderId} received — Awaiting payment',
        'ja-JP': '注文 #{orderId} 受信 — 支払いを待っています'
    },
    order_shipped: {
        'pt-BR': 'Pedido #{orderId} Enviado',
        'en-US': 'Order #{orderId} Shipped',
        'ja-JP': '注文 #{orderId} 発送済み'
    },
    order_canceled: {
        'pt-BR': 'Pedido #{orderId} Cancelado',
        'en-US': 'Order #{orderId} Canceled',
        'ja-JP': '注文 #{orderId} キャンセル済み'
    },
    payment_error: {
        'pt-BR': 'Pedido #{orderId}. Erro no pagamento',
        'en-US': 'Order #{orderId}. Payment error',
        'ja-JP': '注文 #{orderId}。 支払いエラー'
    },
    payment_instructions: {
        'pt-BR': 'Instruções para pagamento do Pedido #{orderId}.',
        'en-US': 'Payment instructions for Order #{orderId}.',
        'ja-JP': '注文 #{orderId} の支払い手順。'
    },
    support: {
        'pt-BR': 'Suporte ao cliente',
        'en-US': 'Customer support',
        'ja-JP': 'カスタマーサポート'
    }
};

// -------- EXTRUTURAL -------
export const ADMIN_PAGINATION_MAX_LIMIT = 100 as const;
export const ADMIN_PAGINATION_DEFAULT = 20 as const;
export const NO_IMAGE = '/images/no-image.svg' as const;
export const NO_FAVICON = '/images/favicon.png' as const;
export const DEFAULT_BRAND_IDS = { DEFAULT: 1 } as const;
export const DEFAULT_CATEGORY_IDS = { DEFAULT: 1 } as const;
export const DEFAULT_CARRIER_IDS = { DEFAULT: 1 } as const;
export const DEFAULT_PAGE_IDS = { DEFAULT: 1 } as const;
export const DEFAULT_PAYMENT_API_IDS = { DEFAULT: 1 } as const;
export const TRANSLATION_ENTITY_TYPES = ['product', 'category', 'brand', 'page'] as const;
export const METADATA_TARGET_TYPES = ['brand', 'category', 'page', 'product', 'config'] as const;
export const FOOTER_TYPES = ['links', 'schedule', 'social_media', 'contact'] as const;
export const SLIDE_LOCATIONS = ['home', 'category', 'brand', 'page', 'product'] as const;

export const THEMES = [
    { valor: 'theme-green', chave: 'green' },
    { valor: 'theme-autumn', chave: 'autumn' },
    { valor: 'theme-pastel', chave: 'pastel' },
    { valor: 'theme-sunset', chave: 'sunset' },
    { valor: 'theme-modern', chave: 'modern' },
    { valor: 'theme-sea', chave: 'sea' },
    { valor: 'theme-minimal', chave: 'minimal' },
    { valor: 'theme-cyber', chave: 'cyber' },
    { valor: 'theme-gold', chave: 'gold' },
    { valor: 'theme-ice', chave: 'ice' },
    { valor: 'theme-darkfire', chave: 'darkfire' },
    { valor: 'theme-nature', chave: 'nature' },
] as const;

export const THEME_COLORS: Record<string, string[]> = {
    'theme-green': ['34 197 94', '22 163 74', '240 253 244', '74 222 128', '34 197 94', '5 46 22'],
    'theme-autumn': ['234 88 12', '202 138 4', '254 251 240', '249 115 22', '234 179 8', '43 24 12'],
    'theme-pastel': ['56 180 255', '255 170 150', '245 247 255', '96 165 250', '248 113 113', '18 20 40'],
    'theme-sunset': ['255 82 82', '255 160 0', '255 245 235', '255 100 100', '255 190 50', '34 20 20'],
    'theme-modern': ['20 184 166', '100 116 139', '248 250 252', '45 212 191', '148 163 184', '15 23 50'],
    'theme-sea': ['14 165 233', '45 212 191', '240 249 255', '56 189 248', '20 184 166', '1 30 50'],
    'theme-minimal': ['20 20 20', '115 115 115', '250 250 250', '240 240 240', '163 163 163', '18 28 28'],
    'theme-cyber': ['168 85 247', '34 211 238', '248 245 255', '192 132 252', '103 232 249', '25 15 30'],
    'theme-gold': ['180 140 40', '120 100 40', '255 253 245', '215 180 80', '180 160 80', '35 27 18'],
    'theme-ice': ['6 182 212', '165 243 252', '240 252 255', '34 211 238', '103 232 249', '10 35 50'],
    'theme-darkfire': ['220 38 38', '234 88 12', '255 245 245', '248 113 113', '251 146 60', '15 10 10'],
    'theme-nature': ['101 163 13', '120 113 108', '250 252 245', '132 204 22', '168 162 158', '15 35 20'],
} as const;

export const SEGMENT_BY_LOCALE: Record<string, Record<string, string>> = {
    category: { 'en-US': 'category', 'pt-BR': 'categoria' },
    brand: { 'en-US': 'brand', 'pt-BR': 'marca' },
    page: { 'en-US': 'page', 'pt-BR': 'pagina' },
    cart: { 'en-US': 'cart', 'pt-BR': 'carrinho' },
    checkout: { 'en-US': 'checkout', 'pt-BR': 'finalizar-compra' },
    checkout_confirm: { 'en-US': 'checkout/confirm', 'pt-BR': 'finalizar-compra/confirmacao' },
    login: { 'en-US': 'login', 'pt-BR': 'entrar' },
    maintenance: { 'en-US': 'maintenance', 'pt-BR': 'manutencao' },
    register: { 'en-US': 'register', 'pt-BR': 'cadastro' },
    register_confirm: { 'en-US': 'register/confirm', 'pt-BR': 'cadastro/confirmacao' },
    reset: { 'en-US': 'reset', 'pt-BR': 'redefinir' },
    reset_password: { 'en-US': 'reset/password', 'pt-BR': 'redefinir/senha' },
    setup: { 'en-US': 'setup', 'pt-BR': 'instalacao' },
    unauthorized: { 'en-US': 'unauthorized', 'pt-BR': 'nao-autorizado' },
    not_found: { 'en-US': 'not-found', 'pt-BR': 'pagina-nao-encontrada' },
    account: { 'en-US': 'account', 'pt-BR': 'conta' },
    account_address: { 'en-US': 'account/address', 'pt-BR': 'conta/endereco' },
    account_order: { 'en-US': 'account/order', 'pt-BR': 'conta/pedido' },
    account_profile: { 'en-US': 'account/profile', 'pt-BR': 'conta/perfil' }
};

export const ENTITY_TYPE_BY_PATH: Record<string, TranslationEntityTypes> = {
    '/product/[slug]': 'product',
    '/category/[slug]': 'category',
    '/brand/[slug]': 'brand',
    '/page/[slug]': 'page',
};
