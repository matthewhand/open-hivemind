const schedulerDebug = require('debug')('app:MessageDelayScheduler');
const { getRandomDelay } = require('@src/common/getRandomDelay');
const schedulerMsgConfig = require('@message/interfaces/messageConfig');

// Debug to inspect config
schedulerDebug('Loaded schedulerMsgConfig:', schedulerMsgConfig);

interface ChannelState {
  lastMessageTime: number;
  isAddressed: boolean;
  pendingMessages: Map<string, string>;
  silenceTimeout?: NodeJS.Timeout;
  userThreads: Map<string, { threadId: string; lastPostTime: number }>;
}

class MessageDelayScheduler {
  private static instance: MessageDelayScheduler | undefined;
  private channelStates: Map<string, ChannelState> = new Map();
  private readonly silenceThreshold: number = (typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW') : undefined) || 300000;
  private readonly threadRelationWindow: number = (typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_THREAD_RELATION_WINDOW') : undefined) || 300000;
  private readonly minDelay: number = (typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_MIN_DELAY') : undefined) || 1000;
  private readonly maxDelay: number = (typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_MAX_DELAY') : undefined) || 10000;

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
      silenceTimeout: undefined,
      userThreads: new Map()
    };
    this.channelStates.set(channelId, state);

    state.pendingMessages.set(messageId, content);
    state.lastMessageTime = Date.now();
    if (state.silenceTimeout) clearTimeout(state.silenceTimeout);

    const onlyWhenSpokenTo = typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO') : true;
    const interactiveFollowups = typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_INTERACTIVE_FOLLOWUPS') : false;
    const unsolicitedAddressed = typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_UNSOLICITED_ADDRESSED') : false;
    const unsolicitedUnaddressed = typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_UNSOLICITED_UNADDRESSED') : false;
    const respondInThread = typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_RESPOND_IN_THREAD') : false;

    const isCommand = (typeof schedulerMsgConfig.get === 'function' ? schedulerMsgConfig.get('MESSAGE_WAKEWORDS')?.split(',').some((w: string) => content.startsWith(w)) : false) || isDirectlyAddressed;
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
      schedulerDebug(`User ${userId} posted outside thread ${threadId} in channel ${channelId}`);
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
        schedulerDebug(`Channel ${channelId} silent for ${timeSinceLast}ms—sending follow-up`);
        await sendMessage("Hey, quiet in here! Anything I can help with?", threadId);
      }
    }, this.silenceThreshold);
  }
}

module.exports = { MessageDelayScheduler };
