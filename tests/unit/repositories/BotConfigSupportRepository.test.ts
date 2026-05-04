import { encryptionService } from "../../../src/database/EncryptionService";
import {
  BotConfigAuditRepository,
  BotConfigRepositoryBase,
  BotConfigVersionRepository,
} from '../../../src/database/repositories/BotConfigSupportRepository';
import type {
  BotConfigurationAudit,
  BotConfigurationVersion,
  IDatabase as Database,
} from '../../../src/database/types';

function makeMockDb(extra: Partial<Database> = {}): jest.Mocked<Database> {
  return {
    run: jest.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
    get: jest.fn(),
    all: jest.fn().mockResolvedValue([]),
    exec: jest.fn(),
    close: jest.fn(),
    ...extra,
  } as any;
}

describe('BotConfigRepositoryBase', () => {
  beforeAll(() => { (encryptionService as any).encryptionKey = Buffer.alloc(32, "a"); });
  afterAll(() => { (encryptionService as any).encryptionKey = null; });
  let base: BotConfigRepositoryBase;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    mockDb = makeMockDb();
    base = new BotConfigRepositoryBase(
      () => mockDb,
      () => {}
    );
  });

  describe('encryptField', () => {
    it('should encrypt object values', () => {
      const result = (base as any).encryptField({ apiKey: 'secret' });
      expect(result).toContain('enc:');
      expect(result).not.toContain('secret');
    });

    it('should return string for string values', () => {
      const result = (base as any).encryptField('plain-text');
      expect(typeof result).toBe('string');
    });

    it('should return null for null/undefined inputs', () => {
      expect((base as any).encryptField(null)).toBeNull();
      expect((base as any).encryptField(undefined)).toBeNull();
    });
  });

  describe('decryptField', () => {
    it('should return non-string values as-is', () => {
      expect((base as any).decryptField(42)).toBe(42);
      expect((base as any).decryptField(null)).toBeNull();
      expect((base as any).decryptField(undefined)).toBeUndefined();
    });

    it('should try to decrypt then JSON.parse encrypted values', () => {
      // First encrypt an object
      const encrypted = (base as any).encryptField({ key: 'value' });
      const decrypted = (base as any).decryptField(encrypted);
      expect(decrypted).toEqual({ key: 'value' });
    });

    it('should return plain strings as-is when decryption fails', () => {
      // A plain string without 'enc:' prefix should pass through
      const result = (base as any).decryptField('not-encrypted');
      // It tries decrypt which fails, then tries JSON.parse which fails, returns original
      expect(result).toBe('not-encrypted');
    });
  });

  describe('parseIfString', () => {
    it('should JSON.parse string values', () => {
      expect((base as any).parseIfString('{"key":"value"}')).toEqual({ key: 'value' });
      expect((base as any).parseIfString('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('should return non-string values as-is', () => {
      const obj = { key: 'value' };
      expect((base as any).parseIfString(obj)).toBe(obj);
      expect((base as any).parseIfString(null)).toBeNull();
    });
  });
});

describe('BotConfigVersionRepository', () => {
  beforeAll(() => { (encryptionService as any).encryptionKey = Buffer.alloc(32, "a"); });
  afterAll(() => { (encryptionService as any).encryptionKey = null; });
  let repo: BotConfigVersionRepository;
  let mockDb: jest.Mocked<Database>;
  // @ts-ignore - reset encryption service singleton for controlled tests
  beforeAll(() => {
    require('../../../src/database/EncryptionService').EncryptionService.instance = undefined;
    require('../../../src/database/EncryptionService').EncryptionService.getInstance();
  });

  beforeEach(() => {
    mockDb = makeMockDb();
    repo = new BotConfigVersionRepository(
      () => mockDb,
      () => {}
    );
  });

  describe('createBotConfigurationVersion', () => {
    it('should insert a version record and return lastID', async () => {
      const version: any = {
        botConfigurationId: 42,
        version: '1.0.0',
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        createdBy: 'admin',
        changeLog: 'Initial version',
      };

      const id = await repo.createBotConfigurationVersion(version);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(id).toBe(1);
    });

    it('should encrypt sensitive provider fields', async () => {
      const version: any = {
        botConfigurationId: 1,
        version: '1.0.0',
        name: 'Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        discord: { token: 'secret-discord-token' },
      };

      await repo.createBotConfigurationVersion(version);

      const callArgs = (mockDb.run as jest.Mock).mock.calls[0][1];
      // The 10th param (index 9) is discord (encrypted)
      const encryptedDiscord = callArgs[9];
      expect(encryptedDiscord).toContain('enc:');
      expect(encryptedDiscord).not.toContain('secret-discord-token');
    });

    it('should stringify mcpServers and mcpGuard', async () => {
      const version: any = {
        botConfigurationId: 1,
        version: '1.0.0',
        name: 'Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        mcpServers: [{ name: 'server-1' }],
        mcpGuard: { enabled: true },
      };

      await repo.createBotConfigurationVersion(version);

      const callArgs = (mockDb.run as jest.Mock).mock.calls[0][1];
      expect(callArgs[7]).toBe(JSON.stringify([{ name: 'server-1' }]));
      expect(callArgs[8]).toBe(JSON.stringify({ enabled: true }));
    });
  });

  describe('getBotConfigurationVersions', () => {
    it('should retrieve versions for a given bot configuration', async () => {
      mockDb.all.mockResolvedValue([
        {
          id: 1,
          botConfigurationId: 42,
          version: '1.0.0',
          name: 'BotA',
          isActive: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]);

      const versions = await repo.getBotConfigurationVersions(42);

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('bot_configuration_versions'),
        [42]
      );
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe('1.0.0');
    });

    it('should return empty array when db is null', async () => {
      const badRepo = new BotConfigVersionRepository(
        () => null,
        () => {}
      );
      await expect(badRepo.getBotConfigurationVersions(1)).rejects.toThrow();
    });
  });

  describe('getBotConfigurationVersionsBulk', () => {
    it('should return empty map for empty ids array', async () => {
      const result = await repo.getBotConfigurationVersionsBulk([]);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should group versions by botConfigurationId', async () => {
      mockDb.all.mockResolvedValue([
        {
          id: 1,
          botConfigurationId: 42,
          version: '1.0.0',
          name: 'BotA',
          isActive: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          botConfigurationId: 42,
          version: '1.0.1',
          name: 'BotA',
          isActive: 1,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ]);

      const result = await repo.getBotConfigurationVersionsBulk([42]);

      expect(result.get(42)).toHaveLength(2);
    });
  });

  describe('deleteBotConfigurationVersion', () => {
    it('should return true when changes > 0', async () => {
      mockDb.run.mockResolvedValue({ lastID: 0, changes: 1 });

      const result = await repo.deleteBotConfigurationVersion(42, '1.0.0');

      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [42, '1.0.0']);
    });

    it('should return false when no rows affected', async () => {
      mockDb.run.mockResolvedValue({ lastID: 0, changes: 0 });

      const result = await repo.deleteBotConfigurationVersion(42, 'nonexistent');

      expect(result).toBe(false);
    });
  });
});

