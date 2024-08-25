import { Client } from 'discord.js';
import { DiscordManager } from '../../src/message/discord/DiscordManager';
import { describe, it } from 'mocha';
import { expect } from 'chai';

// Mock the Client instance
const client = new Client({ intents: [] });

// Describe the tests for DiscordManager
describe('DiscordManager', () => {
  it('should initialize the DiscordManager correctly', () => {
    const discordManager = DiscordManager.getInstance(client);
    expect(discordManager).to.be.an('object');
    expect(discordManager).to.have.property('processMessage');
  });

  it('should process a message correctly', () => {
    const discordManager = DiscordManager.getInstance(client);
    const messageData = { content: 'Hello, world!' };
    const result = discordManager.processMessage(messageData);
    expect(result).to.equal('Message processed: Hello, world!');
  });
});
