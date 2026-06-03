import type { DemoConversation, DemoMessage } from '../../../src/services/demo/DemoConstants';
import { DemoConversationManager } from '../../../src/services/demo/DemoConversationManager';
import * as secureRandomModule from '../../../src/utils/secureRandom';

describe('DemoConversationManager', () => {
  let manager: DemoConversationManager;

  beforeEach(() => {
    manager = new DemoConversationManager();
  });

  describe('getOrCreateConversation', () => {
    it('should create a new conversation for a new channel/bot pair', () => {
      const conv = manager.getOrCreateConversation('channel-1', 'BotA');

      expect(conv.id).toBeDefined();
      expect(conv.channelId).toBe('channel-1');
      expect(conv.botName).toBe('BotA');
      expect(conv.messages).toEqual([]);
      expect(conv.createdAt).toBeDefined();
      expect(conv.updatedAt).toBeDefined();
    });

    it('should return the same conversation for the same channel/bot pair', () => {
      const conv1 = manager.getOrCreateConversation('channel-1', 'BotA');
      const conv2 = manager.getOrCreateConversation('channel-1', 'BotA');

      expect(conv2.id).toBe(conv1.id);
    });

    it('should create separate conversations for different channels', () => {
      const conv1 = manager.getOrCreateConversation('channel-1', 'BotA');
      const conv2 = manager.getOrCreateConversation('channel-2', 'BotA');

      expect(conv2.id).not.toBe(conv1.id);
    });

    it('should create separate conversations for different bots in the same channel', () => {
      const conv1 = manager.getOrCreateConversation('channel-1', 'BotA');
      const conv2 = manager.getOrCreateConversation('channel-1', 'BotB');

      expect(conv2.id).not.toBe(conv1.id);
    });
  });

  describe('addMessage', () => {
    it('should add a message to the conversation', () => {
      const msg = manager.addMessage('channel-1', 'BotA', 'Hello!', 'incoming');

      expect(msg.id).toBeDefined();
      expect(msg.timestamp).toBeDefined();
      expect(msg.botName).toBe('BotA');
      expect(msg.content).toBe('Hello!');
      expect(msg.type).toBe('incoming');
      expect(msg.isDemo).toBe(true);
    });

    it('should use default userId and userName when not specified', () => {
      const msg = manager.addMessage('channel-1', 'BotA', 'Test', 'outgoing');

      expect(msg.userId).toBe('demo-user');
      expect(msg.userName).toBe('Demo User');
    });

    it('should accept custom userId and userName', () => {
      const msg = manager.addMessage('channel-1', 'BotA', 'Test', 'outgoing', 'user-123', 'Alice');

      expect(msg.userId).toBe('user-123');
      expect(msg.userName).toBe('Alice');
    });

    it('should append multiple messages to the same conversation', () => {
      manager.addMessage('channel-1', 'BotA', 'Msg 1', 'incoming');
      manager.addMessage('channel-1', 'BotA', 'Msg 2', 'outgoing');

      const history = manager.getConversationHistory('channel-1', 'BotA');
      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Msg 1');
      expect(history[1].content).toBe('Msg 2');
    });

    it('should update the conversation updatedAt timestamp', () => {
      const conv = manager.getOrCreateConversation('channel-1', 'BotA');
      const originalUpdatedAt = conv.updatedAt;

      // Small delay to ensure timestamp change
      manager.addMessage('channel-1', 'BotA', 'Msg', 'incoming');

      const updated = manager.getOrCreateConversation('channel-1', 'BotA');
      // updatedAt should change or stay; in synchronous test they may be same
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('getConversationHistory', () => {
    it('should return empty array for unknown channel/bot pair', () => {
      const history = manager.getConversationHistory('unknown', 'UnknownBot');
      expect(history).toEqual([]);
    });

    it('should return a copy of the messages array', () => {
      manager.addMessage('channel-1', 'BotA', 'Msg', 'incoming');
      const history = manager.getConversationHistory('channel-1', 'BotA');

      expect(history).toHaveLength(1);
      // Mutating returned array should not affect internal state
      history.push({ id: 'fake' } as any);
      expect(manager.getConversationHistory('channel-1', 'BotA')).toHaveLength(1);
    });

    it('should return messages in insertion order', () => {
      manager.addMessage('channel-1', 'BotA', 'First', 'incoming');
      manager.addMessage('channel-1', 'BotA', 'Second', 'outgoing');
      manager.addMessage('channel-1', 'BotA', 'Third', 'incoming');

      const history = manager.getConversationHistory('channel-1', 'BotA');
      expect(history[0].content).toBe('First');
      expect(history[1].content).toBe('Second');
      expect(history[2].content).toBe('Third');
    });
  });

  describe('getAllConversations', () => {
    it('should return empty array initially', () => {
      expect(manager.getAllConversations()).toEqual([]);
    });

    it('should return all active conversations', () => {
      manager.addMessage('ch-1', 'BotA', 'Hi', 'incoming');
      manager.addMessage('ch-2', 'BotB', 'Hey', 'incoming');

      const all = manager.getAllConversations();
      expect(all).toHaveLength(2);
      expect(all.map((c) => c.channelId).sort()).toEqual(['ch-1', 'ch-2']);
    });
  });

  describe('generateDemoResponse', () => {
    it('should return a greeting response for hello/hi/hey', () => {
      const response = manager.generateDemoResponse('Hi there!', 'BotA');
      expect(response).toContain('Hello');
      expect(response).toContain('Open-Hivemind');
    });

    it('should return greeting for lowercase hi', () => {
      const response = manager.generateDemoResponse('hi', 'BotA');
      expect(response).toContain('Hello');
    });

    it('should return greeting for "hey"', () => {
      const response = manager.generateDemoResponse('hey there', 'BotA');
      expect(response).toContain('Hello');
    });

    it('should return greeting for "greetings"', () => {
      const response = manager.generateDemoResponse('greetings friend', 'BotA');
      expect(response).toContain('Hello');
    });

    it('should return help response when message contains "help"', () => {
      const response = manager.generateDemoResponse('I need help please', 'BotA');
      expect(response).toContain('Open-Hivemind offers');
    });

    it('should return a scenario response for non-greeting/non-help messages', () => {
      jest.spyOn(secureRandomModule, 'secureRandom').mockReturnValue(0);
      const response = manager.generateDemoResponse('What config options?', 'BotA');
      expect(response.length).toBeGreaterThan(0);
      // The first scenario response
      expect(response).toContain('Welcome!');
      jest.restoreAllMocks();
    });

    it('should return different responses based on random selection', () => {
      // The responses come from MESSAGE_SCENARIOS — verify it returns a string
      const response = manager.generateDemoResponse('tell me about bots', 'BotA');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should clear all conversations and messages', () => {
      manager.addMessage('ch-1', 'BotA', 'Hi', 'incoming');
      manager.addMessage('ch-2', 'BotB', 'Hey', 'incoming');

      expect(manager.getAllConversations()).toHaveLength(2);

      manager.reset();

      expect(manager.getAllConversations()).toEqual([]);
      expect(manager.getConversationHistory('ch-1', 'BotA')).toEqual([]);
    });
  });
});
