import {
  loadMessageProfiles,
  saveMessageProfiles,
  getMessageProfiles,
  getMessageProfileByKey,
  type MessageProfile,
} from '../../src/config/messageProfiles';
import { loadProfiles, saveProfiles, findProfileByKey } from '../../src/config/profileUtils';

jest.mock('../../src/config/profileUtils', () => ({
  loadProfiles: jest.fn(),
  saveProfiles: jest.fn(),
  findProfileByKey: jest.requireActual('../../src/config/profileUtils').findProfileByKey,
}));

describe('messageProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadMessageProfiles', () => {
    it('should call loadProfiles with correct options', () => {
      const mockData = { message: [] };
      (loadProfiles as jest.Mock).mockReturnValue(mockData);

      const profiles = loadMessageProfiles();

      expect(loadProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'message-profiles.json',
          defaultData: { message: [] },
          profileType: 'message',
          validateAndMigrate: expect.any(Function)
        })
      );
      expect(profiles).toEqual(mockData);
    });

    it('validateAndMigrate should parse correctly', () => {
      // Get the validateAndMigrate function passed to loadProfiles
      loadMessageProfiles();
      const callArgs = (loadProfiles as jest.Mock).mock.calls[0][0];
      const validateAndMigrate = callArgs.validateAndMigrate;

      expect(validateAndMigrate({ message: [{ key: 'test' }] })).toEqual({
        message: [{ key: 'test' }],
      });

      expect(validateAndMigrate({ message: 'invalid' })).toEqual({
        message: [],
      });

      expect(() => validateAndMigrate('not-an-object')).toThrow('message profiles must be an object');
    });
  });

  describe('saveMessageProfiles', () => {
    it('should call saveProfiles with correct filename and data', () => {
      const profiles = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };

      saveMessageProfiles(profiles);

      expect(saveProfiles).toHaveBeenCalledWith('message-profiles.json', profiles);
    });
  });

  describe('getMessageProfileByKey', () => {
    it('should use findProfileByKey on loaded profiles', () => {
      const mockProfiles = {
        message: [
          { key: 'test', name: 'Test', provider: 'discord', config: {} }
        ]
      };
      (loadProfiles as jest.Mock).mockReturnValue(mockProfiles);

      const expectedProfile = mockProfiles.message[0];

      const result = getMessageProfileByKey('test');

      expect(loadProfiles).toHaveBeenCalled();
      expect(result).toEqual(expectedProfile);
    });
  });

  describe('getMessageProfiles', () => {
    it('should load message profiles', () => {
      const mockData = { message: [] };
      (loadProfiles as jest.Mock).mockReturnValue(mockData);

      const result = getMessageProfiles();

      expect(loadProfiles).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
  });
});
