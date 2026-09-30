import { getDb } from "@/lib/cloudflare/context";
import { IAddress, IUpdateUser, IUser } from "@/lib/schemas/user";
import { CountryCode, IResult } from "@/lib/types/generic";
import { getUserIdByUuid } from "./auth";
import { COUNTRY_CONFIGS } from "@/lib/schemas/country-configs";
import { PaginatedCustomersOptions, PaginatedCustomersResult } from '@/lib/schemas/user';
import { DEFAULT_LANGUAGE } from "../constants";


// USER

// list all customers
export async function adminAllCustomers(options: PaginatedCustomersOptions): Promise<IResult<PaginatedCustomersResult>> {
    try {
        const db = getDb();
        const { page, limit } = options;
        const offset = (page - 1) * limit;

        const [countResult, customersResult] = await db.batch([
            db.prepare(`SELECT COUNT(*) as total FROM user WHERE profile_id = 2`),
            db.prepare(
                `SELECT id, uuid, user_name, country, tax_id, email, phone, active, profile_id, preferred_language
                 FROM user
                 WHERE profile_id = 2
                 ORDER BY id DESC
                 LIMIT ? OFFSET ?`
            ).bind(limit, offset),
        ]);

        const total = (countResult.results?.[0] as { total: number } | undefined)?.total ?? 0;
        const customers = (customersResult.results ?? []) as IUser[];
        const totalPages = Math.max(1, Math.ceil(total / limit));

        if (customers.length === 0) {
            return {
                success: true,
                data: { customers: [], addresses: [], total, page, limit, totalPages },
                message: 'Customers fetched successfully'
            };
        }

        const ids = customers.map(c => c.id);
        const placeholders = ids.map(() => '?').join(', ');

        const addressesResult = await db
            .prepare(
                `SELECT id, country_code, zip, street, address_number, complement, neighborhood, city, address_state, address_primary, user_id
                 FROM tb_address
                 WHERE user_id IN (${placeholders})
                 ORDER BY address_primary DESC, id ASC`
            )
            .bind(...ids)
            .all();

        const addresses = (addressesResult.results ?? []) as IAddress[];

        return {
            success: true,
            data: { customers, addresses, total, page, limit, totalPages },
            message: 'Customers fetched successfully'
        };

    } catch (err) {
        console.error('adminAllCustomers database error:', err);
        throw err;
    }
}

