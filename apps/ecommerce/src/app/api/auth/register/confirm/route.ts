import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { jsonNoStore } from '@/lib/utils';
import { getEnv } from '@/lib/cloudflare/context';
import { register } from '@/lib/db/user';
import { COUNTRY_CONFIGS } from '@/lib/schemas/country-configs';
import { CountryCode } from '@/lib/types/generic';
import { IAddress, IUser } from '@/lib/schemas/user';


export async function POST(req: NextRequest) {
    try {
        const env = getEnv();
        const body: any = await req.json();

        if (!body.token) return jsonNoStore({ success: false, error: 'Token is required', code: 'INVALID_TOKEN' }, 400);

        let decodedPayload;
        try {
            const { payload } = await jwtVerify(
                body.token,
                new TextEncoder().encode(env.JWT)
            );
            decodedPayload = payload;
        } catch (err) {
            console.error('Token verification failed:', err);
            return jsonNoStore({ success: false, error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, 400);
        }

        const { user, address } = decodedPayload as { user: IUser; address: IAddress };

        if (!user || !address) return jsonNoStore({ success: false, error: 'Invalid payload data', code: 'VALIDATION_ERROR' }, 400);

        const config = COUNTRY_CONFIGS[user.country as CountryCode];
        if (user.tax_id) {
            if (!config.validateTaxId(user.tax_id)) return jsonNoStore({ success: false, error: `Invalid ${config.taxIdLabel}`, code: 'TAX_ID_VALIDATION_ERROR' }, 400);

        } else if (config.taxIdRequired) {
            return jsonNoStore({ success: false, error: `${config.taxIdLabel} required`, code: 'TAX_ID_REQUIRED' }, 400);
        }

        const safeUser = {
            ...user,
            profile_id: 2,
            active: true
        };

        const result = await register({ user: safeUser, address });

        if (!result.success) {
            const status = result.code === 'INTERNAL_ERROR' ? 500 : 400;
            return jsonNoStore({ success: false, error: result.error, code: result.code }, status);
        }

        return jsonNoStore({ success: true, message: 'User registered successfully', data: result.data }, 201);

    } catch (err) {
        console.error('POST auth register confirm route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
