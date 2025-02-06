import { Request, Response } from 'express';
import Debug from 'debug';
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
        // Insert your event processing logic here.
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
