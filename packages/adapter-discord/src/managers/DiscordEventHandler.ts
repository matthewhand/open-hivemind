import Debug from 'debug';
import messageConfig from '@config/messageConfig';
import TypingActivity from '@message/helpers/processing/TypingActivity';
import type { IMessage } from '@message/interfaces/IMessage';
import WebSocketService from '../../../../src/server/services/WebSocketService';
import DiscordMessage from '../DiscordMessage';
import { handleSpeckitSpecify } from '../handlers/speckit/specifyHandler';
import { type Bot, type DiscordBotManager } from './DiscordBotManager';

export class DiscordEventHandler {
  private botManager: DiscordBotManager;
  private historyFetcher: (channelId: string) => Promise<IMessage[]>;
  private handlerSet: boolean = false;
  private currentHandler?: (
    message: IMessage,
    historyMessages: IMessage[],
    botConfig: any
  ) => Promise<string>;

  constructor(
    botManager: DiscordBotManager,
    historyFetcher: (channelId: string) => Promise<IMessage[]>
  ) {
    this.botManager = botManager;
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
    // Interactions are usually set globally or on init?
    // DiscordService called setInteractionHandler explicitly.
    // If we add a bot late, we should probably attach interaction listeners too?
    // The original code didn't seem to attach interaction listeners in `addBot` explicitly,
    // only message listeners (implied by `if (this.currentHandler)` block).
    // But `setInteractionHandler` logic was static in `initialize`.
    // Let's stick to attaching message listeners if handler is present.
    // Ideally we should attach interaction listeners too.
    this.attachInteractionListeners(bot);
  }

  private attachMessageListeners(bot: Bot): void {
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

        const ignoreBots = Boolean(messageConfig.get('MESSAGE_IGNORE_BOTS'));
        if (ignoreBots && message.author.bot) {
          return;
        }

        // Emit incoming message flow event
        try {
          WebSocketService.getInstance().recordMessageFlow({
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
        console.error(`Error in Discord message handler for bot ${bot.botUserName}:`, error);
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

      if (commandName === 'speckit' && subcommand === 'specify') {
        await handleSpeckitSpecify(interaction);
      }
    });
  }
}
