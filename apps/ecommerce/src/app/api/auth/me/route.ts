import { NextResponse } from 'next/server';
import { getToken } from '@/lib/auth/get-token';
import { decodeToken } from '@/lib/auth/decode-token';
import { getUserByUuid } from '@/lib/db/user';


export async function GET() {
    const token = await getToken();
    const decoded = await decodeToken(token);

    if (!decoded?.uuid) {
        return NextResponse.json({ user: null });
    }

    const user = await getUserByUuid(decoded.uuid);
    return NextResponse.json({ user: user ?? null });
}
