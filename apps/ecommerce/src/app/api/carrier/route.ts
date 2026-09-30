import { NextRequest, NextResponse } from 'next/server';
import { getCachedCarriers } from '@/lib/cache/carrier';
import { requireLoged } from '@/lib/auth/require-loged';
import { jsonNoStore, resolveLocale } from '@/lib/utils';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function GET(req: NextRequest) {
    try {
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const requestedLocale = resolveLocale(req.nextUrl.searchParams.get('locale')) ?? DEFAULT_LANGUAGE;

        const country = req.nextUrl.searchParams.get('country')?.toUpperCase() ?? '';
        if (!/^[A-Z]{2}$/.test(country)) return jsonNoStore({ success: false, error: 'Invalid country', code: 'INVALID_COUNTRY' }, 400);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const carriers = await getCachedCarriers(country, requestedLocale);
        if (!carriers) return jsonNoStore(carriers, 404);

        return NextResponse.json(carriers);

    } catch (err) {
        console.error('GET carrier', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
