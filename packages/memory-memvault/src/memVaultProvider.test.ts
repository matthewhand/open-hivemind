import { MemVaultProvider } from './memVaultProvider';
import { Pool } from 'pg';

// Mock pg Pool
jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
        query: jest.fn(),
        end: jest.fn(),
    })),
}));

describe('MemVaultProvider', () => {
    const validConfig = {
        host: 'localhost',
        port: 5432,
        database: 'memvault',
        user: 'postgres',
        password: 'password',
    };

    describe('constructor', () => {
        it('should throw if host is missing', () => {
            expect(() => new MemVaultProvider({ ...validConfig, host: '' }))
                .toThrow('MemVault PostgreSQL host is required');
        });

        it('should throw if database is missing', () => {
            expect(() => new MemVaultProvider({ ...validConfig, database: '' }))
                .toThrow('MemVault PostgreSQL database is required');
        });

        it('should throw if user is missing', () => {
            expect(() => new MemVaultProvider({ ...validConfig, user: '' }))
                .toThrow('MemVault PostgreSQL user is required');
        });

        it('should create instance with valid config', () => {
            const provider = new MemVaultProvider(validConfig);
            expect(provider).toBeDefined();
        });
    });

    describe('healthCheck', () => {
        it('should return false when pool is null', async () => {
            const provider = new MemVaultProvider(validConfig);
            const result = await provider.healthCheck();
            expect(result).toBe(false);
        });
    });

    describe('disconnect', () => {
        it('should handle disconnect when pool is null', async () => {
            const provider = new MemVaultProvider(validConfig);
            await expect(provider.disconnect()).resolves.not.toThrow();
        });
    });
});
