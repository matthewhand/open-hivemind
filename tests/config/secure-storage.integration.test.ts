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

  it('should protect sensitive fields in configuration', async () => {
    const config = {
      apiKey: 'real-key',
      other: 'public'
    };
    
    const protectedConfig = await manager.protectConfig(config, ['apiKey']);
    expect(protectedConfig.apiKey).toContain('ENC:');
    expect(protectedConfig.other).toBe('public');
    
    const restoredConfig = await manager.revealConfig(protectedConfig);
    expect(restoredConfig.apiKey).toBe('real-key');
  });
});
