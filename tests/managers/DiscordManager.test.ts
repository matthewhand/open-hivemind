import DiscordManager from '../../src/message/discord/DiscordManager';
import { jest } from '@jest/globals';

// Mock the necessary parts of discord.js
jest.mock('discord.js', () => {
  const actualDiscord = jest.requireActual('discord.js');
  return {
    Client: jest.fn(() => ({
      login: jest.fn(() => Promise.resolve()),
      once: jest.fn((event: string, callback: () => void) => callback()),
      on: jest.fn(),
      user: { tag: 'TestBot' },
    })),
  };
});

describe('DiscordManager', () => {
  it('should log in and start the Discord client', async () => {
    const discordManager = new DiscordManager();
    const clientId = 'test-client-id';
    await discordManager.start(clientId);
    expect(discordManager['client'].login).toHaveBeenCalledWith(clientId);
    expect(discordManager['client'].once).toHaveBeenCalledWith('ready', expect.any(Function));
  });
});

