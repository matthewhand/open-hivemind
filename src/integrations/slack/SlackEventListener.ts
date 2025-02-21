import { Request, Response, NextFunction } from 'express';
import { SlackService } from './SlackService';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { extractSlackMetadata } from './slackMetadata';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { SlackMessageHandler } from './SlackMessageHandler';

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
    if (event && event.type === 'message' && !event.bot_id) {
      let metadata = process.env.INCLUDE_SLACK_METADATA === 'true' ? extractSlackMetadata(event) : {};
      const llmProvider = getLlmProvider();
      if (!('generateChatCompletion' in llmProvider)) throw new Error('llmProvider lacks generateChatCompletion');
      const response = await (llmProvider as ILlmProvider).generateChatCompletion(event.text, [], metadata);
      const botInfo = this.slackService['botManager'].getBotByName('Jeeves') || this.slackService['botManager'].getAllBots()[0]; // Access private
      const messageHandler = new SlackMessageHandler(botInfo.webClient);
      await messageHandler.sendMessage(event.channel, response, botInfo.botUserName || 'Jeeves', event.event_ts);
    }
  }
}
