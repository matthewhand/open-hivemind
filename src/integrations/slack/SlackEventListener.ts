import { Request, Response, NextFunction } from 'express';
import { SlackService } from './SlackService';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { extractSlackMetadata } from './slackMetadata';
import Debug from 'debug';

const debug = Debug('app:SlackEventListener');

export class SlackEventListener {
  private slackService: SlackService;
  private req: Request;
  private res: Response;
  private next: NextFunction;

  constructor(req: Request, res: Response, next: NextFunction) {
    this.slackService = SlackService.getInstance();
    this.req = req;
    this.res = res;
    this.next = next;
  }

  public async handleEvent(event: any) {
    try {
      if (event && event.type === 'message' && !event.bot_id) {
        const metadata = process.env.INCLUDE_SLACK_METADATA === 'true' ? extractSlackMetadata(event) : {};
        const llmProvider = getLlmProvider();
        if (!llmProvider.length) throw new Error('No LLM providers available');
        const response = await llmProvider[0].generateChatCompletion(event.text, [], metadata);
        await this.slackService.sendMessageToChannel(event.channel, response, 'Jeeves', event.event_ts);
        debug(`Processed message event in channel ${event.channel} with response: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
      } else if (event.type === 'bot_joined_channel') {
        debug(`Bot joined channel ${event.channel}, sending welcome message`);
        await this.slackService.getWelcomeHandler().sendBotWelcomeMessage(event.channel);
      } else if (event.type === 'member_joined_channel') {
        debug(`User ${event.user} joined channel ${event.channel}, sending welcome message`);
        const userInfo = await this.slackService.getBotManager().getAllBots()[0].webClient.users.info({ user: event.user });
        const userName = userInfo.user?.name || 'New User';
        await this.slackService.getWelcomeHandler().sendUserWelcomeMessage(event.channel, userName);
      }
    } catch (error) {
      debug(`Error handling event: ${error}`);
      throw error;
    }
  }
}
