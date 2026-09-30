import { getDb } from "@/lib/cloudflare/context";
import { IAddress, ICreateAddress, IUpdateAddress, IUpdateUser, IUser, IChangePassword, CreateUserInput } from "@/lib/schemas/user";
import { CountryCode, IResult } from "@/lib/types/generic";
import { getUserIdByUuid } from "./auth";
import { hashPassword, verifyPassword } from "@/lib/cryptography";
import { COUNTRY_CONFIGS } from "@/lib/schemas/country-configs";


// USER


// by id
export async function getUserByUuid(uuid: string | null): Promise<IUser | null> {
    if (!uuid) return null;

    try {
        const db = getDb();
        const user = await db
            .prepare(`
                SELECT
                    uuid,
                    user_name,
                    country,
                    tax_id,
                    email,
                    phone,
                    active,
                    profile_id,
                    preferred_language                    
                FROM user 
                WHERE uuid = ?`)
            .bind(uuid)
            .first();

        return user as IUser | null;

    } catch (err) {
        throw err;
    }
}

// by email ( be careful... this function also returns the password )
/**
 * Be careful... this function also returns the password
 * @param email 
 * @returns Partial IUser with uuid, user_name, user_password, email, active, preferred_language
 */
export async function getUserByEmail(email: string): Promise<IUser | null> {
    try {
        const db = getDb();
        const user = await db
            .prepare(`
                SELECT
                    uuid,
                    user_name, 
                    user_password,
                    email, 
                    active, 
                    preferred_language
                FROM user 
                WHERE email = ?`)
            .bind(email)
            .first();

        return user as IUser | null;

    } catch (err) {
        throw err;
    }
}

// frontend register
export async function register({ user, address }: CreateUserInput): Promise<IResult<IUser>> {
    try {
        const db = getDb();
        const userUuid = crypto.randomUUID();

        const [userResult] = await db.batch([
            db
                .prepare(`
          INSERT INTO user (uuid, user_name, country, tax_id, email, phone, user_password, active, profile_id, preferred_language)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id, uuid, user_name, country, tax_id, email, phone, active, profile_id, preferred_language`)
                .bind(
                    userUuid,
                    user.user_name,
                    user.country,
                    user.tax_id ?? null,
                    user.email,
                    user.phone ?? null,
                    user.user_password,
                    user.active ? 1 : 0,
                    user.profile_id,
                    user.preferred_language),

            db
                .prepare(`
          INSERT INTO tb_address (country_code, zip, street, address_number, complement, neighborhood, city, address_state, address_primary, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT id FROM user WHERE uuid = ?))`)
                .bind(
                    user.country,
                    address.zip,
                    address.street,
                    address.address_number,
                    address.complement ?? null,
                    address.neighborhood ?? null,
                    address.city,
                    address.address_state,
                    1,
                    userUuid),
        ]);

        const insertedUser = userResult.results?.[0] as IUser | undefined;
        if (!insertedUser) return { success: false, error: 'Failed to create user', code: 'INTERNAL_ERROR' };

        return { success: true, data: insertedUser, message: 'User register successfully' };
    } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : '';

        const duplicateError = parseDuplicateFieldError(message, user.country);
        if (duplicateError) return duplicateError;

        console.error('register database error:', err);
        throw err;
    }
}

