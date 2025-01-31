import { Request, Response, NextFunction } from 'express';
import { SlackService } from './SlackService';

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
      await this.slackService.sendMessage(event.channel, `You said: ${event.text}`);
    }
  }
}
