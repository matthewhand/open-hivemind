"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const secretKey = process.env.ENCRYPTION_SECRET_KEY || '';
const iv = crypto_1.default.randomBytes(16);
/**
 * Encrypts a given text using AES-256-CBC encryption.
 * @param {string} text - The text to encrypt.
 * @returns {string} - The encrypted text.
 */
function encrypt(text) {
    if (!secretKey) {
        throw new Error('Secret key is not set for encryption.');
    }
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
/**
 * Decrypts a given text using AES-256-CBC encryption.
 * @param {string} text - The text to decrypt.
 * @returns {string} - The decrypted text.
 */
function decrypt(text) {
    if (!secretKey) {
        throw new Error('Secret key is not set for decryption.');
    }
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}
