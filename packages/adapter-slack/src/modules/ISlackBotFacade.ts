import Debug from 'debug';
import type { SlackBotManager } from '../SlackBotManager';
import type { SlackWelcomeHandler } from '../SlackWelcomeHandler';

const debug = Debug('app:SlackBotFacade');

export interface ISlackBotFacade {
  initialize(botName: string, botManager: SlackBotManager): Promise<void>;
  joinConfiguredChannels(botName: string, botManager: SlackBotManager, welcomeHandler?: SlackWelcomeHandler): Promise<void>;
  getFirstBotInfo(botManager: SlackBotManager): any | undefined;
  getAllBots(botManager: SlackBotManager): any[];
}

/**
 * SlackBotFacade centralizes per-bot lifecycle and botInfo access so SlackService can delegate.
 */
export class SlackBotFacade implements ISlackBotFacade {
  async initialize(botName: string, botManager: SlackBotManager): Promise<void> {
    debug('initialize()', { botName });
    await botManager.initialize();
  }

  async joinConfiguredChannels(
    botName: string,
    botManager: SlackBotManager,
    welcomeHandler?: SlackWelcomeHandler,
  ): Promise<void> {
    debug('joinConfiguredChannels()', { botName });
    const bots = botManager.getAllBots();
    for (const botInfo of bots) {
      debug(`Joining channels for bot: ${botInfo.botUserName || botInfo.botToken?.substring(0, 8)}`);
      if (welcomeHandler) {
        await welcomeHandler.joinConfiguredChannelsForBot(botInfo);
      }
    }
  }

  getFirstBotInfo(botManager: SlackBotManager): any | undefined {
    const bots = botManager.getAllBots();
    return bots[0];
  }

  getAllBots(botManager: SlackBotManager): any[] {
    return botManager.getAllBots();
  }
}