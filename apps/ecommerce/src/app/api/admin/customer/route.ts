import { NextRequest } from 'next/server';
import { capitalizeWords, jsonNoStore } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { hashPassword } from '@/lib/cryptography';
import { adminAllCustomers, adminCreateCustomer } from '@/lib/db/user-admin';
import { ADMIN_PAGINATION_DEFAULT, ADMIN_PAGINATION_MAX_LIMIT, DEFAULT_LANGUAGE } from '@/lib/constants';
import { IUser } from '@/lib/schemas/user';


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

        const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) ?? 1);
        const limit = Math.min(ADMIN_PAGINATION_MAX_LIMIT, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) ?? ADMIN_PAGINATION_DEFAULT));

        const result = await adminAllCustomers({ page, limit });

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('GET admin customer route:', err);
        return jsonNoStore({ success: false, error: 'Internal serveer error', code: 'INTERNAL_ERROR' }, 500);
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

        const body = await req.json() as any;

        if (!body.user_name?.trim() || !body.email?.trim() || !body.user_password || !body.country) return jsonNoStore({ success: false, error: 'Name, Email, Password, Country is required', code: 'VALIDATION_ERROR' }, 400);


        const result = await adminCreateCustomer({
            user_name: capitalizeWords(body.user_name.trim()),
            email: body.email.trim().toLowerCase(),
            country: body.country,
            tax_id: body.tax_id || undefined,
            phone: body.phone || undefined,
            profile_id: body.profile_id || 2,
            active: body.active !== undefined ? body.active : true,
            preferred_language: body.preferred_language || DEFAULT_LANGUAGE,
            user_password: await hashPassword(body.user_password),
        } as IUser);

        if (!result.success) {
            const constraintErr = ['DUPLICATE_EMAIL', 'DUPLICATE_TAX_ID', 'DUPLICATE_PHONE'].includes(result.code ?? '');
            return jsonNoStore({ success: false, error: result.error, code: result.code }, constraintErr ? 409 : 500);
        }

        return jsonNoStore({ success: true, data: result.data, message: 'Customer created successfully' }, 201);

    } catch (err) {
        console.error('POST admin customer route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
