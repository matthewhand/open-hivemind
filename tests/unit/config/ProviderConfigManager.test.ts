import path from 'path';
import { z } from 'zod';

import ProviderConfigManager, { ProviderStoreSchema } from '@src/config/ProviderConfigManager';

describe('ProviderConfigManager Validation', () => {
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  const getFreshManager = () => {
    (ProviderConfigManager as any).instance = undefined;
    return ProviderConfigManager.getInstance();
  };

  it('validates a valid configuration successfully via validateConfigRaw', () => {
    const validConfig = {
      message: [
        {
          id: '123',
          type: 'discord',
          category: 'message',
          name: 'My Bot',
          enabled: true,
          config: { token: 'secret' }
        }
      ],
      llm: []
    };

    const manager = getFreshManager();
    const result = manager.validateConfigRaw(validConfig);

    expect(mockExit).not.toHaveBeenCalled();
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.message[0].name).toBe('My Bot');
  });

  it('fails fast and exits when the config fails schema validation (missing required field)', () => {
    const invalidConfig = {
      message: [
        {
          id: '123',
          // type is missing
          category: 'message',
          name: 'My Bot',
          enabled: true,
          config: {}
        }
      ]
    };

    const manager = getFreshManager();
    try {
      manager.validateConfigRaw(invalidConfig);
    } catch(e) {}

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('fails fast when category is invalid', () => {
    const invalidConfig = {
      message: [
        {
          id: '123',
          type: 'discord',
          category: 'invalid_category', // Should be 'message' or 'llm'
          name: 'My Bot',
          enabled: true,
          config: {}
        }
      ]
    };

    const manager = getFreshManager();
    try {
      manager.validateConfigRaw(invalidConfig);
    } catch(e) {}

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('ProviderStoreSchema validates properly', () => {
    const result = ProviderStoreSchema.safeParse({ message: [{ id: "1", type: "a", category: "message", name: "n", enabled: true, config: {} }] });
    expect(result.success).toBe(true);
  });
});