// update user
export async function updateUser(userUuid: string, data: Partial<IUpdateUser>): Promise<IResult<IUser>> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(userUuid);
        if (!userId) return { success: false, error: 'User not Found', code: 'NOT_FOUND' };

        const updates: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            user_name: 'user_name',
            email: 'email',
            phone: 'phone',
            country: 'country',
            tax_id: 'tax_id',
            preferred_language: 'preferred_language'
        };

        Object.keys(data).forEach(key => {
            if (key in fieldMap && data[key as keyof IUpdateUser] !== undefined) {
                updates.push(`${fieldMap[key]} = ?`);
                values.push(data[key as keyof IUpdateUser]);
            }
        });

        if (updates.length === 0) return { success: false, error: 'No fields to update', code: 'NO_CHANGES' };

        const updateResult = await db
            .prepare(`UPDATE user SET ${updates.join(', ')} WHERE id = ?`)
            .bind(...values, userId)
            .run();

        if (updateResult.meta.changes === 0) return { success: false, error: 'Failed to update user', code: 'INTERNAL_ERROR' };

        const updatedUser = await db
            .prepare(`SELECT * FROM user WHERE id = ?`)
            .bind(userId)
            .first() as IUser;

        return {
            success: true,
            data: updatedUser,
            message: 'User updated successfully'
        };

    } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : '';
        if (data.country) {
            const duplicateError = parseDuplicateFieldError(message, data.country);
            if (duplicateError) return duplicateError;
        } else if (message.includes('UNIQUE constraint failed')) {
            if (message.includes('user.email')) return { success: false, error: 'Email already exists', code: 'DUPLICATE_EMAIL' };
            if (message.includes('user.country') && message.includes('user.tax_id')) return { success: false, error: 'Document already exists', code: 'DUPLICATE_TAX_ID' };
            if (message.includes('user.phone')) return { success: false, error: 'Phone already exists', code: 'DUPLICATE_PHONE' };
        }

        console.error('updateUser database error:', err);
        throw err;
    }
}

// change pawword
export async function changePassword(uuid: string, data: IChangePassword): Promise<IResult<string>> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(uuid);
        if (!userId) return { success: false, error: 'User not Found', code: 'NOT_FOUND' };

        const existingUser = await db
            .prepare("SELECT user_password FROM user WHERE uuid = ?")
            .bind(uuid)
            .first<IUser>();

        if (!existingUser) return { success: false, error: "User not found", code: 'NOT_FOUND' };

        if (data.current_password) {
            const passwordCorrect = await verifyPassword(
                data.current_password,
                existingUser.user_password
            );
            if (!passwordCorrect) return { success: false, error: "Current password is incorrect", code: 'VALIDATION_ERROR' };
        }

        if (data.new_password) {
            const hashedPassword = await hashPassword(data.new_password);
            await db
                .prepare("UPDATE user SET user_password = ? WHERE id = ?")
                .bind(hashedPassword, userId)
                .run();
        }

        return {
            success: true,
            message: "Password changed successfully"
        };

    } catch (err) {
        console.error('changePassword database error', err);
        throw err;
    }
}

// confirm password
export async function confirmPassword(uuid: string, password: string): Promise<IResult<string>> {
    try {
        if (!password) return { success: false, error: 'Password is required', code: 'VALIDATION_ERROR' };

        const db = getDb();
        const userId = await getUserIdByUuid(uuid);
        if (!userId) return { success: false, error: 'User not Found', code: 'NOT_FOUND' };

        const hashedPassword = await hashPassword(password);

        await db
            .prepare("UPDATE user SET user_password = ? WHERE id = ?")
            .bind(hashedPassword, userId)
            .run();

        return {
            success: true,
            message: "Password changed successfully"
        };

    } catch (err) {
        console.error('confirmPassword database error', err);
        throw err;
    }
}


// ADDRESS


// list addresses
export async function listAddresses(uuid: string, filters?: { primary?: boolean }): Promise<IAddress[]> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(uuid)

        let whereClause = "WHERE user_id = ?";
        const params: any[] = [userId];

        if (filters?.primary !== undefined) {
            whereClause += " AND address_primary = ?";
            params.push(filters.primary ? 1 : 0);
        }

        const { results } = await db
            .prepare(`
                SELECT 
                    id,
                    country_code,
                    zip,
                    street,
                    address_number,
                    complement,
                    neighborhood,
                    city,
                    address_state,
                    address_primary,
                    user_id
                FROM tb_address ${whereClause}
                ORDER BY address_primary DESC`)
            .bind(...params)
            .all<IAddress>();

        return results;

    } catch (err) {
        console.error('listAddresses database error', err);
        throw err;
    }
}

