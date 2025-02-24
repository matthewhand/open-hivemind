import { Request, Response, NextFunction } from 'express';
import { SlackService } from './SlackService';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { extractSlackMetadata } from './slackMetadata';

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
      const metadata = process.env.INCLUDE_SLACK_METADATA === 'true' ? extractSlackMetadata(event) : {};
      const llmProvider = getLlmProvider();
      if (!llmProvider.length) throw new Error('No LLM providers available');
      const response = await llmProvider[0].generateChatCompletion(event.text, [], metadata);
      await this.slackService.sendMessageToChannel(event.channel, response, 'Jeeves', event.event_ts);
    }
  }
}
