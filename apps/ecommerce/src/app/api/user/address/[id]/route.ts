import { NextRequest } from 'next/server';
import { updateAddress, deleteAddress } from '@/lib/db/user';
import { requireLoged } from '@/lib/auth/require-loged';
import { UpdateAddressSchema } from '@/lib/schemas/user';
import { jsonNoStore } from '@/lib/utils';


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const { id } = await params;
        const addressId = Number(id);
        if (!Number.isInteger(addressId)) return jsonNoStore({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }, 400);

        const body = await req.json();
        const parsed = UpdateAddressSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        const result = await updateAddress(user.uuid, addressId, parsed.data);

        if (!result.success) {
            const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'NO_CHANGES' ? 409 : 500;
            return jsonNoStore({ success: false, error: result.error, code: result.code }, status);
        }

        return jsonNoStore(result, 200);

    } catch (error) {
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireLoged(req);
        if (!auth.ok) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const user = auth.user;
        if (!user) return jsonNoStore({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

        const { id } = await params;
        const addressId = Number(id);
        if (!Number.isInteger(addressId)) {
            return jsonNoStore({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }, 400);
        }

        const result = await deleteAddress(user.uuid, addressId);
        if (!result.success) {
            const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'VALIDATION_ERROR' ? 400 : 500;
            return jsonNoStore({ success: false, error: result.error, code: result.code }, status);
        }

        return jsonNoStore(result, 200);

    } catch (error) {
        console.error('DELETE user address [id] route:', error);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
