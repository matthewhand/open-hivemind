import Debug from 'debug';
import type { IMessage, IServiceDependencies } from '@hivemind/shared-types';
import DiscordMessage from '../DiscordMessage';
import { type Bot, type DiscordBotManager } from './DiscordBotManager';

const log = Debug('app:discordEventHandler');

/**
 * Simple typing activity tracker - moved from external dependency
 */
class TypingActivity {
  private static instance: TypingActivity;
  private typingUsers = new Map<string, Map<string, number>>();

  static getInstance(): TypingActivity {
    if (!TypingActivity.instance) {
      TypingActivity.instance = new TypingActivity();
    }
    return TypingActivity.instance;
  }

  recordTyping(channelId: string, userId: string): void {
    if (!this.typingUsers.has(channelId)) {
      this.typingUsers.set(channelId, new Map());
    }
    this.typingUsers.get(channelId)!.set(userId, Date.now());
  }

  getLastTypingTime(channelId: string, userId: string): number {
    return this.typingUsers.get(channelId)?.get(userId) || 0;
  }
}

export class DiscordEventHandler {
  private botManager: DiscordBotManager;
  private deps: IServiceDependencies;
  private historyFetcher: (channelId: string) => Promise<IMessage[]>;
  private handlerSet: boolean = false;
  private currentHandler?: (
    message: IMessage,
    historyMessages: IMessage[],
    botConfig: any
  ) => Promise<string>;

  constructor(
    botManager: DiscordBotManager,
    deps: IServiceDependencies,
    historyFetcher: (channelId: string) => Promise<IMessage[]>
  ) {
    this.botManager = botManager;
    this.deps = deps;
    this.historyFetcher = historyFetcher;
  }

  public setMessageHandler(
    handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>
  ): void {
    if (this.handlerSet) {
      return;
    }
    this.handlerSet = true;
    this.currentHandler = handler;

    this.botManager.getAllBots().forEach((bot) => {
      this.attachMessageListeners(bot);
    });
  }

  public setInteractionHandler(): void {
    this.botManager.getAllBots().forEach((bot) => {
      this.attachInteractionListeners(bot);
    });
  }

  public attachListeners(bot: Bot): void {
    if (this.currentHandler) {
      this.attachMessageListeners(bot);
    }
    this.attachInteractionListeners(bot);
  }

  private attachMessageListeners(bot: Bot): void {
    const { messageConfig, webSocketService } = this.deps;

    // Track other users typing (used for pre-typing delay heuristics).
    bot.client.on('typingStart', (typing: any) => {
      try {
        const user = (typing as any)?.user;
        const channel = (typing as any)?.channel;
        const channelId = (typing as any)?.channelId ?? channel?.id;
        if (!channelId || !user) {
          return;
        }
        if (user.bot) {
          return;
        }
        TypingActivity.getInstance().recordTyping(String(channelId), String(user.id));
      } catch {}
    });

    bot.client.on('messageCreate', async (message) => {
      try {
        // Defensive guards for malformed events
        if (!message || !message.author) {
          return;
        }
        if (!message.channelId) {
          return;
        }

        const ignoreBots = Boolean(messageConfig?.get('MESSAGE_IGNORE_BOTS'));
        if (ignoreBots && message.author.bot) {
          return;
        }

        // Emit incoming message flow event
        try {
          webSocketService?.recordMessageFlow({
            botName: bot.botUserName,
            provider: 'discord',
            channelId: message.channelId,
            userId: message.author.id,
            messageType: 'incoming',
            contentLength: (message.content || '').length,
            status: 'success',
          });
        } catch {}

        let repliedMessage: any = null;
        try {
          const refId = (message as any)?.reference?.messageId;
          if (refId && message.channel && (message.channel as any).messages?.fetch) {
            repliedMessage = await (message.channel as any).messages.fetch(refId).catch(() => null);
          }
        } catch {
          repliedMessage = null;
        }

        const wrappedMessage = new DiscordMessage(message, repliedMessage);
        const history = await this.historyFetcher(message.channelId);

        if (this.currentHandler) {
          await this.currentHandler(wrappedMessage, history, bot.config);
        }
      } catch (error) {
        log(`Error in Discord message handler for bot ${bot.botUserName}:`, error);
        return;
      }
    });
  }

  private attachInteractionListeners(bot: Bot): void {
    bot.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isCommand()) {
        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }
      const commandName = interaction.commandName;
      const subcommand = interaction.options.getSubcommand();

      // Handle speckit commands - this would be injected or configured in a full refactor
      if (commandName === 'speckit' && subcommand === 'specify') {
        log(`Speckit specify command received from ${interaction.user.id}`);
        // Note: The actual handler requires external dependencies
        // This should be injected via dependencies in a full implementation
        try {
          await interaction.reply({
            content: 'Speckit specify command - handler not available in decoupled mode',
            ephemeral: true,
          });
        } catch (error) {
          log('Error handling speckit command:', error);
        }
      }
    });
  }
}
