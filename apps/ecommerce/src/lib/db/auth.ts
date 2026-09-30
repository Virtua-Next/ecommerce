import { getDb } from "../cloudflare/context";
import { verifyPassword } from "../cryptography";
import { IUser } from "../schemas/user";


export async function authenticateUser(email: string, password: string): Promise<IUser | null> {
    try {
        const db = getDb();
        const user = await db
            .prepare(`
                SELECT
                    id,
                    uuid,
                    user_name, 
                    phone, 
                    email, 
                    user_password, 
                    active, 
                    profile_id
                FROM user
                WHERE email = ?
            `)
            .bind(email)
            .first<IUser>();

        if (!user || !(await verifyPassword(password, user.user_password))) return null;

        return user

    } catch (err) {
        console.error('Error authenticate useer', err);
        throw err;
    }
}

export async function getUserIdByUuid(uuid: string): Promise<number | null> {
    try {
        const db = getDb();
        const user = await db
            .prepare('SELECT id FROM user WHERE uuid = ?')
            .bind(uuid)
            .first<IUser>();

        if (!user) return null;

        return user.id;

    } catch (err) {
        console.error('Error getting user by uuid', err)
        throw err;
    }
}
