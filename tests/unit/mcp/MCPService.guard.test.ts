import { jest } from '@jest/globals';
import { MCPService } from '../../../src/mcp/MCPService';
import type { MCPGuardConfig } from '../../../src/mcp/MCPGuard';

jest.mock('@modelcontextprotocol/sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    listTools: jest.fn().mockResolvedValue({ tools: [] }),
  })),
}));

const slackOwner = jest.fn();
const discordOwner = jest.fn();

jest.mock('@integrations/slack/providers/SlackMessageProvider', () => ({
  SlackMessageProvider: jest.fn().mockImplementation(() => ({
    getForumOwner: slackOwner,
  })),
}));

jest.mock('@integrations/discord/providers/DiscordMessageProvider', () => ({
  DiscordMessageProvider: jest.fn().mockImplementation(() => ({
    getForumOwner: discordOwner,
  })),
}));

const mockManager = {
  getBot: jest.fn(),
};

jest.mock('@config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn(() => mockManager),
  },
}));

describe('MCPService guard enforcement', () => {
  let service: MCPService;
  const callTool = jest.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    jest.clearAllMocks();
    (MCPService as unknown as { instance: MCPService | undefined }).instance = undefined;
    service = MCPService.getInstance();
    (service as unknown as { clients: Map<string, any> }).clients.set('server', { callTool });
  });

  afterEach(() => {
    (service as unknown as { clients: Map<string, any> }).clients.clear();
  });

  const setGuard = (guard: MCPGuardConfig | undefined) => {
    mockManager.getBot.mockReturnValue({
      name: 'BotA',
      messageProvider: 'slack',
      mcpGuard: guard,
    });
  };

  it('allows execution when guard disabled', async () => {
    setGuard({ enabled: false, type: 'owner' });
    await expect(
      service.executeTool('server', 'demo', {}, { botName: 'BotA', userId: 'user1' })
    ).resolves.toEqual({ ok: true });
    expect(callTool).toHaveBeenCalled();
  });

  it('allows owner when guard type owner', async () => {
    setGuard({ enabled: true, type: 'owner' });
    await expect(
      service.executeTool('server', 'demo', {}, {
        botName: 'BotA',
        userId: 'owner123',
        forumOwnerId: 'owner123',
      })
    ).resolves.toEqual({ ok: true });
    expect(callTool).toHaveBeenCalledTimes(1);
  });

  it('denies non-owner when guard type owner', async () => {
    setGuard({ enabled: true, type: 'owner' });
    await expect(
      service.executeTool('server', 'demo', {}, {
        botName: 'BotA',
        userId: 'user-nope',
        forumOwnerId: 'owner123',
      })
    ).rejects.toThrow(/denied/i);
    expect(callTool).not.toHaveBeenCalled();
  });

  it('allows custom list when user present', async () => {
    setGuard({ enabled: true, type: 'custom', allowedUserIds: ['user-1', 'user-2'] });
    await expect(
      service.executeTool('server', 'demo', {}, {
        botName: 'BotA',
        userId: 'user-2',
      })
    ).resolves.toEqual({ ok: true });
    expect(callTool).toHaveBeenCalled();
  });

  it('derives forum owner via provider when not supplied', async () => {
    slackOwner.mockResolvedValue('slack-owner');
    setGuard({ enabled: true, type: 'owner' });
    await expect(
      service.executeTool('server', 'demo', {}, {
        botName: 'BotA',
        userId: 'slack-owner',
        messageProvider: 'slack',
        forumId: 'C123',
      })
    ).resolves.toEqual({ ok: true });
    expect(slackOwner).toHaveBeenCalledWith('C123');
  });
});
