/**
 * Hash a password using SHA-256 with a random salt
 * @param password - The plain text password to hash
 * @returns A string containing the salt and hash separated by a colon
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const data = encoder.encode(password + salt.join(','));

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const saltHex = Array.from(salt)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 * @param password - The plain text password to verify
 * @param storedHash - The stored hash string (salt:hash format)
 * @returns True if the password matches the hash, false otherwise
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(':');

    // Convert hex to Uint8Array without Buffer
    const salt = new Uint8Array(
        saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt.join(','));

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const newHashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return newHashHex === hashHex;
}

/**
 * Generate a random token
 * @param length - The length of the token in bytes (default: 32)
 * @returns A hex string representation of the random token
 */
export async function generateRandomToken(length: number = 32): Promise<string> {
    const randomBytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Generate a secure random string
 * @param length - The length of the string (default: 32)
 * @returns A random alphanumeric string
 */
export function generateRandomString(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));

    return Array.from(randomValues)
        .map(byte => charset[byte % charset.length])
        .join('');
}

/**
 * Hash a string using SHA-256
 * @param data - The string to hash
 * @returns The hash as a hex string
 */
export async function hashString(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));

    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Compare two strings in constant time to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

/**
 * Generate a salt
 * @param length - The length of the salt in bytes (default: 16)
 * @returns A hex string representation of the salt
 */
export function generateSalt(length: number = 16): string {
    const salt = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(salt)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Encrypt data using Web Crypto API (AES-GCM)
 * @param data - The data to encrypt (as a string)
 * @param key - The encryption key (as a string)
 * @returns The encrypted data as a hex string
 */
export async function encryptData(data: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key.padEnd(32, '0').slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        keyData,
        encoder.encode(data)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return Array.from(combined)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Decrypt data using Web Crypto API (AES-GCM)
 * @param encryptedHex - The encrypted data as a hex string
 * @param key - The decryption key (as a string)
 * @returns The decrypted data as a string
 */
export async function decryptData(encryptedHex: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const combined = new Uint8Array(
        encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const keyData = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key.padEnd(32, '0').slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keyData,
        encrypted
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns An object with validation results
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[]; score: number } {
    const errors: string[] = [];
    let score = 0;

    // Check minimum length
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    } else {
        score += 1;
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    } else {
        score += 1;
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    } else {
        score += 1;
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    } else {
        score += 1;
    }

    // Check for special characters
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    } else {
        score += 1;
    }

    // Calculate strength score (0-5)
    const strengthScore = Math.min(score, 5);

    return {
        valid: errors.length === 0,
        errors,
        score: strengthScore,
    };
}
