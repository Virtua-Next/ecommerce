import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonNoStore } from '@/lib/utils';
import { getEnv } from '@/lib/cloudflare/context';


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

        const body: any = await req.json().catch(() => ({}));
        const token = body?.token;
        if (!token || typeof token !== 'string') return jsonNoStore({ success: false, error: 'Token is required', code: 'VALIDATION_ERROR' }, 400);

        const revokeUrl = isProduction ? 'https://melhorenvio.com.br/oauth/revoke' : 'https://sandbox.melhorenvio.com.br/oauth/revoke';
        try {
            await fetch(revokeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
        } catch (revokeError) {
            console.error('Failed to revoke Melhor Envio Token:', revokeError);
        }

        return jsonNoStore({ success: true, message: 'Token revocation requested' }, 200);

    } catch (err) {
        console.error('POST admin carrier melhor envio revoke', err);
        return jsonNoStore({ success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' }, 500);
    }
}