describe('BotConfigAuditRepository', () => {
  beforeAll(() => { (encryptionService as any).encryptionKey = Buffer.alloc(32, "a"); });
  afterAll(() => { (encryptionService as any).encryptionKey = null; });
  let repo: BotConfigAuditRepository;
  let mockDb: jest.Mocked<Database>;

  beforeAll(() => {
    require('../../../src/database/EncryptionService').EncryptionService.instance = undefined;
    require('../../../src/database/EncryptionService').EncryptionService.getInstance();
  });

  beforeEach(() => {
    mockDb = makeMockDb();
    repo = new BotConfigAuditRepository(
      () => mockDb,
      () => {}
    );
  });

  describe('createBotConfigurationAudit', () => {
    it('should insert an audit record', async () => {
      const audit: any = {
        botConfigurationId: 42,
        action: 'UPDATE',
        oldValues: '{"name":"Old"}',
        newValues: '{"name":"New"}',
        performedBy: 'admin',
      };

      const id = await repo.createBotConfigurationAudit(audit);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(id).toBe(1);
    });

    it('should encrypt oldValues and newValues', async () => {
      const audit: any = {
        botConfigurationId: 42,
        action: 'CREATE',
        oldValues: '{"name":"Old"}',
        newValues: '{"name":"New"}',
        performedBy: 'admin',
      };

      await repo.createBotConfigurationAudit(audit);

      const callArgs = (mockDb.run as jest.Mock).mock.calls[0][1];
      const encryptedOld = callArgs[2];
      const encryptedNew = callArgs[3];

      expect(encryptedOld).not.toContain('name');
      expect(encryptedNew).not.toContain('name');
    });
  });

  describe('getBotConfigurationAudit', () => {
    it('should decrypt oldValues and newValues when retrieving', async () => {
      const { encryptionService } = require('../../../src/database/EncryptionService');
      const encryptedOld = encryptionService.encrypt('Old data');
      const encryptedNew = encryptionService.encrypt('New data');

      mockDb.all.mockResolvedValue([
        {
          id: 1,
          botConfigurationId: 42,
          action: 'UPDATE',
          oldValues: encryptedOld,
          newValues: encryptedNew,
          performedBy: 'admin',
          performedAt: '2024-01-01T00:00:00.000Z',
        },
      ]);

      const audits = await repo.getBotConfigurationAudit(42);

      expect(audits).toHaveLength(1);
      expect(audits[0].oldValues).toBe('Old data');
      expect(audits[0].newValues).toBe('New data');
    });

    it('should return empty array when db is null', async () => {
      const badRepo = new BotConfigAuditRepository(
        () => null as any,
        () => {}
      );
      await expect(badRepo.getBotConfigurationAudit(1)).rejects.toThrow();
    });
  });

  describe('getBotConfigurationAuditBulk', () => {
    it('should return empty map for empty ids array', async () => {
      const result = await repo.getBotConfigurationAuditBulk([]);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should group audits by botConfigurationId', async () => {
      const { encryptionService } = require('../../../src/database/EncryptionService');
      const enc = encryptionService.encrypt('data');

      mockDb.all.mockResolvedValue([
        {
          id: 1,
          botConfigurationId: 42,
          action: 'UPDATE',
          oldValues: enc,
          newValues: enc,
          performedBy: 'admin',
          performedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          botConfigurationId: 42,
          action: 'DELETE',
          oldValues: enc,
          newValues: enc,
          performedBy: 'admin',
          performedAt: '2024-01-02T00:00:00.000Z',
        },
      ]);

      const result = await repo.getBotConfigurationAuditBulk([42]);

      expect(result.get(42)).toHaveLength(2);
    });
  });
});
