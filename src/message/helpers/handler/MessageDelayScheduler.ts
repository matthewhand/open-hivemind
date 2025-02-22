import Debug from 'debug';
import { getRandomDelay } from '@src/common/getRandomDelay';
import messageConfig from '@message/interfaces/messageConfig';

const debug = Debug('app:MessageDelayScheduler');

interface ChannelState {
  lastMessageTime: number;
  isAddressed: boolean;
  pendingMessages: Map<string, string>;
  silenceTimeout?: NodeJS.Timeout;
  userThreads: Map<string, { threadId: string; lastPostTime: number }>;
}

export class MessageDelayScheduler {
  private static instance: MessageDelayScheduler | undefined;
  private channelStates: Map<string, ChannelState> = new Map();
  private readonly silenceThreshold: number = messageConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW') || 300000;
  private readonly threadRelationWindow: number = messageConfig.get('MESSAGE_THREAD_RELATION_WINDOW') || 300000;
  private readonly minDelay: number = messageConfig.get('MESSAGE_MIN_DELAY') || 1000;
  private readonly maxDelay: number = messageConfig.get('MESSAGE_MAX_DELAY') || 10000;

  private constructor() {}

  public static getInstance(): MessageDelayScheduler {
    if (!MessageDelayScheduler.instance) {
      MessageDelayScheduler.instance = new MessageDelayScheduler();
    }
    return MessageDelayScheduler.instance;
  }

  public async scheduleMessage(channelId: string, messageId: string, content: string, userId: string, sendMessage: (text: string, threadId?: string) => Promise<string>, isDirectlyAddressed: boolean = false): Promise<void> {
    let state = this.channelStates.get(channelId) || { 
      lastMessageTime: 0, 
      isAddressed: false, 
      pendingMessages: new Map(), 
      silenceTimeout: undefined, // Explicitly initialize as undefined
      userThreads: new Map() 
    };
    this.channelStates.set(channelId, state);

    state.pendingMessages.set(messageId, content);
    state.lastMessageTime = Date.now();
    if (state.silenceTimeout) clearTimeout(state.silenceTimeout);

    const onlyWhenSpokenTo = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO');
    const interactiveFollowups = messageConfig.get('MESSAGE_INTERACTIVE_FOLLOWUPS');
    const unsolicitedAddressed = messageConfig.get('MESSAGE_UNSOLICITED_ADDRESSED');
    const unsolicitedUnaddressed = messageConfig.get('MESSAGE_UNSOLICITED_UNADDRESSED');
    const respondInThread = messageConfig.get('MESSAGE_RESPOND_IN_THREAD');

    const isCommand = messageConfig.get('MESSAGE_WAKEWORDS')?.split(',').some(w => content.startsWith(w)) || isDirectlyAddressed;
    if (isCommand) state.isAddressed = true;

    let shouldRespond = false;
    if (onlyWhenSpokenTo) {
      shouldRespond = isCommand;
    } else {
      if (state.isAddressed && (unsolicitedAddressed || isCommand)) shouldRespond = true;
      if (!state.isAddressed && unsolicitedUnaddressed) shouldRespond = Math.random() < 0.3;
      if (state.isAddressed && !isCommand) shouldRespond = Math.random() < 0.5;
    }

    if (!shouldRespond) return;

    const baseDelay = getRandomDelay(this.minDelay, this.maxDelay);
    const userThread = state.userThreads.get(userId);
    let threadId = userThread?.threadId;

    if (userThread && (Date.now() - userThread.lastPostTime) < this.threadRelationWindow) {
      debug(`User ${userId} posted outside thread ${threadId} in channel ${channelId}`);
      await sendMessage(`Hey <@${userId}>, let’s keep this in the thread: <#${threadId}>`, undefined); // Nudge
      return;
    }

    setTimeout(async () => {
      if (state.pendingMessages.has(messageId)) {
        if (respondInThread && !threadId) {
          threadId = await this.createThread(channelId, sendMessage, content);
          state.userThreads.set(userId, { threadId, lastPostTime: Date.now() });
        }
        await sendMessage(content, threadId); // Echo for now
        state.pendingMessages.delete(messageId);
        if (interactiveFollowups && state.isAddressed) this.scheduleFollowUp(channelId, sendMessage, threadId);
      }
    }, baseDelay);
  }

  private async createThread(channelId: string, sendMessage: (text: string, threadId?: string) => Promise<string>, content: string): Promise<string> {
    return await sendMessage(`Starting thread for: ${content}`, undefined); // Thread ID returned
  }

  private scheduleFollowUp(channelId: string, sendMessage: (text: string, threadId?: string) => Promise<string>, threadId?: string): void {
    const state = this.channelStates.get(channelId)!;
    state.silenceTimeout = setTimeout(async () => {
      const timeSinceLast = Date.now() - state.lastMessageTime;
      if (timeSinceLast >= this.silenceThreshold) {
        debug(`Channel ${channelId} silent for ${timeSinceLast}ms—sending follow-up`);
        await sendMessage("Hey, quiet in here! Anything I can help with?", threadId);
      }
    }, this.silenceThreshold);
  }
}
