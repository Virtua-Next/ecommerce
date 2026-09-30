import { z } from 'zod';
import { NextRequest } from 'next/server';
import { getEnv } from '@/lib/cloudflare/context';
import { requireAdmin } from '@/lib/auth/require-admin';
import { UpdateMetadataRequestSchema, } from '@/lib/schemas/metadata';
import { METADATA_TARGET_TYPES } from '@/lib/constants';
import { jsonNoStore } from '@/lib/utils';
import { deleteMetadata, getMetadataByTarget, updateMetadata } from '@/lib/db/metadata-admin';


export async function GET(req: NextRequest, { params }: { params: Promise<{ targetType: string; targetId: string }> }) {
    try {
        const env = getEnv()
        const TargetTypeEnum = z.enum(METADATA_TARGET_TYPES);
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

        const { targetType, targetId } = await params;

        const parsedType = TargetTypeEnum.safeParse(targetType);
        if (!parsedType.success) return jsonNoStore({ success: false, error: 'Invalid targetType', code: 'VALIDATION_ERROR' }, 400);

        const numericTargetId = Number(targetId);
        if (!Number.isInteger(numericTargetId)) return jsonNoStore({ success: false, error: 'Invalid targetId', code: 'VALIDATION_ERROR' }, 400);

        const metadata = await getMetadataByTarget(parsedType.data, numericTargetId);
        if (!metadata) return jsonNoStore(metadata, 404);

        return jsonNoStore(metadata, 200);

    } catch (err) {
        console.error('GET admin metadata [targetType] [targetid]:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ targetType: string; targetId: string }> }) {
    try {
        const env = getEnv()
        const TargetTypeEnum = z.enum(METADATA_TARGET_TYPES);

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

        const { targetType, targetId } = await params;

        const parsedType = TargetTypeEnum.safeParse(targetType);
        if (!parsedType.success) return jsonNoStore({ success: false, error: 'Invalid targetType', code: 'VALIDATION_ERROR' }, 400);

        const numericTargetId = Number(targetId);
        if (!Number.isInteger(numericTargetId)) return jsonNoStore({ success: false, error: 'Invalid targetId', code: 'VALIDATION_ERROR' }, 400);

        const body = await req.json();

        const parsedBody = UpdateMetadataRequestSchema.safeParse(body);
        if (!parsedBody.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        const result = await updateMetadata(parsedType.data, numericTargetId, parsedBody.data);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, result.code === 'NOT_FOUND' ? 404 : result.code === 'NO_CHANGES' ? 409 : 500);

        return jsonNoStore(result.data, 200);

    } catch (err) {
        console.error('PUT admin metadata [targetType] [targetId]:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ targetType: string; targetId: string }> }) {
    try {
        const env = getEnv()
        const TargetTypeEnum = z.enum(METADATA_TARGET_TYPES);

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

        const { targetType, targetId } = await params;

        const parsedType = TargetTypeEnum.safeParse(targetType);
        if (!parsedType.success) return jsonNoStore({ success: false, error: 'Invalid targetType', code: 'VALIDATION_ERROR' }, 400);

        const numericTargetId = Number(targetId);
        if (!Number.isInteger(numericTargetId)) return jsonNoStore({ success: false, error: 'Invalid targetId', code: 'VALIDATION_ERROR' }, 400);

        const result = await deleteMetadata(parsedType.data, numericTargetId);
        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: result.code }, 404);

        return jsonNoStore(result, 200);

    } catch (err) {
        console.error('DELETE admin metadata [targetType] [targetId]:', err);
        return jsonNoStore({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
}
