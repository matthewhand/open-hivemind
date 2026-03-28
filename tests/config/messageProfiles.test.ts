jest.mock('fs', () => {
  const fsMock = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
  return {
    __esModule: true,
    default: fsMock,
    ...fsMock,
  };
});

import * as fs from 'fs';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('messageProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_CONFIG_DIR = '/mock/config';
  });

  afterEach(() => {
    delete process.env.NODE_CONFIG_DIR;
  });

  describe('loadMessageProfiles', () => {
    it('should return empty profiles if file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.mkdirSync.mockImplementation(() => undefined as any);

      jest.isolateModules(() => {
        const { loadMessageProfiles } = require('../../src/config/messageProfiles');
        const profiles = loadMessageProfiles();
        expect(profiles).toEqual({ message: [] });
        expect(mockedFs.writeFileSync).toHaveBeenCalled();
      });
    });

    it('should return profiles from file', () => {
      mockedFs.existsSync.mockReturnValue(true);
      const mockData = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      jest.isolateModules(() => {
        const { loadMessageProfiles } = require('../../src/config/messageProfiles');
        const profiles = loadMessageProfiles();
        expect(profiles).toEqual(mockData);
      });
    });
  });

  describe('saveMessageProfiles', () => {
    it('should save profiles to file', () => {
      const profiles = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.mkdirSync.mockImplementation(() => undefined as any);

      jest.isolateModules(() => {
        const { saveMessageProfiles } = require('../../src/config/messageProfiles');
        saveMessageProfiles(profiles);
        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('message-profiles.json'),
          JSON.stringify(profiles, null, 2)
        );
      });
    });
  });
});
