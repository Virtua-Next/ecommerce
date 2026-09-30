import { NextRequest } from 'next/server';
import { decodeToken } from './decode-token';
import { getToken } from './get-token';


export interface AuthResult {
    ok: boolean;
    user?: {
        profile_id: number;
        uuid: string;
        email?: string;
        user_name?: string;
    };
    error?: string;
    status?: number;
}

export const requireAdmin = async (req: NextRequest, env: CloudflareEnv): Promise<AuthResult> => {
    try {
        if (!req) {
            return {
                ok: false,
                error: 'Invalid request',
                status: 400
            };
        }

        const token = await getToken();
        if (!token) {
            return {
                ok: false,
                error: 'Token not found. Please login again.',
                status: 401
            };
        }

        if (!env.JWT) {
            return {
                ok: false,
                error: 'Server misconfigured',
                status: 500
            };
        }

        const decodedToken = await decodeToken(token);
        if (!decodedToken) {
            return {
                ok: false,
                error: 'Token not found. Please login again.',
                status: 401
            };
        }

        const user = {
            profile_id: decodedToken.profile_id || 0,
            uuid: String(decodedToken.uuid || ''),
            email: decodedToken.email || '',
            user_name: decodedToken.user_name || '',
        };

        if (!user.profile_id || !user.uuid) {
            return {
                ok: false,
                error: 'Invalid user data.',
                status: 401
            };
        }

        if (user.profile_id !== 1) {
            return {
                ok: false,
                error: 'Access denied',
                status: 403
            };
        }

        return {
            ok: true,
            user,
            status: 200
        };

    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Server error',
            status: 500
        };
    }
};