// create customer
export async function adminCreateCustomer(data: IUser): Promise<IResult<IUser>> {
    try {
        const db = getDb();
        const { user_name, email, country, tax_id, phone, profile_id, active, preferred_language, user_password } = data;

        const existingEmail = await db
            .prepare('SELECT id FROM user WHERE email = ?')
            .bind(email)
            .first();

        if (existingEmail) return { success: false, error: 'Email already exists', code: 'DUPLICATE_EMAIL' }

        if (phone) {
            const existingPhone = await db
                .prepare('SELECT id FROM user WHERE phone = ?')
                .bind(phone)
                .first();

            if (existingPhone) return { success: false, error: 'Phone already exists', code: 'DUPLICATE_PHONE' };
        }

        if (tax_id) {
            const existingTaxId = await db
                .prepare('SELECT id FROM user WHERE tax_id = ?')
                .bind(tax_id)
                .first();

            if (existingTaxId) return { success: false, error: 'Tax Id already exists', code: 'DUPLICATE_TAX_ID' };
        }

        const uuid = crypto.randomUUID();

        const result = await db
            .prepare(`INSERT INTO user (uuid, user_name, email, country, tax_id, phone, profile_id, active, preferred_language, user_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(uuid, user_name, email, country, tax_id || null, phone || null, profile_id || 2, active ? 1 : 0, preferred_language || DEFAULT_LANGUAGE, user_password)
            .run();

        if (result.meta.changes === 0) return { success: false, error: 'Failed to create user', code: 'INTERNAL_ERROR' };

        const newUser = await db
            .prepare(`SELECT id, uuid, user_name, country, tax_id, email, phone, active, profile_id, preferred_language FROM user WHERE uuid = ?`)
            .bind(uuid)
            .first<Omit<IUser, 'addresss'>>();

        if (!newUser) return { success: false, error: 'Failed to fetch created user', code: 'INTERNAL_ERROR' };

        return { success: true, data: newUser, message: 'Customer created successfully' };

    } catch (err: any) {
        console.error('adminCreateCustomer database error:', err);
        throw err;
    }
}

// update customer
export async function adminUpdateCustomer(uuid: string, data: Partial<IUpdateUser> & { user_password?: string }): Promise<IResult<IUser>> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(uuid);
        if (!userId) return { success: false, error: 'User not found', code: 'NOT_FOUND' };

        const updates: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            user_name: 'user_name',
            email: 'email',
            phone: 'phone',
            country: 'country',
            tax_id: 'tax_id',
            preferred_language: 'preferred_language',
            active: 'active',
            profile_id: 'profile_id'
        };

        if (data.user_password) {
            updates.push('user_password = ?');
            values.push(data.user_password);
        }

        Object.keys(data).forEach((key) => {
            if (key === 'user_password') return;
            const value = data[key as keyof typeof data];
            if (key in fieldMap && value !== undefined) {
                updates.push(`${fieldMap[key]} = ?`);
                values.push(key === 'active' ? (value ? 1 : 0) : value);
            }
        });

        if (updates.length === 0) return { success: false, error: 'No fields to update', code: 'NO_CHANGES' };

        const updateResult = await db
            .prepare(`UPDATE user SET ${updates.join(', ')} WHERE id = ?`)
            .bind(...values, userId)
            .run();

        if (updateResult.meta.changes === 0) return { success: false, error: 'Failed to update user', code: 'INTERNAL_ERROR' };

        const updatedUser = await db
            .prepare(`SELECT id, uuid, user_name, country, tax_id, email, phone, active, profile_id, preferred_language FROM user WHERE id = ?`)
            .bind(userId)
            .first<IUser>();

        if (!updatedUser) return { success: false, error: 'Failed to fetch updated user', code: 'INTERNAL_ERROR' };

        return { success: true, data: updatedUser, message: 'Customer updated successfully' };

    } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : '';

        if (data.country) {
            const duplicateError = parseDuplicateFieldError(message, data.country);
            if (duplicateError) return duplicateError;
        } else if (message.includes('UNIQUE constraint failed')) {
            if (message.includes('user.email')) return { success: false, error: 'Email already exists', code: 'DUPLICATE_EMAIL' };
            if (message.includes('user.phone')) return { success: false, error: 'Phone already exists', code: 'DUPLICATE_PHONE' };
        }

        console.error('adminUpdateCustomer database error:', err);
        throw err;
    }
}

// delete customer
export async function adminDeleteCustomer(uuid: string): Promise<IResult<{ id: number }>> {
    try {
        const db = getDb();
        const userId = await getUserIdByUuid(uuid);
        if (!userId) return { success: false, error: 'User not found', code: 'NOT_FOUND' };

        // tb_address tem ON DELETE CASCADE
        const deleteResult = await db
            .prepare(`DELETE FROM user WHERE id = ?`)
            .bind(userId)
            .run();

        if (deleteResult.meta.changes === 0) return { success: false, error: 'Failed to delete user', code: 'INTERNAL_ERROR' };

        return {
            success: true,
            message: 'Customer deleted successfully'
        };

    } catch (err) {
        console.error('adminDeleteCustomer database error:', err);
        throw err;
    }
}


// ADDRESS


// create
export async function adminCreateAddress(data: any): Promise<IResult<IAddress>> {
    try {
        const db = getDb();
        const { user_id, country_code, zip, street, address_number, complement, neighborhood, city, address_state, address_primary } = data;

        const user = await db
            .prepare('SELECT id FROM user WHERE id = ?')
            .bind(user_id)
            .first();

        if (!user) return { success: false, error: 'User not found', code: 'NOT_FOUND' };

        const hasAddress = await db
            .prepare(`SELECT id FROM tb_address WHERE user_id = ? LIMIT 1`)
            .bind(user_id)
            .first();

        const wantsPrimary = address_primary === true || address_primary === 'true' || address_primary === 1;
        const isPrimary = !hasAddress ? true : wantsPrimary;

        const statements = [];

        if (isPrimary && hasAddress) {
            statements.push(
                db.prepare('UPDATE tb_address SET address_primary = 0 WHERE user_id = ?')
                    .bind(user_id)
            );
        }

        statements.push(
            db.prepare(
                `INSERT INTO tb_address (user_id, country_code, zip, street, address_number, complement, neighborhood, city, address_state, address_primary)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(user_id, country_code, zip || null, street, address_number, complement || null, neighborhood || null, city, address_state, isPrimary ? 1 : 0)
        );

        const results = await db.batch(statements);
        const insertResult = results[results.length - 1];

        if (insertResult.meta.changes === 0) return { success: false, error: 'Failed to create address', code: 'INTERNAL_ERROR' };

        const row = await db
            .prepare(`SELECT id, country_code, user_id, zip, street, address_number, complement, neighborhood, city, address_state, address_primary FROM tb_address WHERE id = ?`)
            .bind(insertResult.meta.last_row_id)
            .first();

        if (!row) return { success: false, error: 'Failed to fetch created address', code: 'INTERNAL_ERROR' };

        const newAddress: IAddress = {
            id: Number(row.id),
            user_id: Number(row.user_id),
            country_code: String(row.country_code),
            zip: String(row.zip),
            street: String(row.street),
            address_number: String(row.address_number),
            complement: row.complement ? String(row.complement) : undefined,
            neighborhood: row.neighborhood ? String(row.neighborhood) : undefined,
            city: String(row.city),
            address_state: String(row.address_state),
            address_primary: Boolean(row.address_primary),
        };

        return { success: true, data: newAddress, message: 'Address created successfully' };

    } catch (err: any) {
        console.error('adminCreateAddress database error:', err);
        throw err;
    }
}

