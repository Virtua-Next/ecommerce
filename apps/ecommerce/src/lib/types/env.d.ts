export type Env = {
    NEXTJS_ENV: string;
    JWT: string;
    JWT_EXPIRES_IN?: string;
    DB_URL: string;
    COOKIE_DOMAIN: string;
    DOMAIN: string;
    SITE_NAME: string;
    API_URL: string
    CORS_ORIGIN: string
    DB: D1Database
    VN_CPLANE: string
    VN_PUBLIC_LICENCE: string
    VN_LICENCE_KEY: string
}

export const html: any;

declare global {
    interface Window {
        MercadoPago: new (publicKey: string, options?: { locale?: string }) => any;
    }
}
