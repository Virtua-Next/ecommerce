import { cookies } from "next/headers";
import { unstable_rethrow } from 'next/navigation';


export async function getToken(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value || null;

        return token;

    } catch (err) {
        unstable_rethrow(err);
        console.error('Error getting token:', err);
        return null;
    }
};
