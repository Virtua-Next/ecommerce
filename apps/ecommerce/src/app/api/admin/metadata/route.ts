import { requireAdmin } from "@/lib/auth/require-admin";
import { getEnv } from "@/lib/cloudflare/context";
import { CreateMetadataRequestSchema } from "@/lib/schemas/metadata";
import { createMetadata } from "@/lib/db/metadata-admin";
import { jsonNoStore } from "@/lib/utils";
import { NextRequest } from "next/server";


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

        const body = await req.json();

        const parsedBody = CreateMetadataRequestSchema.safeParse(body);
        if (!parsedBody.success) return jsonNoStore({ success: false, error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);

        const result = await createMetadata(parsedBody.data);
        if (!result.success) return jsonNoStore({ success: false, message: result.error, error: result.code }, 409);

        return jsonNoStore(result.data, 201);

    } catch (err) {
        console.error('POST admin metadata:', err);
        return jsonNoStore({ success: false, error: 'Internal servererror', code: 'INTERNAL_ERROR' }, 500);
    }
}
