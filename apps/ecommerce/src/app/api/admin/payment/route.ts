import { NextRequest } from 'next/server';
import { createPaymentAPI } from '@/lib/cache/payment-admin';
import { CreatePaymentApiRequestSchema } from '@/lib/schemas/payment';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { jsonNoStore, resolveLocale } from "@/lib/utils";
import { DEFAULT_LANGUAGE } from '@/lib/constants';
import { adminAllPaymentAPIs } from '@/lib/db/payment-admin';


export async function GET(req: NextRequest) {
    try {
        const env = getEnv();
        const auth = await requireAdmin(req, env);
        if (!auth.ok) {
            const response = jsonNoStore({ success: false, error: 'Unauthorized' }, 403);
            if (auth.status === 403) {
                response.cookies.set('token', '', {
                    httpOnly: true,
                    secure: env.NEXTJS_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 0,
                });
            }
            return response;
        }

        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;
        const paymentAPIs = await adminAllPaymentAPIs(requestedLocale);

        return jsonNoStore(paymentAPIs, 200);

    } catch (err) {
        console.error('GET admin payment route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const env = getEnv();
        const auth = await requireAdmin(req, env);
        if (!auth.ok) {
            const response = jsonNoStore({ success: false, error: 'Unauthorized' }, 403);
            if (auth.status === 403) {
                response.cookies.set('token', '', {
                    httpOnly: true,
                    secure: env.NEXTJS_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 0,
                });
            }
            return response;
        }

        const body = await req.json();

        const parsed = CreatePaymentApiRequestSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        const result = await createPaymentAPI(parsed.data);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'VALIDATION_ERROR' || result.code === 'DUPLICATE' ? 400 : 500);

        return jsonNoStore(result.data, 201)

    } catch (err) {
        console.error('POST admin payment route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
