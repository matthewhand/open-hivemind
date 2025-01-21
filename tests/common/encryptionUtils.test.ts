import { encrypt, decrypt } from '../../src/common/encryptionUtils';

describe('encryptionUtils', () => {
    const testText = 'Hello, World!';
    const secretKey = process.env.ENCRYPTION_SECRET_KEY;

    if (!secretKey) {
        test.skip('ENCRYPTION_SECRET_KEY is not set, skipping encryption tests', () => {
            // Tests are skipped because the secret key is not set
        });
    } else {
        beforeAll(() => {
            process.env.ENCRYPTION_SECRET_KEY = secretKey;
        });

        afterAll(() => {
            delete process.env.ENCRYPTION_SECRET_KEY;
        });

        test('encrypt should throw an error if secret key is not set', () => {
            delete process.env.ENCRYPTION_SECRET_KEY;
            expect(() => encrypt(testText)).toThrow('Secret key is not set for encryption.');
        });

        test('decrypt should throw an error if secret key is not set', () => {
            delete process.env.ENCRYPTION_SECRET_KEY;
            expect(() => decrypt('dummy:encryptedtext')).toThrow('Secret key is not set for decryption.');
        });

        test('encrypt and decrypt should return the original text', () => {
            const encrypted = encrypt(testText);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(testText);
        });

        test('decrypt should throw an error if input is malformed', () => {
            const malformedText = 'invalidciphertext';
            expect(() => decrypt(malformedText)).toThrow();
        });

        test('encrypt should handle empty string input', () => {
            const emptyText = '';
            const encrypted = encrypt(emptyText);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(emptyText);
        });
    }
});