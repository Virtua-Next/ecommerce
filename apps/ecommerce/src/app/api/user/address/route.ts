import { NextRequest } from 'next/server';
import { listAddresses } from '@/lib/db/user';
import { CreateAddressSchema } from '@/lib/schemas/user';
import { createAddress } from '@/lib/db/user';
import { requireLoged } from '@/lib/auth/require-loged';
import { jsonNoStore } from '@/lib/utils';


export async function GET(req: NextRequest) {
    try {
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const addresses = await listAddresses(user.uuid);

        return jsonNoStore(addresses, 200);

    } catch (error) {
        console.error('GET user address route:', error);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const body = await req.json();

        const validatedData = CreateAddressSchema.omit({ user_id: true }).parse(body);
        if (!validatedData) return jsonNoStore({ success: false, error: 'Invalid address data', code: 'VALIDATION_ERROR' }, 400);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const newAddress = await createAddress(user.uuid, validatedData)
        if (!newAddress.success) return jsonNoStore({ success: false, error: newAddress.error, code: newAddress.code }, 404);

        return jsonNoStore(newAddress, 201);

    } catch (error: any) {
        console.error('POST user address route:', error);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
