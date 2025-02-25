import { Request, Response } from 'express';
import Debug from 'debug';
import { SlackService } from './SlackService';

const debug = Debug('app:SlackEventProcessor');

export class SlackEventProcessor {
  private lastEventTs: string | null = null;

  public async process(req: Request, res: Response): Promise<void> {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      if (body.type === 'event_callback') {
        const event = body.event;
        if (event.subtype === 'bot_message') {
          debug('Ignoring bot message.');
          res.status(200).send();
          return;
        }
        if (event.event_ts && this.lastEventTs === event.event_ts) {
          debug(`Duplicate event detected (event_ts: ${event.event_ts}). Ignoring.`);
          res.status(200).send();
          return;
        }

        // Handle bot and user join events for welcome messages
        const slackService = SlackService.getInstance();
        if (event.type === 'bot_joined_channel') {
          debug(`Bot joined channel ${event.channel}, sending welcome message`);
          await slackService.sendBotWelcomeMessage(event.channel);
        } else if (event.type === 'member_joined_channel') {
          debug(`User ${event.user} joined channel ${event.channel}, sending welcome message`);
          const userInfo = await slackService.getBotManager().getAllBots()[0].webClient.users.info({ user: event.user });
          const userName = userInfo.user?.name || 'New User';
          await slackService.sendUserWelcomeMessage(event.channel, userName);
        }

        debug(`Processing event: ${JSON.stringify(event)}`);
        this.lastEventTs = event.event_ts;
      }
      res.status(200).send();
    } catch (error) {
      debug(`Error processing event: ${error}`);
      res.status(400).send('Bad Request');
    }
  }
}
