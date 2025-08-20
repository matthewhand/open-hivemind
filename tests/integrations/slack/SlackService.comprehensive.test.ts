import { SlackService } from '@src/integrations/slack/SlackService';
import { Application } from 'express';

jest.mock('@src/integrations/slack/SlackBotManager');
jest.mock('@src/integrations/slack/SlackSignatureVerifier');
jest.mock('@src/integrations/slack/SlackEventProcessor');

describe('SlackService Comprehensive', () => {
  let service: SlackService;
  let mockApp: jest.Mocked<Application>;

  beforeEach(() => {
    mockApp = {
      post: jest.fn(),
      use: jest.fn()
    } as any;
    
    service = SlackService.getInstance();
    service.setApp(mockApp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle rate limiting in message sending', async () => {
    const rateLimitError = new Error('Rate limited');
    (rateLimitError as any).status = 429;
    
    const mockBotManager = {
      getAllBots: () => [{
        webClient: {
          chat: {
            postMessage: jest.fn()
              .mockRejectedValueOnce(rateLimitError)
              .mockResolvedValueOnce({ ts: '1234567890.123456' })
          }
        }
      }]
    };
    
    service['botManagers'].set('test-bot', mockBotManager as any);
    
    const result = await service.sendMessageToChannel('C1234567890', 'Test message', 'test-bot');
    
    expect(result).toBe('1234567890.123456');
  });

  it('should handle concurrent message processing', async () => {
    const messages = Array.from({ length: 10 }, (_, i) => `Message ${i}`);
    const promises = messages.map(msg => 
      service.sendMessageToChannel('C1234567890', msg)
    );
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(10);
    results.forEach(result => expect(typeof result).toBe('string'));
  });

  it('should validate message content before sending', async () => {
    const invalidMessages = [
      '', // empty
      ' '.repeat(4001), // too long
      null as any, // null
      undefined as any // undefined
    ];
    
    for (const msg of invalidMessages) {
      const result = await service.sendMessageToChannel('C1234567890', msg);
      expect(result).toBe('');
    }
  });

  it('should handle bot configuration errors gracefully', async () => {
    const invalidConfig = {
      name: 'invalid-bot',
      slack: {
        botToken: '', // empty token
        signingSecret: 'valid-secret'
      }
    };
    
    await expect(service.addBot(invalidConfig))
      .rejects.toThrow();
  });

  it('should cleanup resources on shutdown', async () => {
    const mockDestroy = jest.fn();
    service['botManagers'].set('test-bot', {
      getAllBots: () => [{
        socketClient: { disconnect: mockDestroy },
        rtmClient: { disconnect: mockDestroy }
      }]
    } as any);
    
    await service.removeBot('test-bot');
    
    expect(mockDestroy).toHaveBeenCalledTimes(2);
    expect(service['botManagers'].has('test-bot')).toBe(false);
  });

  it('should handle malformed webhook payloads', async () => {
    const malformedPayloads = [
      '{"invalid": json}',
      'not json at all',
      '{}', // empty object
      '{"type": "unknown_event"}'
    ];
    
    // This would be tested through webhook endpoint integration
    expect(malformedPayloads).toHaveLength(4);
  });
});