// update
export async function adminUpdateAddress(addressId: number, data: any): Promise<IResult<IAddress>> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id, user_id, address_primary FROM tb_address WHERE id = ?`)
            .bind(addressId)
            .first<{ id: number; user_id: number; address_primary: number }>();

        if (!existing) return { success: false, error: 'Address not found', code: 'NOT_FOUND' };

        const { zip, country_code, street, address_number, complement, neighborhood, city, address_state, address_primary } = data;
        const wantsPrimary = address_primary === true || address_primary === 'true' || address_primary === 1;
        const wantsPrimaryExplicitlyFalse = address_primary === false || address_primary === 'false' || address_primary === 0;

        const wasPrimary = Boolean(existing.address_primary);

        if (wasPrimary && wantsPrimaryExplicitlyFalse) return { success: false, error: 'Cannot unset the only primary address. Set another address as primary first.', code: 'MUST_HAVE_PRIMARY' };

        const fieldUpdates: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, any> = { zip, country_code, street, address_number, complement, neighborhood, city, address_state };
        Object.entries(fieldMap).forEach(([key, value]) => {
            if (value !== undefined) {
                fieldUpdates.push(`${key} = ?`);
                values.push(value || null);
            }
        });

        const statements = [];
        const becomingPrimary = wantsPrimary && !wasPrimary;

        if (becomingPrimary) {
            statements.push(
                db.prepare('UPDATE tb_address SET address_primary = 0 WHERE user_id = ? AND id != ?').bind(existing.user_id, addressId)
            );
            fieldUpdates.push('address_primary = 1');
        }

        if (fieldUpdates.length > 0) {
            statements.push(
                db.prepare(`UPDATE tb_address SET ${fieldUpdates.join(', ')} WHERE id = ?`).bind(...values, addressId)
            );
        }

        if (statements.length === 0) {
            return { success: false, error: 'No fields to update', code: 'NO_CHANGES' };
        }

        await db.batch(statements);

        const row = await db
            .prepare(`SELECT id, user_id, country_code, zip, street, address_number, complement, neighborhood, city, address_state, address_primary FROM tb_address WHERE id = ?`)
            .bind(addressId)
            .first();

        if (!row) return { success: false, error: 'Failed to fetch updated address', code: 'INTERNAL_ERROR' };

        const updatedAddress: IAddress = {
            id: Number(row.id),
            user_id: Number(row.user_id),
            country_code: String(row.country_code),
            zip: String(row.zip),
            street: String(row.street),
            address_number: String(row.address_number),
            complement: row.complement ? String(row.complement) : undefined,
            neighborhood: row.neighborhood ? String(row.neighborhood) : undefined,
            city: String(row.city),
            address_state: String(row.address_state),
            address_primary: Boolean(row.address_primary),
        };

        return { success: true, data: updatedAddress, message: 'Address updated successfully' };

    } catch (err: any) {
        console.error('adminUpdateAddress database error:', err);
        throw err;
    }
}

// delete
export async function adminDeleteAddress(addressId: number): Promise<IResult<{ id: number }>> {
    try {
        const db = getDb();

        const existing = await db
            .prepare(`SELECT id, user_id, address_primary FROM tb_address WHERE id = ?`)
            .bind(addressId)
            .first<{ id: number; user_id: number; address_primary: number }>();

        if (!existing) return { success: false, error: 'Address not found', code: 'NOT_FOUND' };

        const wasPrimary = Boolean(existing.address_primary);

        if (wasPrimary) {
            const nextAddress = await db
                .prepare(`SELECT id FROM tb_address WHERE user_id = ? AND id != ? ORDER BY id ASC LIMIT 1`)
                .bind(existing.user_id, addressId)
                .first<{ id: number }>();

            if (nextAddress) {
                await db.batch([
                    db.prepare('DELETE FROM tb_address WHERE id = ?').bind(addressId),
                    db.prepare('UPDATE tb_address SET address_primary = 1 WHERE id = ?').bind(nextAddress.id),
                ]);
            } else {
                await db.prepare('DELETE FROM tb_address WHERE id = ?').bind(addressId).run();
            }
        } else {
            await db.prepare('DELETE FROM tb_address WHERE id = ?').bind(addressId).run();
        }

        return { success: true, data: { id: addressId }, message: 'Address deleted successfully' };

    } catch (err: any) {
        console.error('adminDeleteAddress database error:', err);
        throw err;
    }
}


// HELPER


function parseDuplicateFieldError(message: string, country: string): IResult<never> | null {
    if (!message.includes('UNIQUE constraint failed')) return null;

    if (message.includes('user.email')) return { success: false, error: 'Email already exists', code: 'DUPLICATE_EMAIL' };

    // índice composto (country, tax_id) — SQLite reporta as colunas, não o nome do índice
    if (message.includes('user.country') && message.includes('user.tax_id')) {
        const taxIdLabel = COUNTRY_CONFIGS[country as CountryCode].taxIdLabel;
        return { success: false, error: `${taxIdLabel} already exists`, code: 'DUPLICATE_TAX_ID' };
    }

    if (message.includes('user.phone')) return { success: false, error: 'Phone already exists', code: 'DUPLICATE_PHONE' };

    return null;
}
