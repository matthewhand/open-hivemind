import { Request, Response, NextFunction } from 'express';
import { SlackService } from './SlackService';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { extractSlackMetadata } from './slackMetadata';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';

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
      let metadata = {};
      if (process.env.INCLUDE_SLACK_METADATA === 'true') {
        metadata = extractSlackMetadata(event);
      }
      const llmProvider = getLlmProvider();
        // For simplicity, pass an empty history array.
        if (!('generateChatCompletion' in llmProvider)) {
          throw new Error('llmProvider does not implement generateChatCompletion');
        }
        const response = await (llmProvider as ILlmProvider).generateChatCompletion(event.text, [], metadata);
        await this.slackService.sendMessage(event.channel, response);
    }
  }
}
