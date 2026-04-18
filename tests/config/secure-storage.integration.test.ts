import { SecureConfigManager } from '../../src/config/SecureConfigManager';
import * as fs from 'fs';
import * as path from 'path';

describe('Secure Storage Integration', () => {
  let manager: SecureConfigManager;

  beforeAll(async () => {
    manager = await SecureConfigManager.getInstance();
  });

  it('should encrypt and decrypt a value correctly', async () => {
    const originalValue = 'secret-data-123';
    const encrypted = await (manager as any).encrypt(originalValue);
    
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalValue);
    
    const decrypted = await (manager as any).decrypt(encrypted);
    expect(decrypted).toBe(originalValue);
  });

  it('should store and retrieve a secure config', async () => {
    const configId = 'test-config-id';
    const configData = { apiKey: 'secret-123', other: 'public' };
    
    await manager.storeConfig({
      id: configId,
      name: 'Test Config',
      data: configData
    });
    
    const retrieved = await manager.getConfig(configId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.data).toEqual(configData);
  });

  it('should list stored configs', async () => {
    const configs = await manager.listConfigs();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.some(c => c.id === 'test-config-id')).toBe(true);
  });
});
