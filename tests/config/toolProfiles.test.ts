/**
 * Unit tests for toolProfiles config module.
 *
 * Mocks profileUtils so no filesystem I/O occurs.
 */

jest.mock('../../src/config/profileUtils', () => ({
  loadProfiles: jest.fn(),
  saveProfiles: jest.fn(),
  findProfileByKey: jest.fn(),
}));

import {
  loadToolProfiles,
  saveToolProfiles,
  getToolProfileByKey,
  getToolProfiles,
  type ToolProfile,
  type ToolProfiles,
} from '../../src/config/toolProfiles';

import { loadProfiles, saveProfiles, findProfileByKey } from '../../src/config/profileUtils';

const mockLoadProfiles = loadProfiles as jest.Mock;
const mockSaveProfiles = saveProfiles as jest.Mock;
const mockFindProfileByKey = findProfileByKey as jest.Mock;

describe('toolProfiles', () => {
  const sampleProfiles: ToolProfiles = {
    tool: [
      { key: 'mcp-search', name: 'MCP Search', provider: 'mcp', config: { transport: 'stdio', command: 'node' } },
      { key: 'mcp-weather', name: 'MCP Weather', provider: 'mcp', config: { transport: 'sse', url: 'http://localhost:3000' }, description: 'Weather tool' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* -- loadToolProfiles --------------------------------------------------- */

  describe('loadToolProfiles', () => {
    it('calls loadProfiles with correct filename and profileType', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      const result = loadToolProfiles();
      expect(mockLoadProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'tool-profiles.json',
          profileType: 'tool',
        })
      );
      expect(result).toEqual(sampleProfiles);
    });

    it('passes a validateAndMigrate function', () => {
      mockLoadProfiles.mockReturnValue({ tool: [] });
      loadToolProfiles();
      const opts = mockLoadProfiles.mock.calls[0][0];
      expect(typeof opts.validateAndMigrate).toBe('function');
    });

    it('validateAndMigrate normalises valid data', () => {
      mockLoadProfiles.mockImplementation((opts: any) => opts.validateAndMigrate(sampleProfiles));
      const result = loadToolProfiles();
      expect(result.tool).toHaveLength(2);
    });

    it('validateAndMigrate returns empty array when tool field is not an array', () => {
      mockLoadProfiles.mockImplementation((opts: any) =>
        opts.validateAndMigrate({ tool: 'bad' })
      );
      const result = loadToolProfiles();
      expect(result.tool).toEqual([]);
    });

    it('validateAndMigrate throws when input is null', () => {
      mockLoadProfiles.mockImplementation((opts: any) => opts.validateAndMigrate(null));
      expect(() => loadToolProfiles()).toThrow('tool profiles must be an object');
    });

    it('validateAndMigrate throws when input is not an object', () => {
      mockLoadProfiles.mockImplementation((opts: any) => opts.validateAndMigrate(42));
      expect(() => loadToolProfiles()).toThrow('tool profiles must be an object');
    });

    it('provides default data with empty tool array', () => {
      mockLoadProfiles.mockReturnValue({ tool: [] });
      loadToolProfiles();
      const opts = mockLoadProfiles.mock.calls[0][0];
      expect(opts.defaultData).toEqual({ tool: [] });
    });
  });

  /* -- saveToolProfiles --------------------------------------------------- */

  describe('saveToolProfiles', () => {
    it('delegates to saveProfiles with correct filename', () => {
      saveToolProfiles(sampleProfiles);
      expect(mockSaveProfiles).toHaveBeenCalledWith('tool-profiles.json', sampleProfiles);
    });
  });

  /* -- getToolProfileByKey ------------------------------------------------ */

  describe('getToolProfileByKey', () => {
    it('loads profiles and finds by key', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      mockFindProfileByKey.mockReturnValue(sampleProfiles.tool[0]);
      const result = getToolProfileByKey('mcp-search');
      expect(mockFindProfileByKey).toHaveBeenCalledWith(sampleProfiles.tool, 'key', 'mcp-search');
      expect(result).toEqual(sampleProfiles.tool[0]);
    });

    it('returns undefined when key not found', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      mockFindProfileByKey.mockReturnValue(undefined);
      expect(getToolProfileByKey('missing')).toBeUndefined();
    });
  });

  /* -- getToolProfiles ---------------------------------------------------- */

  describe('getToolProfiles', () => {
    it('is an alias for loadToolProfiles', () => {
      mockLoadProfiles.mockReturnValue(sampleProfiles);
      expect(getToolProfiles()).toEqual(sampleProfiles);
    });
  });
});
