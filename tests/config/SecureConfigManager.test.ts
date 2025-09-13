import { SecureConfigManager, SecureConfig } from '../../src/config/SecureConfigManager';
import * as fs from 'fs';
import * as path from 'path';

describe('SecureConfigManager', () => {
  let secureConfigManager: SecureConfigManager;
  const testConfigDir = path.join(process.cwd(), 'config', 'user');
  const testBackupDir = path.join(testConfigDir, 'backups');

  beforeEach(() => {
    console.log('=== BeforeEach starting ===');
    // Clear any existing test files
    try {
      if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.log('Warning: Could not clean up test directory, continuing anyway:', error.message);
      // Continue with test even if cleanup fails
    }

    // Ensure config directory exists before creating instance
    try {
      fs.mkdirSync(testConfigDir, { recursive: true });
      console.log('Directories created');
    } catch (error) {
      console.log('Warning: Could not create test directory:', error.message);
    }

    // Reset the singleton instance to ensure clean state
    (SecureConfigManager as any).instance = null;
    // Also clear any cached encryption keys
    try {
      const keyPath = path.join(testConfigDir, '.encryption_key');
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }
    } catch (error) {
      console.log('Warning: Could not clear encryption key:', error.message);
    }
    console.log('Singleton reset and encryption key cleared');

    try {
      secureConfigManager = SecureConfigManager.getInstance();
      console.log('SecureConfigManager instantiated successfully');
    } catch (error) {
      console.error('Failed to instantiate SecureConfigManager:', error);
      throw error;
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('Basic functionality', () => {
    test('should be a singleton', () => {
      const instance1 = SecureConfigManager.getInstance();
      const instance2 = SecureConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should create config directory on initialization', () => {
      console.log('testConfigDir:', testConfigDir);
      console.log('testBackupDir:', testBackupDir);
      console.log('configDir exists:', fs.existsSync(testConfigDir));
      console.log('backupDir exists:', fs.existsSync(testBackupDir));

      expect(fs.existsSync(testConfigDir)).toBe(true);
      expect(fs.existsSync(testBackupDir)).toBe(true);
    });
  });

  describe('Configuration storage and retrieval', () => {
    test('should store and retrieve a configuration', async () => {
      console.log('=== Starting store/retrieve test ===');
      console.log('Config dir:', testConfigDir);
      console.log('Backup dir:', testBackupDir);

      const testConfig: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'test-bot-1',
        name: 'Test Bot',
        type: 'bot',
        data: {
          token: 'test-token-123',
          apiKey: 'sk-test-key'
        },
        createdAt: new Date().toISOString()
      };

      console.log('Test config created:', testConfig.id);
      console.log('Calling storeConfig...');

      try {
        await secureConfigManager.storeConfig(testConfig);
        console.log('storeConfig completed successfully');

        // Check if file was created
        const filePath = path.join(testConfigDir, 'test-bot-1.enc');
        console.log('File path:', filePath);
        console.log('File exists:', fs.existsSync(filePath));

        console.log('Calling getConfig...');
        const retrieved = await secureConfigManager.getConfig('test-bot-1');
        console.log('Retrieved config:', retrieved);

        expect(retrieved).not.toBeNull();
        if (retrieved) {
          expect(retrieved.id).toBe('test-bot-1');
          expect(retrieved.name).toBe('Test Bot');
          expect(retrieved.type).toBe('bot');
          expect(retrieved.data.token).toBe('test-token-123');
          expect(retrieved.data.apiKey).toBe('sk-test-key');
        }
      } catch (error) {
        console.error('Error in test:', error);
        throw error;
      }
    });

    test('should return null for non-existent configuration', async () => {
      const result = await secureConfigManager.getConfig('non-existent');
      expect(result).toBeNull();
    });

    test('should list stored configurations', async () => {
      const config1: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'bot-1',
        name: 'Bot 1',
        type: 'bot',
        data: { token: 'token1' },
        createdAt: new Date().toISOString()
      };

      const config2: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'bot-2',
        name: 'Bot 2',
        type: 'bot',
        data: { token: 'token2' },
        createdAt: new Date().toISOString()
      };

      await secureConfigManager.storeConfig(config1);
      await secureConfigManager.storeConfig(config2);

      const configs = await secureConfigManager.listConfigs();
      expect(configs).toContain('bot-1');
      expect(configs).toContain('bot-2');
      expect(configs).toHaveLength(2);
    });
  });

  describe('Configuration updates', () => {
    test('should update existing configuration', async () => {
      const originalConfig: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'update-test',
        name: 'Original Name',
        type: 'bot',
        data: { token: 'original-token' },
        createdAt: new Date().toISOString()
      };

      await secureConfigManager.storeConfig(originalConfig);

      const updatedConfig: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'update-test',
        name: 'Updated Name',
        type: 'bot',
        data: { token: 'updated-token' },
        createdAt: originalConfig.createdAt
      };

      await secureConfigManager.storeConfig(updatedConfig);
      const retrieved = await secureConfigManager.getConfig('update-test');

      expect(retrieved!.name).toBe('Updated Name');
      expect(retrieved!.data.token).toBe('updated-token');
    });
  });

  describe('Configuration deletion', () => {
    test('should delete existing configuration', async () => {
      const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'delete-test',
        name: 'Delete Test',
        type: 'bot',
        data: { token: 'delete-token' },
        createdAt: new Date().toISOString()
      };

      await secureConfigManager.storeConfig(config);
      expect(await secureConfigManager.getConfig('delete-test')).not.toBeNull();

      const deleted = await secureConfigManager.deleteConfig('delete-test');
      expect(deleted).toBe(true);

      expect(await secureConfigManager.getConfig('delete-test')).toBeNull();
    });

    test('should return false when deleting non-existent configuration', async () => {
      const deleted = await secureConfigManager.deleteConfig('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Backup and restore', () => {
    test('should create and list backups', async () => {
      const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'backup-test',
        name: 'Backup Test',
        type: 'bot',
        data: { token: 'backup-token' },
        createdAt: new Date().toISOString()
      };

      await secureConfigManager.storeConfig(config);
      const backupId = await secureConfigManager.createBackup();

      expect(backupId).toBeDefined();
      expect(typeof backupId).toBe('string');

      const backups = await secureConfigManager.listBackups();
      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0].id).toBe(backupId);
    });

    test('should restore from backup', async () => {
      const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'restore-test',
        name: 'Restore Test',
        type: 'bot',
        data: { token: 'restore-token' },
        createdAt: new Date().toISOString()
      };

      await secureConfigManager.storeConfig(config);
      const backupId = await secureConfigManager.createBackup();

      // Delete the original config
      await secureConfigManager.deleteConfig('restore-test');
      expect(await secureConfigManager.getConfig('restore-test')).toBeNull();

      // Restore from backup
      await secureConfigManager.restoreBackup(backupId);
      const restored = await secureConfigManager.getConfig('restore-test');

      expect(restored).not.toBeNull();
      expect(restored!.name).toBe('Restore Test');
      expect(restored!.data.token).toBe('restore-token');
    });
  });

  describe('Data integrity', () => {
    test('should detect data tampering', async () => {
      const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'integrity-test',
        name: 'Integrity Test',
        type: 'bot',
        data: { token: 'integrity-token' },
        createdAt: new Date().toISOString()
      };

      await secureConfigManager.storeConfig(config);

      // Manually tamper with the file by corrupting the authTag
      const filePath = path.join(testConfigDir, 'integrity-test.enc');
      let encryptedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      encryptedData.authTag = 'corrupted' + encryptedData.authTag.substring(9);
      fs.writeFileSync(filePath, JSON.stringify(encryptedData), 'utf8');

      // Attempt to retrieve should return null due to integrity check failure
      const result = await secureConfigManager.getConfig('integrity-test');
      expect(result).toBeNull();
    });
  });

  describe('Error handling', () => {
    test('should handle invalid configuration data gracefully', async () => {
      const invalidConfig = {
        id: '', // Invalid: empty id
        name: 'Invalid Config',
        type: 'bot',
        data: {}
      };

      await expect(secureConfigManager.storeConfig(invalidConfig as any)).rejects.toThrow();
    });

    test('should handle file system errors gracefully', async () => {
      // Mock fs.promises.writeFile to throw an error
      const originalWriteFile = require('fs').promises.writeFile;
      require('fs').promises.writeFile = jest.fn().mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
        id: 'fs-error-test',
        name: 'FS Error Test',
        type: 'bot',
        data: { token: 'fs-error-token' },
        createdAt: new Date().toISOString()
      };

      await expect(secureConfigManager.storeConfig(config)).rejects.toThrow();
      
      // Restore original function
      require('fs').promises.writeFile = originalWriteFile;
    });
  });
});