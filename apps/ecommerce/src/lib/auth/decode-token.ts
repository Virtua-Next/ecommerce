import { jwtVerify } from "jose";
import { getEnv } from "../cloudflare/context";


export interface DecodedUser {
    profile_id: number;
    uuid: string;
    email?: string;
    user_name?: string;
}

export async function decodeToken(token: string | null): Promise<DecodedUser | null> {
    try {
        if (!token) { return null }

        const env = getEnv();
        if (!env.JWT) {
            console.error('JWT não configurado no ambiente');
            return null;
        }

        let decodedToken: any;
        try {
            const { payload } = await jwtVerify(
                token,
                new TextEncoder().encode(env.JWT)
            );
            decodedToken = payload;
        } catch (jwtError) {
            console.error('Erro ao verificar JWT:', jwtError);
            return null;
        }

        const user = {
            profile_id: decodedToken.profile_id || 0,
            uuid: decodedToken.uuid || 0,
            email: decodedToken.email || '',
            user_name: decodedToken.user_name || '',
        };

        if (!user.profile_id || !user.uuid) {
            console.error('Token sem profile_id ou uuid:', decodedToken);
            return null;
        }

        return user;

    } catch (error) {
        console.error('Erro ao decodificar token:', error);
        return null;
    }
};
