import { MigrationManager, Migration } from '../../src/database/MigrationManager';
import { Logger } from '../../src/common/logger';

// Mock Logger
jest.mock('@common/logger', () => ({
    Logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('MigrationManager', () => {
    let migrationManager: MigrationManager;
    let mockDb: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDb = {
            exec: jest.fn(),
            all: jest.fn(),
            run: jest.fn()
        };

        migrationManager = new MigrationManager(mockDb);
    });

    describe('Migration Table Creation', () => {
        it('should create migrations table if it does not exist', async () => {
            await migrationManager.createMigrationsTable();

            expect(mockDb.exec).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
            );
        });
    });

    describe('Executed Migrations Retrieval', () => {
        it('should retrieve executed migrations', async () => {
            const mockMigrations = [
                { id: '001_test_migration' },
                { id: '002_test_migration' }
            ];
            mockDb.all.mockResolvedValueOnce(mockMigrations);

            const executed = await migrationManager.getExecutedMigrations();

            expect(mockDb.all).toHaveBeenCalledWith(
                'SELECT id FROM migrations ORDER BY version'
            );
            expect(executed).toEqual(['001_test_migration', '002_test_migration']);
        });

        it('should handle empty migrations table', async () => {
            mockDb.all.mockResolvedValueOnce([]);

            const executed = await migrationManager.getExecutedMigrations();

            expect(executed).toEqual([]);
        });
    });

    describe('Migration Execution', () => {
        beforeEach(() => {
            mockDb.exec.mockResolvedValue(undefined);
            mockDb.run.mockResolvedValue({ changes: 1 });
        });

        it('should run pending migrations', async () => {
            mockDb.all.mockResolvedValueOnce([]); // No executed migrations

            await migrationManager.runMigrations();

            expect(mockDb.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO migrations'),
                expect.any(Array)
            );
            expect(mockDb.exec).toHaveBeenCalledWith('COMMIT');
        });

        it('should skip already executed migrations', async () => {
            mockDb.all.mockResolvedValueOnce([
                { id: '001_add_tenant_support' },
                { id: '002_add_rbac_enhancements' }
            ]);

            await migrationManager.runMigrations();

            // Should not execute migrations that are already in the database
            expect(mockDb.run).not.toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO migrations'),
                ['001_add_tenant_support', expect.any(String), 1]
            );
        });

        it('should handle migration execution errors', async () => {
            mockDb.all.mockResolvedValueOnce([]);
            mockDb.exec.mockRejectedValueOnce(new Error('Migration failed'));

            await expect(migrationManager.runMigrations()).rejects.toThrow('Migration failed');

            expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should rollback on migration failure', async () => {
            mockDb.all.mockResolvedValueOnce([]);
            mockDb.exec.mockResolvedValueOnce(undefined); // BEGIN TRANSACTION
            mockDb.exec.mockRejectedValueOnce(new Error('Migration failed'));

            await expect(migrationManager.runMigrations()).rejects.toThrow('Migration failed');

            expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should handle rollback errors', async () => {
            mockDb.all.mockResolvedValueOnce([]);
            mockDb.exec.mockRejectedValueOnce(new Error('Migration failed'));
            mockDb.exec.mockRejectedValueOnce(new Error('Rollback failed')); // ROLLBACK also fails

            await expect(migrationManager.runMigrations()).rejects.toThrow('Migration failed');

            expect(Logger.error).toHaveBeenCalledWith('Error rolling back migration:', expect.any(Error));
        });
    });

    describe('Migration Rollback', () => {
        beforeEach(() => {
            mockDb.exec.mockResolvedValue(undefined);
            mockDb.run.mockResolvedValue({ changes: 1 });
        });

        it('should rollback to specific version', async () => {
            mockDb.all.mockResolvedValueOnce([
                { id: '001_add_tenant_support', version: 1 },
                { id: '002_add_rbac_enhancements', version: 2 },
                { id: '003_add_user_indexes', version: 3 }
            ]);

            // Mock migration with down function
            const mockMigration = {
                id: '003_add_user_indexes',
                name: 'Add user indexes',
                version: 3,
                up: jest.fn(),
                down: jest.fn().mockResolvedValue(undefined)
            };

            // @ts-ignore - Accessing private property for testing
            migrationManager.migrations = [
                { id: '001_add_tenant_support', name: 'Migration 1', version: 1, up: jest.fn() },
                { id: '002_add_rbac_enhancements', name: 'Migration 2', version: 2, up: jest.fn() },
                mockMigration
            ];

            await migrationManager.rollbackToVersion(1);

            expect(mockMigration.down).toHaveBeenCalledWith(mockDb);
            expect(mockDb.run).toHaveBeenCalledWith(
                'DELETE FROM migrations WHERE id = ?',
                ['003_add_user_indexes']
            );
        });

        it('should rollback multiple migrations in reverse order', async () => {
            mockDb.all.mockResolvedValueOnce([
                { id: '001', version: 1 },
                { id: '002', version: 2 },
                { id: '003', version: 3 },
                { id: '004', version: 4 }
            ]);

            const migrations = [
                { id: '001', version: 1, up: jest.fn() },
                { id: '002', version: 2, up: jest.fn(), down: jest.fn().mockResolvedValue(undefined) },
                { id: '003', version: 3, up: jest.fn(), down: jest.fn().mockResolvedValue(undefined) },
                { id: '004', version: 4, up: jest.fn(), down: jest.fn().mockResolvedValue(undefined) }
            ];

            // @ts-ignore - Accessing private property for testing
            migrationManager.migrations = migrations;

            await migrationManager.rollbackToVersion(1);

            // Should rollback migrations 004 and 003 (versions 4 and 3) in reverse order
            expect(migrations[3].down).toHaveBeenCalled();
            expect(migrations[2].down).toHaveBeenCalled();
            expect(migrations[1].down).not.toHaveBeenCalled(); // Version 2 should not be rolled back
        });

        it('should handle rollback errors', async () => {
            mockDb.all.mockResolvedValueOnce([
                { id: '001', version: 1 },
                { id: '002', version: 2 }
            ]);

            const mockMigration = {
                id: '002',
                version: 2,
                up: jest.fn(),
                down: jest.fn().mockRejectedValue(new Error('Rollback failed'))
            };

            // @ts-ignore - Accessing private property for testing
            migrationManager.migrations = [
                { id: '001', name: 'Migration 1', version: 1, up: jest.fn() },
                mockMigration
            ];

            await expect(migrationManager.rollbackToVersion(0)).rejects.toThrow('Rollback failed');

            expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should skip migrations without down function', async () => {
            mockDb.all.mockResolvedValueOnce([
                { id: '001', version: 1 },
                { id: '002', version: 2 }
            ]);

            const migrations = [
                { id: '001', version: 1, up: jest.fn() },
                { id: '002', version: 2, up: jest.fn() } // No down function
            ];

            // @ts-ignore - Accessing private property for testing
            migrationManager.migrations = migrations;

            await migrationManager.rollbackToVersion(0);

            // Should not attempt to rollback migration 002 since it has no down function
            expect(mockDb.run).not.toHaveBeenCalledWith(
                'DELETE FROM migrations WHERE id = ?',
                ['002']
            );
        });
    });

    describe('Migration Status', () => {
        it('should return correct migration status', () => {
            const migrations = [
                { id: '001', name: 'Migration 1', version: 1, up: jest.fn() },
                { id: '002', name: 'Migration 2', version: 2, up: jest.fn() },
                { id: '003', name: 'Migration 3', version: 3, up: jest.fn() }
            ];

            // @ts-ignore - Accessing private property for testing
            migrationManager.migrations = migrations;
            // @ts-ignore - Accessing private property for testing
            migrationManager.executedMigrations = new Set(['001', '003']);

            const status = migrationManager.getMigrationsStatus();

            expect(status.executed).toHaveLength(2);
            expect(status.pending).toHaveLength(1);
            expect(status.pending[0].id).toBe('002');
        });
    });
});