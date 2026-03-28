jest.mock('../../src/config/profileUtils', () => ({
  loadProfiles: jest.fn(),
  saveProfiles: jest.fn(),
  findProfileByKey: jest.fn(),
}));

import {
  loadMessageProfiles,
  saveMessageProfiles,
  getMessageProfiles,
  getMessageProfileByKey,
  type MessageProfile,
} from '../../src/config/messageProfiles';
import * as profileUtils from '../../src/config/profileUtils';

describe('messageProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadMessageProfiles', () => {
    it('should return default profiles if loadProfiles throws or returns default', () => {
      (profileUtils.loadProfiles as jest.Mock).mockReturnValue({ message: [] });

      const profiles = loadMessageProfiles();
      expect(profiles).toEqual({ message: [] });
      expect(profileUtils.loadProfiles).toHaveBeenCalledWith(expect.objectContaining({
        filename: 'message-profiles.json',
        profileType: 'message',
      }));
    });

    it('should return profiles from loadProfiles', () => {
      const mockData = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      (profileUtils.loadProfiles as jest.Mock).mockReturnValue(mockData);

      const profiles = loadMessageProfiles();
      expect(profiles).toEqual(mockData);
    });
  });

  describe('saveMessageProfiles', () => {
    it('should save profiles to file using saveProfiles', () => {
      const profiles = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };

      saveMessageProfiles(profiles);
      expect(profileUtils.saveProfiles).toHaveBeenCalledWith(
        'message-profiles.json',
        profiles
      );
    });
  });

  describe('getMessageProfileByKey', () => {
    it('should return profile if found', () => {
      const mockData = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      (profileUtils.loadProfiles as jest.Mock).mockReturnValue(mockData);
      (profileUtils.findProfileByKey as jest.Mock).mockReturnValue(mockData.message[0]);

      const profile = getMessageProfileByKey('test');
      expect(profileUtils.findProfileByKey).toHaveBeenCalledWith(mockData.message, 'key', 'test');
      expect(profile).toEqual(mockData.message[0]);
    });
  });

  describe('getMessageProfiles', () => {
    it('should return profiles', () => {
      const mockData = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      (profileUtils.loadProfiles as jest.Mock).mockReturnValue(mockData);

      const profiles = getMessageProfiles();
      expect(profiles).toEqual(mockData);
    });
  });
});
