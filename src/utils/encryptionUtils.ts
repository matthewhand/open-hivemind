import crypto from 'crypto';

const secretKey = process.env.ENCRYPTION_SECRET_KEY || '';
const iv = crypto.randomBytes(16);

/**
 * Encrypts a given text using AES-256-CBC encryption.
 * @param {string} text - The text to encrypt.
 * @returns {string} - The encrypted text.
 */
export function encrypt(text: string): string {
    if (!secretKey) {
        throw new Error('Secret key is not set for encryption.');
    }

    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts a given text using AES-256-CBC encryption.
 * @param {string} text - The text to decrypt.
 * @returns {string} - The decrypted text.
 */
export function decrypt(text: string): string {
    if (!secretKey) {
        throw new Error('Secret key is not set for decryption.');
    }

    const parts = text.split(':');
    const iv = Buffer.from(parts.shift() as string, 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}
