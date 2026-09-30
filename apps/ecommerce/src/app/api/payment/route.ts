import { NextRequest, NextResponse } from 'next/server';
import { getCachedPaymentAPIs } from '@/lib/cache/payment';
import { requireLoged } from '@/lib/auth/require-loged';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function GET(req: NextRequest) {
    try {
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;

        const paymentApis = await getCachedPaymentAPIs(requestedLocale);

        return NextResponse.json(paymentApis);

    } catch (err) {
        console.error('GET api payment route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
