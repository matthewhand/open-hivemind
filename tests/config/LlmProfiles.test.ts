import { 
  normalizeModelType, 
  isEmbeddingCapableProfile, 
  loadLlmProfiles,
  getLlmProfileByKey,
  resolveEmbeddingProfileKey
} from '../../src/config/llmProfiles';
import { loadProfiles, saveProfiles } from '../../src/config/profileUtils';
import { UserConfigStore } from '../../src/config/UserConfigStore';

jest.mock('../../src/config/profileUtils', () => ({
  loadProfiles: jest.fn(),
  saveProfiles: jest.fn(),
  findProfileByKey: jest.fn((profiles, keyField, value) => profiles.find((p: any) => p[keyField] === value))
}));
jest.mock('../../src/config/UserConfigStore');
jest.mock('../../src/config/llmConfig', () => ({
  get: jest.fn()
}));

describe('LlmProfiles Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeModelType', () => {
    it('should normalize valid types', () => {
      expect(normalizeModelType('chat')).toBe('chat');
      expect(normalizeModelType('embedding')).toBe('embedding');
      expect(normalizeModelType('both')).toBe('both');
    });

    it('should default to chat for invalid or missing types', () => {
      expect(normalizeModelType('invalid')).toBe('chat');
      expect(normalizeModelType(undefined)).toBe('chat');
      expect(normalizeModelType(null)).toBe('chat');
    });
  });

  describe('isEmbeddingCapableProfile', () => {
    it('should identify embedding-capable profiles', () => {
      expect(isEmbeddingCapableProfile({ modelType: 'embedding' })).toBe(true);
      expect(isEmbeddingCapableProfile({ modelType: 'both' })).toBe(true);
      expect(isEmbeddingCapableProfile({ modelType: 'chat' })).toBe(false);
    });

    it('should handle null/undefined profiles', () => {
      expect(isEmbeddingCapableProfile(null)).toBe(false);
      expect(isEmbeddingCapableProfile(undefined)).toBe(false);
    });
  });

  describe('loadLlmProfiles', () => {
    it('should load and normalize profiles correctly', () => {
      const mockRawData = {
        llm: [
          { key: 'p1', name: 'Profile 1', provider: 'openai', config: {} },
          { key: 'p2', name: 'Profile 2', provider: 'anthropic', modelType: 'embedding', config: {} },
          { invalid: 'profile' }
        ]
      };
      (loadProfiles as jest.Mock).mockImplementation((opts) => opts.validateAndMigrate(mockRawData));

      const profiles = loadLlmProfiles();
      
      expect(profiles.llm).toHaveLength(2);
      expect(profiles.llm[0].key).toBe('p1');
      expect(profiles.llm[0].modelType).toBe('chat');
      expect(profiles.llm[1].key).toBe('p2');
      expect(profiles.llm[1].modelType).toBe('embedding');
    });
  });

  describe('resolveEmbeddingProfileKey', () => {
    it('should return the provided key if it is embedding capable', () => {
      const mockProfiles = {
        llm: [{ key: 'emb-1', name: 'E1', provider: 'p', modelType: 'embedding', config: {} }]
      };
      (loadProfiles as jest.Mock).mockReturnValue(mockProfiles);
      
      const result = resolveEmbeddingProfileKey('emb-1');
      expect(result).toBe('emb-1');
    });

    it('should return undefined if the provided key is not embedding capable', () => {
      const mockProfiles = {
        llm: [{ key: 'chat-1', name: 'C1', provider: 'p', modelType: 'chat', config: {} }]
      };
      (loadProfiles as jest.Mock).mockReturnValue(mockProfiles);
      
      const result = resolveEmbeddingProfileKey('chat-1');
      expect(result).toBeUndefined();
    });

    it('should fallback to default if no key is provided', () => {
      (UserConfigStore.getInstance as jest.Mock).mockReturnValue({
        getGeneralSettings: () => ({ defaultEmbeddingProfile: 'default-emb' })
      });
      const mockProfiles = {
        llm: [{ key: 'default-emb', name: 'DE', provider: 'p', modelType: 'embedding', config: {} }]
      };
      (loadProfiles as jest.Mock).mockReturnValue(mockProfiles);
      
      const result = resolveEmbeddingProfileKey();
      expect(result).toBe('default-emb');
    });
  });
});