// create address
export async function createAddress(uuid: string, data: Partial<ICreateAddress>): Promise<IResult<IAddress>> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(uuid);
        if (!userId) return { success: false, error: 'User not Found', code: 'NOT_FOUND' };

        const hasAddress = await db
            .prepare(`SELECT id FROM tb_address WHERE user_id = ? LIMIT 1`)
            .bind(userId)
            .first();

        const isPrimary = !hasAddress ? true : data.address_primary === true;

        const insertStmt = db
            .prepare(`
                INSERT INTO tb_address (
                    country_code,
                    zip, 
                    street, 
                    address_number, 
                    complement, 
                    neighborhood, 
                    city, 
                    address_state,
                    address_primary,
                    user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(
                data.country_code,
                data.zip,
                data.street,
                data.address_number,
                data.complement || null,
                data.neighborhood,
                data.city,
                data.address_state,
                isPrimary ? 1 : 0,
                userId);

        let meta;

        if (hasAddress && isPrimary) {
            const unsetStmt = db
                .prepare(`UPDATE tb_address SET address_primary = 0 WHERE user_id = ? AND address_primary = 1`)
                .bind(userId);

            const results = await db.batch([unsetStmt, insertStmt]);
            meta = results[1].meta;
        } else {
            const result = await insertStmt.run();
            meta = result.meta;
        }

        const address = await getAddressById(meta.last_row_id) as IAddress;

        return {
            success: true,
            data: address,
            message: "Address created successfully"
        };

    } catch (err) {
        console.error('createAddress database error:', err);
        throw err;
    }
}

// update address
export async function updateAddress(userUuid: string, addressId: number, data: Partial<IUpdateAddress>): Promise<IResult<IAddress>> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(userUuid);
        if (!userId) return { success: false, error: 'User not Found', code: 'NOT_FOUND' };

        const existingAddress = await db
            .prepare(`SELECT * FROM tb_address WHERE id = ? AND user_id = ?`)
            .bind(addressId, userId)
            .first();

        if (!existingAddress) return { success: false, error: 'Address not found or does not belong to this user', code: 'NOT_FOUND' };

        if (data.address_primary === false) {
            const addressCount = await db
                .prepare(`SELECT COUNT(*) as count FROM tb_address WHERE user_id = ?`)
                .bind(userId)
                .first() as { count: number };

            if (addressCount.count === 1) return { success: false, error: 'Cannot unset primary address. User must have at least one primary address.', code: 'VALIDATION_ERROR' };

            const hasOtherPrimary = await db
                .prepare(`SELECT id FROM tb_address WHERE user_id = ? AND address_primary = 1 AND id != ?`)
                .bind(userId, addressId)
                .first();

            if (!hasOtherPrimary) return { success: false, error: 'Cannot unset primary address. Another address must be set as primary first.', code: 'VALIDATION_ERROR' };
        }

        const updates: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            country_code: 'country_code',
            zip: 'zip',
            street: 'street',
            address_number: 'address_number',
            complement: 'complement',
            neighborhood: 'neighborhood',
            city: 'city',
            address_state: 'address_state',
            address_primary: 'address_primary'
        };

        Object.keys(data).forEach(key => {
            if (key in fieldMap && data[key as keyof IUpdateAddress] !== undefined) {
                const dbField = fieldMap[key];
                if (key === 'address_primary') {
                    updates.push(`${dbField} = ?`);
                    values.push(data.address_primary ? 1 : 0);
                } else {
                    updates.push(`${dbField} = ?`);
                    values.push(data[key as keyof IUpdateAddress]);
                }
            }
        });

        if (updates.length === 0) return { success: false, error: 'No fields to update', code: 'NO_CHANGES' };

        const updateStmt = db
            .prepare(`UPDATE tb_address SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
            .bind(...values, addressId, userId);

        const statements = [];

        if (data.address_primary === true) {
            const unsetOthersStmt = db
                .prepare(`UPDATE tb_address SET address_primary = 0 WHERE user_id = ? AND address_primary = 1 AND id != ?`)
                .bind(userId, addressId);
            statements.push(unsetOthersStmt);
        }

        statements.push(updateStmt);

        const batchResults = await db.batch(statements);
        const updateResult = batchResults[batchResults.length - 1];

        if (updateResult.meta.changes === 0) return { success: false, error: 'Failed to update address', code: 'INTERNAL_ERROR' };

        const updatedAddress = await db
            .prepare(`SELECT * FROM tb_address WHERE id = ? AND user_id = ?`)
            .bind(addressId, userId)
            .first() as IAddress;

        return {
            success: true,
            data: updatedAddress,
            message: 'Address update successfully'
        };

    } catch (err) {
        console.error('updateAddress database error', err);
        throw err;
    }
}

