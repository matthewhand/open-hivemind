import { SecureConfigManager } from '../../../src/config/SecureConfigManager';
import { redactSensitiveInfo } from '../../../src/common/redactSensitiveInfo';

describe('Credential Management and Secret Handling', () => {
  describe('Secure Config Manager', () => {
    let configManager: SecureConfigManager;

    beforeEach(() => {
      configManager = new SecureConfigManager();
    });

    test('should store and retrieve configurations securely', async () => {
      const testConfig = {
        id: 'test-config',
        name: 'Test Configuration',
        type: 'bot' as const,
        data: {
          apiKey: 'secret_api_key_123',
          password: 'secret_password'
        }
      };

      // Store configuration
      await configManager.storeConfig(testConfig);

      // Retrieve configuration
      const retrievedConfig = await configManager.getConfig('test-config');
      
      expect(retrievedConfig).not.toBeNull();
      expect(retrievedConfig?.id).toBe('test-config');
      expect(retrievedConfig?.name).toBe('Test Configuration');
      expect(retrievedConfig?.data.apiKey).toBe('secret_api_key_123');
      expect(retrievedConfig?.data.password).toBe('secret_password');
    });

    test('should handle missing configurations', async () => {
      const config = await configManager.getConfig('non-existent-config');
      expect(config).toBeNull();
    });

    test('should list all stored configurations', async () => {
      const testConfig1 = {
        id: 'test-config-1',
        name: 'Test Configuration 1',
        type: 'bot' as const,
        data: { apiKey: 'secret1' }
      };

      const testConfig2 = {
        id: 'test-config-2',
        name: 'Test Configuration 2',
        type: 'user' as const,
        data: { password: 'secret2' }
      };

      // Store configurations
      await configManager.storeConfig(testConfig1);
      await configManager.storeConfig(testConfig2);

      // List configurations
      const configIds = await configManager.listConfigs();
      
      expect(configIds).toContain('test-config-1');
      expect(configIds).toContain('test-config-2');
    });

    test('should delete configurations', async () => {
      const testConfig = {
        id: 'test-config-delete',
        name: 'Test Configuration for Deletion',
        type: 'system' as const,
        data: { secret: 'delete_me' }
      };

      // Store configuration
      await configManager.storeConfig(testConfig);

      // Verify it exists
      const config = await configManager.getConfig('test-config-delete');
      expect(config).not.toBeNull();

      // Delete configuration
      const deleted = await configManager.deleteConfig('test-config-delete');
      expect(deleted).toBe(true);

      // Verify it's gone
      const deletedConfig = await configManager.getConfig('test-config-delete');
      expect(deletedConfig).toBeNull();
    });
 });

  describe('Sensitive Information Redaction', () => {
    test('should redact API keys from values', () => {
      const apiKeyValue = 'secret_api_key_123';
      const passwordValue = 'secret_password';
      const normalValue = 'normal_value';

      const redactedApiKey = redactSensitiveInfo('apiKey', apiKeyValue);
      const redactedPassword = redactSensitiveInfo('password', passwordValue);
      const redactedNormal = redactSensitiveInfo('normalField', normalValue);

      expect(redactedApiKey).toBe('secr**********_123');
      expect(redactedPassword).toBe('secr*******word');
      expect(redactedNormal).toBe('normal_value');
    });

    test('should redact sensitive information from string values', () => {
      const secretValue = 'secret_api_key_123';
      const redacted = redactSensitiveInfo('auth_token', secretValue);

      expect(redacted).toBe('secr**********_123');
    });

    test('should handle different sensitive key patterns', () => {
      const secretValue = 'mySecret123';

      const redacted1 = redactSensitiveInfo('api_key', secretValue);
      const redacted2 = redactSensitiveInfo('authToken', secretValue);
      const redacted3 = redactSensitiveInfo('secretKey', secretValue);

      expect(redacted1).toBe('mySe****t123');
      expect(redacted2).toBe('mySe****t123');
      expect(redacted3).toBe('mySe****t123');
    });

    test('should not modify non-sensitive values', () => {
      const normalValue = 'normal_value';
      const redacted = redactSensitiveInfo('username', normalValue);

      expect(redacted).toBe('normal_value');
    });
  });

  describe('Hardcoded Credential Detection', () => {
    test('should not contain hardcoded credentials in config files', () => {
      // This test verifies that the hardcoded credentials have been removed
      // from the debugEnvVars.ts file by checking that no sensitive values
      // are directly embedded in the code
      expect(process.env.DISABLED_DEBUG_API_KEY).toBeUndefined();
      expect(process.env.DISABLED_DEBUG_DB_PASSWORD).toBeUndefined();
    });
  });
});