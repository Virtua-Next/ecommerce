import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonNoStore } from '@/lib/utils';
import { getEnv } from '@/lib/cloudflare/context';
import { updateCarrier } from '@/lib/cache/carrier-admin';
import { adminCarrierById } from '@/lib/db/carrier-admin';


export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const env = getEnv();
        const isProduction = env.NEXTJS_ENV === 'production';

        const auth = await requireAdmin(req, env);
        if (!auth.ok) {
            const response = jsonNoStore({ success: false, error: 'Unauthorized' }, 403);
            if (auth.status === 403) {
                response.cookies.set('token', '', {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 0,
                });
            }
            return response;
        }

        const { id } = await params;
        const carrierId = Number(id);
        if (!Number.isInteger(carrierId) || carrierId <= 0) return jsonNoStore({ success: false, error: 'Invalid carrier id', code: 'VALIDATION_ERROR' }, 400);

        const carrier = await adminCarrierById(carrierId);
        if (!carrier) return jsonNoStore(carrier, 404);

        if (!carrier.refresh_token || !carrier.client_id || !carrier.client_secret) return jsonNoStore({ success: false, error: 'Carrier is missing Melhor Envio credentials', code: 'VALIDATION_ERROR' }, 400);

        const tokenUrl = isProduction ? 'https://melhorenvio.com.br/oauth/token' : 'https://sandbox.melhorenvio.com.br/oauth/token';

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token: carrier.refresh_token,
                client_id: carrier.client_id,
                client_secret: carrier.client_secret,
            }),
        });

        if (!response.ok) {
            const errorData: any = await response.json().catch(() => null);
            return jsonNoStore(
                { success: false, error: errorData?.error_description ?? 'Failed to renew Melhor Envio token', code: 'MELHOR_ENVIO_TOKEN_RENEW_ERROR' },
                502
            );
        }

        const data: any = await response.json();

        const novosDados = {
            api_key: data.access_token,
            refresh_token: data.refresh_token ?? carrier.refresh_token,
            token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        };

        const updateResult = await updateCarrier(carrierId, novosDados);
        if (!updateResult.success) return jsonNoStore({ success: false, error: updateResult.error, code: updateResult.code }, 500);

        return jsonNoStore({ success: true, data: updateResult.data }, 200);

    } catch (err) {
        console.error('POST admin carrier melhor envio renew', err);
        return jsonNoStore({ success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' }, 500);
    }
}
