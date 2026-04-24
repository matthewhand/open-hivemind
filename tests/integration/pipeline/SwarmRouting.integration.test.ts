import { MessageBus } from '../../../src/events/MessageBus';
import { ToolManager } from '../../../src/services/ToolManager';
import { BotConfigurationManager } from '../../../src/config/BotConfigurationManager';
import type { IMessage } from '../../../src/message/interfaces/IMessage';

jest.mock('../../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getBot: jest.fn(),
    }),
  },
}));
jest.mock('../../../src/mcp/MCPService', () => ({
  MCPService: {
    getInstance: jest.fn().mockReturnValue({
      getToolsFromServer: jest.fn().mockReturnValue([]),
    }),
  },
}));

describe('Swarm Routing (Handoff) Integration', () => {
  let bus: MessageBus;
  let toolManager: ToolManager;
  let botConfigManager: jest.Mocked<BotConfigurationManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    bus = MessageBus.getInstance();
    bus.reset();
    bus = MessageBus.getInstance();
    
    toolManager = ToolManager.getInstance();
    botConfigManager = BotConfigurationManager.getInstance() as any;
  });

  it('should inject transfer_to_bot tool into all bots', async () => {
    botConfigManager.getBot.mockReturnValue({ name: 'Alpha', mcpServers: [] } as any);
    
    const tools = await toolManager.getToolsForBot('Alpha');
    const handoffTool = tools.find(t => t.name === 'transfer_to_bot');
    
    expect(handoffTool).toBeDefined();
    expect(handoffTool?.serverName).toBe('built-in');
    expect(handoffTool?.parameters.properties).toHaveProperty('targetBotName');
  });

  it('should execute handoff when transfer_to_bot is called', async () => {
    const mockContext = {
      botName: 'Alpha',
      userId: 'user-1',
      channelId: 'chan-1'
    };

    const result = await toolManager.executeTool('Alpha', 'transfer_to_bot', {
      targetBotName: 'Beta',
      reason: 'Need specialized technical help'
    }, mockContext as any);

    expect(result.success).toBe(true);
    expect(result.result).toContain('Successfully transferred conversation to Beta');
  });

  it('should handle handoff to non-existent bot gracefully', async () => {
    // Note: In current implementation, executeTool always returns success string 
    // because full re-routing happens in the pipeline listener (future improvement).
    // Here we test the current execution logic.
    
    const result = await toolManager.executeTool('Alpha', 'transfer_to_bot', {
      targetBotName: 'NonExistentBot',
      reason: 'Testing'
    });

    expect(result.success).toBe(true);
    expect(result.result).toContain('NonExistentBot');
  });
});
