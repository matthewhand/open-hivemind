import { SecureConfigManager, SecureConfig } from '../../src/config/SecureConfigManager';
import * as fs from 'fs';
import * as path from 'path';

describe('SecureConfigManager', () => {
  let secureConfigManager: SecureConfigManager;
  const testConfigDir = path.join(process.cwd(), 'config', 'secure');
  const testBackupDir = path.join(process.cwd(), 'config', 'backups');

  beforeEach(() => {
    console.log('=== BeforeEach starting ===');
    // Clear any existing test files
    try {
      if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.log('Warning: Could not clean up test directory, continuing anyway:', (error as Error).message);
      // Continue with test even if cleanup fails
    }

    // Ensure config directory exists before creating instance
    try {
      fs.mkdirSync(testConfigDir, { recursive: true });
      console.log('Directories created');
    } catch (error) {
      console.log('Warning: Could not create test directory:', (error as Error).message);
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
      console.log('Warning: Could not clear encryption key:', (error as Error).message);
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
      const ids = configs.map(c => c.id);
      expect(ids).toContain('bot-1');
      expect(ids).toContain('bot-2');
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
      const config = {
        id: 'delete-test',
        name: 'Delete Test',
        type: 'bot',
        data: { setting: 'value' }
      };

      await secureConfigManager.storeConfig(config);
      await secureConfigManager.deleteConfig('delete-test');

      expect(await secureConfigManager.getConfig('delete-test')).toBeNull();
    });

    test('should return without error when deleting non-existent configuration', async () => {
      await expect(secureConfigManager.deleteConfig('non-existent')).resolves.toBeUndefined();
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
      let encryptedData = fs.readFileSync(filePath, 'utf8');
      const parts = encryptedData.split(':');
      parts[1] = 'corrupted' + parts[1].substring(9);
      fs.writeFileSync(filePath, parts.join(':'), 'utf8');

      // Now attempting to load it should return null due to decryption failure
      const corruptedConfig = await secureConfigManager.getConfig('integrity-test');
      expect(corruptedConfig).toBeNull();
    });
  });

  describe('Error handling', () => {
    test('should prevent path traversal attacks in id', async () => {
      const invalidConfig = {
        id: '../../../etc/passwd',
        name: 'Malicious Config',
        type: 'bot',
        data: {}
      };

      // Either error message indicates invalid ID - regex validates early, path check is defense-in-depth
      await expect(secureConfigManager.storeConfig(invalidConfig as any)).rejects.toThrow(/Invalid configuration ID/);

      const getConfigPromise = secureConfigManager.getConfig('../../../etc/passwd');
      await expect(getConfigPromise).resolves.toBeNull(); // getConfig returns null on error

      const deleteConfigPromise = secureConfigManager.deleteConfig('../../../etc/passwd');
      await expect(deleteConfigPromise).rejects.toThrow(/Invalid configuration ID/);
    });

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

describe('SecureConfigManager - Additional error paths and validations', () => {
  let secureConfigManager;
  const testConfigDir = require('path').join(process.cwd(), 'config', 'secure');
  const testBackupDir = require('path').join(process.cwd(), 'config', 'backups');

  beforeEach(() => {
    try {
      if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true });
      }
    } catch (error) { }
    try {
      fs.mkdirSync(testConfigDir, { recursive: true });
    } catch (error) { }
    try {
      fs.mkdirSync(testBackupDir, { recursive: true });
    } catch (error) { }

    (require('../../src/config/SecureConfigManager').SecureConfigManager as any).instance = null;

    secureConfigManager = require('../../src/config/SecureConfigManager').SecureConfigManager.getInstance();
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  test('should reject creation without a name', async () => {
    const invalidConfig = {
      id: 'bot-no-name',
      name: '',
      type: 'bot',
      data: {}
    };

    await expect(secureConfigManager.storeConfig(invalidConfig as any)).rejects.toThrow('Configuration name is required');
  });

  test('should handle validation errors when retrieving corrupted file (invalid JSON)', async () => {
    const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
      id: 'corrupted-json-test',
      name: 'Corrupted JSON',
      type: 'bot',
      data: {},
      createdAt: new Date().toISOString()
    };

    await secureConfigManager.storeConfig(config);

    // Overwrite the file with a valid encrypted string that decrypts to invalid JSON
    const filePath = path.join(testConfigDir, 'corrupted-json-test.enc');
    const encryptedInvalidJson = secureConfigManager.encrypt('{invalid: json}');
    fs.writeFileSync(filePath, encryptedInvalidJson, 'utf8');

    const result = await secureConfigManager.getConfig('corrupted-json-test');
    expect(result).toBeNull();
  });

  test('should reject path traversal in restoreBackup', async () => {
    await expect(secureConfigManager.restoreBackup('../../../etc/passwd')).rejects.toThrow('Invalid backup ID: Path traversal detected');
  });

  test('should handle non-existent backup in restoreBackup', async () => {
    await expect(secureConfigManager.restoreBackup('backup_does_not_exist')).rejects.toThrow('Backup backup_does_not_exist not found');
  });

  test('should throw integrity error when restoring tampered backup', async () => {
    const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
      id: 'backup-tamper-test',
      name: 'Backup Tamper Test',
      type: 'bot',
      data: {},
      createdAt: new Date().toISOString()
    };

    await secureConfigManager.storeConfig(config);
    const backupId = await secureConfigManager.createBackup();

    // Read, tamper, encrypt, write
    const backupPath = path.join(testBackupDir, `${backupId}.json`);
    const encryptedBackup = fs.readFileSync(backupPath, 'utf8');
    const fullBackupData = JSON.parse(secureConfigManager.decrypt(encryptedBackup));

    // Tamper with data but keep old checksum
    fullBackupData.metadata.version = '99.99';

    const tamperedEncryptedBackup = secureConfigManager.encrypt(JSON.stringify(fullBackupData));
    fs.writeFileSync(backupPath, tamperedEncryptedBackup, 'utf8');

    await expect(secureConfigManager.restoreBackup(backupId)).rejects.toThrow('Backup integrity check failed');
  });

  test('should handle empty id during storeConfig', async () => {
    const invalidConfig = {
      id: '   ',
      name: 'Test',
      type: 'bot',
      data: {}
    };

    await expect(secureConfigManager.storeConfig(invalidConfig as any)).rejects.toThrow('Configuration ID is required');
  });
});
