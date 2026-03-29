import fs from 'fs';
import path from 'path';
import {
  loadMessageProfiles,
  saveMessageProfiles,
  getMessageProfiles,
  getMessageProfileByKey,
  type MessageProfile,
} from '../../src/config/messageProfiles';

jest.mock('fs');
jest.mock('path');

describe('messageProfiles', () => {
  const mockConfigDir = '/mock/config';
  const mockFilePath = '/mock/config/message-profiles.json';

  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    // We need to handle path.join correctly for the test to work with the mock implementation in the source
    // But since source uses path.join(process.cwd(), 'config'), we can just mock return value for specific calls if needed
    // or rely on the mock implementation above.

    // Actually, let's just mock path.join to return what we want for the config file
    (path.join as jest.Mock).mockImplementation((...args) => {
        if (args.includes('message-profiles.json')) return mockFilePath;
        if (args.includes('config')) return mockConfigDir;
        return args.join('/');
    });

    (path.dirname as jest.Mock).mockReturnValue(mockConfigDir);
    process.env.NODE_CONFIG_DIR = mockConfigDir;
  });

  afterEach(() => {
    delete process.env.NODE_CONFIG_DIR;
  });

  describe('loadMessageProfiles', () => {
    it('should return empty profiles if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      // It tries to create scaffolding
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      const profiles = loadMessageProfiles();
      expect(profiles).toEqual({ message: [] });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return profiles from file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const mockData = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockData));

      const profiles = loadMessageProfiles();
      expect(profiles).toEqual(mockData);
    });
  });

  describe('saveMessageProfiles', () => {
    it('should save profiles to file', () => {
      const profiles = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      saveMessageProfiles(profiles);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        JSON.stringify(profiles, null, 2)
      );
    });
  });
});
