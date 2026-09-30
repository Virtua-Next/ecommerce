import { NextRequest, NextResponse } from 'next/server';
import { getCachedPaymentMethods } from '@/lib/cache/payment';
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
        
        const paymentMethods = await getCachedPaymentMethods(requestedLocale);

        return NextResponse.json(paymentMethods);

    } catch (err) {
        console.error('GET payment methods route:', err);
        return jsonNoStore({ success: false, error: 'Internal serve error', code: 'INTERNAL_ERROR' }, 500);
    }
}
