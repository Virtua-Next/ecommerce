import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { toBoolean, jsonNoStore } from '@/lib/utils';
import { getEnv } from '@/lib/cloudflare/context';
import { createCarrier, updateCarrier } from '@/lib/cache/carrier-admin';
import { CreateCarrierRequestSchema, UpdateCarrierRequestSchema } from '@/lib/schemas/carrier';
import { SupportedLanguage } from "@/lib/types/generic";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";


export async function GET(request: Request) {
    const env = getEnv();
    const isproduction = env.NEXTJS_ENV === 'production';
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const cookieStore = await cookies();
    const savedState = cookieStore.get('melhorEnvioState')?.value;
    const authCookie = cookieStore.get('melhorEnvioAuth')?.value;

    if (!code || !state || state !== savedState || !authCookie) return jsonNoStore({ success: false, error: 'Unauthorized' }, 403);

    const { client_id, client_secret, origin_zip, free_shipping, free_shipping_from, active, carrier_id, domain } = JSON.parse(atob(authCookie));

    const tokenResponse = await fetch(`${isproduction ? 'https://melhorenvio.com.br/oauth/token' : 'https://sandbox.melhorenvio.com.br/oauth/token'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: client_id,
            client_secret: client_secret,
            redirect_uri: `${domain}/api/melhor-envio/auth`,
            code,
        }),
    });

    const tokens = await tokenResponse.json() as any;

    if (!tokenResponse.ok) {
        console.error('Erro ao trocar code por token:', tokens);
        return jsonNoStore({ success: false, error: tokens }, 400);
    }

    const usuarioResponse = await fetch(`${isproduction ? 'https://melhorenvio.com.br/api/v2/me' : 'https://sandbox.melhorenvio.com.br/api/v2/me'}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: 'application/json',
        },
    });

    const usuario = await usuarioResponse.json() as any;
    const cepMelhorEnvio = usuario.address?.postal_code;
    const dados = {
        api_key: tokens.access_token,
        client_id,
        client_secret,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        refresh_token: tokens.refresh_token,
        origin_zip: cepMelhorEnvio ?? origin_zip,
        free_shipping: toBoolean(free_shipping),
        free_shipping_from: parseFloat(free_shipping_from) ?? 0,
        carrier_type: 'melhor_envio',
        price: 0,
        carrier_service: '.Pac',
        calculation_method: 'api',
        active: toBoolean(active),
        translations: SUPPORTED_LANGUAGES.reduce((acc, lang) => {
            acc[lang] = { carrier_name: `Melhor Envio (${lang.toUpperCase()})` };
            return acc;
        }, {} as Record<SupportedLanguage, { carrier_name: string }>),
    }

    try {
        const result = carrier_id
            ? await (async () => {
                const parsed = UpdateCarrierRequestSchema.safeParse(dados);
                if (!parsed.success) {
                    throw { message: 'Invalid payload', issues: parsed.error.issues };
                }
                return updateCarrier(Number(carrier_id), parsed.data);
            })()
            : await (async () => {
                const parsed = CreateCarrierRequestSchema.safeParse(dados);
                if (!parsed.success) {
                    throw { message: 'Invalid payload', issues: parsed.error.issues };
                }
                return createCarrier(parsed.data);
            })();

        if (!result.success) {
            throw { message: result.error };
        }

        return NextResponse.redirect(`${domain}/admin/config/config-carrier?success=1`);

    } catch (error: any) {
        console.error('GET melhor-envio auth route:', error);
        return NextResponse.redirect(`${domain}/admin/config/config-carrier?success=0&error=${encodeURIComponent(error.message ?? 'unknown')}`);
    }
}
