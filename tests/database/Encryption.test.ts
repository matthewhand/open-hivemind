import 'reflect-metadata';
import { BotConfigRepository } from '../../src/database/repositories/BotConfigRepository';
import { encryptionService, EncryptionService } from '../../src/database/EncryptionService';
import { IDatabase } from '../../src/database/types';

describe('Database At-Rest Encryption', () => {
  let repository: BotConfigRepository;
  let mockDb: jest.Mocked<IDatabase>;
  let originalKey: any;

  beforeAll(() => {
    originalKey = (encryptionService as any).encryptionKey;
    (encryptionService as any).encryptionKey = Buffer.alloc(32, 'a');
  });

  afterAll(() => {
    (encryptionService as any).encryptionKey = originalKey;
  });

  beforeEach(() => {
    mockDb = {
      run: jest.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
      get: jest.fn(),
      all: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
    } as any;

    repository = new BotConfigRepository(() => mockDb, () => {});
  });

  it('should encrypt sensitive fields on creation', async () => {
    const config: any = {
      name: 'SecureBot',
      messageProvider: 'slack',
      llmProvider: 'openai',
      openai: { apiKey: 'sk-12345' },
      isActive: true
    };

    await repository.createBotConfiguration(config);

    const callParams = mockDb.run.mock.calls[0][1];
    const encryptedOpenAI = callParams[10]; // index for openai field

    expect(encryptedOpenAI).toContain('enc:');
    expect(encryptedOpenAI).not.toContain('sk-12345');
  });

  it('should decrypt sensitive fields on retrieval', async () => {
    const encryptedData = encryptionService.encrypt(JSON.stringify({ apiKey: 'sk-secret' }));

    const mockRow = {
      id: 1,
      name: 'SecureBot',
      openai: encryptedData,
      isActive: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // @ts-ignore - access private mapping method
    const result = repository.mapRowToBotConfiguration(mockRow);

    expect(result.openai).toEqual({ apiKey: 'sk-secret' });
  });

  it('should pass through legacy plain text data (no enc: prefix)', async () => {
    const plainData = JSON.stringify({ apiKey: 'sk-legacy' });

    const mockRow = {
      id: 2,
      name: 'LegacyBot',
      openai: plainData,
      isActive: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // @ts-ignore
    const result = repository.mapRowToBotConfiguration(mockRow);

    expect(result.openai).toEqual({ apiKey: 'sk-legacy' });
  });
});

describe('EncryptionService failure modes', () => {
  const getInstance = (): EncryptionService => {
    // @ts-ignore - reset singleton for isolated tests
    EncryptionService.instance = undefined;
    return EncryptionService.getInstance();
  };

  it('encrypt throws (does not silently return plaintext) when the cipher fails', () => {
    const service = encryptionService;
    // Sanity-check key is initialized from the test environment's .key file or env var.
    // Force a failure by monkey-patching crypto.createCipheriv.
    const crypto = require('crypto');
    const originalCreateCipheriv = crypto.createCipheriv;
    crypto.createCipheriv = () => {
      throw new Error('forced cipher failure');
    };

    try {
      if (service.isEnabled()) {
        expect(() => service.encrypt('super-secret-api-key')).toThrow('forced cipher failure');
      } else {
        // When no key is configured, encrypt is a pass-through by design; skip.
        expect(service.encrypt('x')).toBe('x');
      }
    } finally {
      crypto.createCipheriv = originalCreateCipheriv;
    }
  });

  it('decrypt throws when the ciphertext has been tampered with', () => {
    const service = encryptionService;
    if (!service.isEnabled()) {
      // Without a key, decrypt is a pass-through; this test is only meaningful when encryption is enabled.
      return;
    }

    const valid = service.encrypt('hello world');
    // Flip one hex character in the encrypted payload segment to trigger GCM auth-tag failure.
    const parts = valid.split(':');
    const payload = parts[3];
    const tamperedChar = payload[0] === '0' ? '1' : '0';
    parts[3] = tamperedChar + payload.slice(1);
    const tampered = parts.join(':');

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('decrypt throws on a malformed enc: value (wrong segment count)', () => {
    const service = encryptionService;
    if (!service.isEnabled()) {
      return;
    }

    expect(() => service.decrypt('enc:not-enough-parts')).toThrow(/Malformed encrypted value/);
  });

  it('logs a prominent console.warn at init when no encryption key is configured', () => {
    const path = require('path');
    const fs = require('fs');
    const databaseConfig = require('../../src/config/databaseConfig').default;

    const originalGet = databaseConfig.get.bind(databaseConfig);
    const getSpy = jest.spyOn(databaseConfig, 'get').mockImplementation((...args: any[]) => {
      if (args[0] === 'ENCRYPTION_KEY') return '';
      return originalGet(...args);
    });

    const keyPath = path.join(process.cwd(), 'config', '.key');
    const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (p === keyPath) return false;
      // @ts-ignore
      return jest.requireActual('fs').existsSync(p);
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // @ts-ignore - reset singleton
      EncryptionService.instance = undefined;
      EncryptionService.getInstance();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const msg = warnSpy.mock.calls[0][0];
      expect(msg).toContain('[SECURITY]');
      expect(msg).toContain('DATABASE_ENCRYPTION_KEY');
      expect(msg).toContain('plaintext');
    } finally {
      warnSpy.mockRestore();
      existsSpy.mockRestore();
      getSpy.mockRestore();
      // @ts-ignore - restore a fresh, normal singleton for other tests
      EncryptionService.instance = undefined;
      EncryptionService.getInstance();
    }
  });
});