// delete address
export async function deleteAddress(uuid: string, addressId: number): Promise<IResult<null>> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(uuid);
        if (!userId) return { success: false, error: 'User not Found', code: 'NOT_FOUND' };

        const existingAddress = await db
            .prepare(`SELECT * FROM tb_address WHERE id = ? AND user_id = ?`)
            .bind(addressId, userId)
            .first() as IAddress | null;

        if (!existingAddress) return { success: false, error: 'Address not found or does not belong to this user', code: 'NOT_FOUND' };

        const deleteStmt = db
            .prepare(`DELETE FROM tb_address WHERE id = ? AND user_id = ?`)
            .bind(addressId, userId);

        let meta;

        if (existingAddress.address_primary) {

            const nextPrimary = await db
                .prepare(`SELECT id FROM tb_address WHERE user_id = ? AND id != ? ORDER BY id ASC LIMIT 1`)
                .bind(userId, addressId)
                .first() as { id: number } | null;

            if (nextPrimary) {
                const promoteStmt = db
                    .prepare(`UPDATE tb_address SET address_primary = 1 WHERE id = ? AND user_id = ?`)
                    .bind(nextPrimary.id, userId);

                const results = await db.batch([deleteStmt, promoteStmt]);
                meta = results[0].meta;
            } else {
                const result = await deleteStmt.run();
                meta = result.meta;
            }
        } else {
            const result = await deleteStmt.run();
            meta = result.meta;
        }

        if (meta.changes === 0) return { success: false, error: 'Failed to delete address', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            message: "Address deleted successfully"
        };

    } catch (err) {
        console.error('deleteAddress database error', err);
        throw err;
    }
}

// by id
async function getAddressById(id: number): Promise<IAddress | null> {
    try {
        const db = getDb();
        const result = await db
            .prepare(`
                SELECT 
                    id,
                    country_code,
                    zip,
                    street,
                    address_number,
                    complement,
                    neighborhood,
                    city,
                    address_state,
                    address_primary,
                    user_id
                FROM tb_address 
                WHERE id = ?`)
            .bind(id)
            .first();

        return result as IAddress | null;

    } catch (err) {
        throw err;
    }
}

// HELPER


function parseDuplicateFieldError(message: string, country: string): IResult<never> | null {
    if (!message.includes('UNIQUE constraint failed')) return null;

    if (message.includes('user.email')) {
        return { success: false, error: 'Email already exists', code: 'DUPLICATE_EMAIL' };
    }

    // índice composto (country, tax_id) — SQLite reporta as colunas, não o nome do índice
    if (message.includes('user.country') && message.includes('user.tax_id')) {
        const taxIdLabel = COUNTRY_CONFIGS[country as CountryCode].taxIdLabel;
        return { success: false, error: `${taxIdLabel} already exists`, code: 'DUPLICATE_TAX_ID' };
    }

    if (message.includes('user.phone')) {
        return { success: false, error: 'Phone already exists', code: 'DUPLICATE_PHONE' };
    }

    return null;
}
