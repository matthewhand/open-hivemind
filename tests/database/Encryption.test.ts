import 'reflect-metadata';
import { BotConfigRepository } from '../../src/database/repositories/BotConfigRepository';
import { encryptionService } from '../../src/database/EncryptionService';
import { IDatabase } from '../../src/database/types';

describe('Database At-Rest Encryption', () => {
  let repository: BotConfigRepository;
  let mockDb: jest.Mocked<IDatabase>;

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

  it('should handle legacy plain text data (graceful fallback)', async () => {
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
