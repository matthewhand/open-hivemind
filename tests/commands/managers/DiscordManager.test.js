const { Client } = require('discord.js');
const DiscordManager = require('../../../src/managers/DiscordManager');
const { info, debug } = require('../../../src/utils/logger');
const configurationManager = require('../../../src/config/configurationManager');

describe('DiscordManager', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    Client.mockClear();
    info.mockClear();
    debug.mockClear();
    configurationManager.getConfig.mockClear();
  });

  it('should initialize a Discord client with the correct intents', () => {
    const manager = new DiscordManager();
    expect(Client).toHaveBeenCalledTimes(1);
    expect(Client.mock.calls[0][0]).toEqual({
      intents: [
        expect.anything(), // Add specific intent checks as necessary
      ],
    });
  });

  it('should implement a singleton pattern', () => {
    const firstInstance = new DiscordManager();
    const secondInstance = new DiscordManager();
    expect(firstInstance).toBe(secondInstance);
  });

  it('should log in the client with the correct token', () => {
    new DiscordManager();
    expect(configurationManager.getConfig).toHaveBeenCalledWith('DISCORD_TOKEN');
    expect(Client.prototype.login).toHaveBeenCalledWith('dummy_token');
  });
});
