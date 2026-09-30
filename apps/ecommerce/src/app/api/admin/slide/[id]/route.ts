import { NextRequest } from 'next/server';
import { updateSlide, deleteSlide } from '@/lib/cache/site-chrome-admin';
import { UpdateSlideRequestSchema } from '@/lib/schemas/slide';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getEnv } from '@/lib/cloudflare/context';
import { jsonNoStore } from '@/lib/utils';


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;
        const slideId = Number(id);
        if (!Number.isInteger(slideId)) return jsonNoStore({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }, 400);

        const body = await req.json();
        const parsed = UpdateSlideRequestSchema.safeParse(body);
        if (!parsed.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        const result = await updateSlide(slideId, parsed.data);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'NOT_FOUND' ? 404 : result.code === 'NO_CHANGES' ? 409 : 500);

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('PUT admin slide [id] route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;
        const slideId = Number(id);
        if (!Number.isInteger(slideId)) return jsonNoStore({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }, 400);

        const result = await deleteSlide(slideId);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, 404);

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('DELETE admin slide [id] route:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
