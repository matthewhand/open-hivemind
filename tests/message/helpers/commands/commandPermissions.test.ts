import {
  checkCommandPermissions,
  isAuthorizedUser,
} from '@src/message/helpers/commands/commandPermissions';
import { IMessage } from '@src/message/interfaces/IMessage';

const createMockMessage = (authorId: string, channelId: string = 'test-channel'): IMessage =>
  ({
    getAuthorId: () => authorId,
    getChannelId: () => channelId,
    getText: () => '!test',
    getMessageId: () => 'msg-123',
    isFromBot: () => false,
  }) as any;

describe('Command Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAuthorizedUser', () => {
    it.each([
      ['authorized user', 'user1', ['user1', 'user2', 'admin'], true],
      ['authorized admin', 'admin', ['user1', 'user2', 'admin'], true],
      ['unauthorized user', 'hacker', ['user1', 'user2'], false],
      ['empty user', '', ['user1', 'user2'], false],
      ['empty list', 'user1', [], false],
      ['case sensitivity mismatch', 'user1', ['User1', 'ADMIN'], false],
      ['case sensitivity match', 'User1', ['User1', 'ADMIN'], true],
    ])('should handle %s', (desc, userId, authorizedUsers, expected) => {
      expect(isAuthorizedUser(userId, authorizedUsers)).toBe(expected);
    });
  });

  describe('checkCommandPermissions', () => {
    it('should allow commands when user is authorized', () => {
      const message = createMockMessage('authorized-user');
      const config = { authorizedUsers: ['authorized-user', 'admin'] };

      expect(checkCommandPermissions(message, 'status', config)).toBe(true);
    });

    it('should deny commands when user is not authorized', () => {
      const message = createMockMessage('unauthorized-user');
      const config = { authorizedUsers: ['admin', 'moderator'] };

      expect(checkCommandPermissions(message, 'status', config)).toBe(false);
    });

    it('should handle admin-only commands', () => {
      const adminMessage = createMockMessage('admin');
      const userMessage = createMockMessage('regular-user');
      const config = {
        authorizedUsers: ['admin', 'regular-user'],
        adminOnlyCommands: ['restart', 'config'],
      };

      expect(checkCommandPermissions(adminMessage, 'restart', config)).toBe(true);
      expect(checkCommandPermissions(userMessage, 'restart', config)).toBe(false);
      expect(checkCommandPermissions(userMessage, 'help', config)).toBe(true);
    });

    it('should handle channel-specific permissions', () => {
      const adminChannel = createMockMessage('user1', 'admin-channel');
      const publicChannel = createMockMessage('user1', 'public-channel');
      const config = {
        authorizedUsers: ['user1'],
        channelRestrictions: {
          'admin-channel': ['admin'],
          'public-channel': ['user1', 'user2'],
        },
      };

      expect(checkCommandPermissions(adminChannel, 'test', config)).toBe(false);
      expect(checkCommandPermissions(publicChannel, 'test', config)).toBe(true);
    });

    it('should handle rate limiting', () => {
      const message = createMockMessage('user1');
      const config = {
        authorizedUsers: ['user1'],
        rateLimits: {
          user1: { count: 5, window: 60000, lastReset: Date.now() },
        },
      };

      // Should allow within rate limit
      expect(checkCommandPermissions(message, 'test', config)).toBe(true);
    });

    it('should handle bot messages', () => {
      const botMessage = {
        getAuthorId: () => 'bot-user',
        getChannelId: () => 'test-channel',
        isFromBot: () => true,
      } as any;
      const config = { authorizedUsers: ['bot-user'] };

      expect(checkCommandPermissions(botMessage, 'test', config)).toBe(false);
    });

    it.each([
      ['missing configuration', {}],
      ['null configuration', null],
    ])('should handle %s', (desc, config) => {
      const message = createMockMessage('user1');

      expect(checkCommandPermissions(message, 'test', config as any)).toBe(false);
    });
  });
});
