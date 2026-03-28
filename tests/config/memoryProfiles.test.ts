/**
 * Unit tests for memoryProfiles config module.
 *
 * Mocks profileUtils so no filesystem I/O occurs.
 */

jest.mock('../../src/config/profileUtils', () => ({
  loadProfiles: jest.fn(),
  saveProfiles: jest.fn(),
  findProfileByKey: jest.fn(),
}));

import {
  loadMemoryProfiles,
  saveMemoryProfiles,
  getMemoryProfileByKey,
  getMemoryProfiles,
  type MemoryProfile,
  type MemoryProfiles,
} from '../../src/config/memoryProfiles';

import { loadProfiles, saveProfiles, findProfileByKey } from '../../src/config/profileUtils';

const mockLoadProfiles = loadProfiles as jest.Mock;
const mockSaveProfiles = saveProfiles as jest.Mock;
const mockFindProfileByKey = findProfileByKey as jest.Mock;

describe('memoryProfiles', () => {
  const sampleProfiles: MemoryProfiles = {
    memory: [
      { key: 'mem0-default', name: 'Mem0 Default', provider: 'mem0', config: { apiKey: 'xxx' } },
      { key: 'zep', name: 'Zep', provider: 'zep', config: { url: 'http://localhost' }, description: 'Zep memory' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* -- loadMemoryProfiles ------------------------------------------------- */

  describe('loadMemoryProfiles', () => {
    it('calls loadProfiles with correct filename and profileType', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      const result = loadMemoryProfiles();
      expect(mockLoadProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'memory-profiles.json',
          profileType: 'memory',
        })
      );
      expect(result).toEqual(sampleProfiles);
    });

    it('passes a validateAndMigrate function', () => {
      mockLoadProfiles.mockReturnValue({ memory: [] });
      loadMemoryProfiles();
      const opts = mockLoadProfiles.mock.calls[0][0];
      expect(typeof opts.validateAndMigrate).toBe('function');
    });

    it('validateAndMigrate normalises valid data', () => {
      mockLoadProfiles.mockImplementation((opts: any) => opts.validateAndMigrate(sampleProfiles));
      const result = loadMemoryProfiles();
      expect(result.memory).toHaveLength(2);
    });

    it('validateAndMigrate returns empty array when memory field is not an array', () => {
      mockLoadProfiles.mockImplementation((opts: any) =>
        opts.validateAndMigrate({ memory: 'bad' })
      );
      const result = loadMemoryProfiles();
      expect(result.memory).toEqual([]);
    });

    it('validateAndMigrate throws when input is null', () => {
      mockLoadProfiles.mockImplementation((opts: any) => opts.validateAndMigrate(null));
      expect(() => loadMemoryProfiles()).toThrow('memory profiles must be an object');
    });

    it('validateAndMigrate throws when input is not an object', () => {
      mockLoadProfiles.mockImplementation((opts: any) => opts.validateAndMigrate(42));
      expect(() => loadMemoryProfiles()).toThrow('memory profiles must be an object');
    });

    it('provides default data with empty memory array', () => {
      mockLoadProfiles.mockReturnValue({ memory: [] });
      loadMemoryProfiles();
      const opts = mockLoadProfiles.mock.calls[0][0];
      expect(opts.defaultData).toEqual({ memory: [] });
    });
  });

  /* -- saveMemoryProfiles ------------------------------------------------- */

  describe('saveMemoryProfiles', () => {
    it('delegates to saveProfiles with correct filename', () => {
      saveMemoryProfiles(sampleProfiles);
      expect(mockSaveProfiles).toHaveBeenCalledWith('memory-profiles.json', sampleProfiles);
    });
  });

  /* -- getMemoryProfileByKey ---------------------------------------------- */

  describe('getMemoryProfileByKey', () => {
    it('loads profiles and finds by key', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      mockFindProfileByKey.mockReturnValue(sampleProfiles.memory[0]);
      const result = getMemoryProfileByKey('mem0-default');
      expect(mockFindProfileByKey).toHaveBeenCalledWith(sampleProfiles.memory, 'key', 'mem0-default');
      expect(result).toEqual(sampleProfiles.memory[0]);
    });

    it('returns undefined when key not found', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      mockFindProfileByKey.mockReturnValue(undefined);
      expect(getMemoryProfileByKey('missing')).toBeUndefined();
    });
  });

  /* -- getMemoryProfiles -------------------------------------------------- */

  describe('getMemoryProfiles', () => {
    it('is an alias for loadMemoryProfiles', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      expect(getMemoryProfiles()).toEqual(sampleProfiles);
    });
  });
});
