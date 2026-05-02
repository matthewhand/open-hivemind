import crypto from 'crypto';
import { MESSAGE_SCENARIOS, type DemoConversation, type DemoMessage } from './DemoConstants';

/**
 * Manages demo conversations and message history.
 */
export class DemoConversationManager {
  private conversations = new Map<string, DemoConversation>();

  public getOrCreateConversation(channelId: string, botName: string): DemoConversation {
    const key = `${botName}:${channelId}`;
    let conversation = this.conversations.get(key);
    if (!conversation) {
      conversation = {
        id: `conv-${Date.now()}-${crypto.randomUUID()}`,
        channelId,
        botName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.conversations.set(key, conversation);
    }

    return conversation;
  }

  public addMessage(
    channelId: string,
    botName: string,
    content: string,
    type: 'incoming' | 'outgoing',
    userId = 'demo-user',
    userName = 'Demo User'
  ): DemoMessage {
    const conversation = this.getOrCreateConversation(channelId, botName);
    const message: DemoMessage = {
      id: `msg-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      botName,
      channelId,
      userId,
      userName,
      content,
      type,
      isDemo: true,
    };
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    return message;
  }

  public getConversationHistory(channelId: string, botName: string): DemoMessage[] {
    const key = `${botName}:${channelId}`;
    const conv = this.conversations.get(key);
    return conv ? [...conv.messages] : [];
  }

  public getAllConversations(): DemoConversation[] {
    return Array.from(this.conversations.values());
  }

  public generateDemoResponse(message: string, _botName: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.match(/^(hi|hello|hey|greetings)/)) {
      return "Hello! 👋 Welcome to Open-Hivemind! I'm a demo bot. How can I help you today?";
    }
    if (lowerMessage.includes('help')) {
      return 'Open-Hivemind offers multi-platform bots, multiple LLM providers, MCP integration, and personas. Configure API keys to unlock full functionality!';
    }
    const randomIndex = Math.floor(Math.random() * MESSAGE_SCENARIOS.length);
    const scenario = MESSAGE_SCENARIOS[randomIndex];
    return scenario.response;
  }

  public reset(): void {
    this.conversations.clear();
  }
}
