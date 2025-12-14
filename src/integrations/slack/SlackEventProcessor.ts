import { Request, Response } from 'express';
import Debug from 'debug';
import slackConfig from '@src/config/slackConfig';
import { SlackService } from './SlackService';
import SlackMessage from './SlackMessage';
import { KnownBlock } from '@slack/web-api';
import { ConfigurationError } from '@src/types/errorClasses';
import { ErrorUtils } from '@src/types/errors';

const debug = Debug('app:SlackEventProcessor');

export class SlackEventProcessor {
  private slackService: SlackService;
  private lastEventTs: string | null = null;
  private deletedMessages: Set<string> = new Set();

  constructor(slackService: SlackService) {
    if (!slackService) {
      debug('Error: SlackService instance required');
      throw new ConfigurationError(
        'SlackService instance required',
        'SLACK_SERVICE_REQUIRED'
      );
    }
    this.slackService = slackService;
    debug('SlackEventProcessor initialized');
  }

  public async handleActionRequest(req: Request, res: Response): Promise<void> {
    debug('Entering handleActionRequest', { method: req.method, body: req.body ? JSON.stringify(req.body).substring(0, 100) + '...' : 'empty' });
    try {
      let body = req.body || {};
      if (typeof body === 'string') body = JSON.parse(body);
      debug(`Parsed body: type=${body.type}, event=${body.event ? JSON.stringify(body.event).substring(0, 50) + '...' : 'none'}`);

      if (body.type === 'url_verification' && body.challenge) {
        debug(`URL verification request, challenge: ${body.challenge}`);
        res.set('Content-Type', 'text/plain');
        res.status(200).send(body.challenge);
        return;
      }

      if (body.payload) {
        const payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body.payload;
        debug(`Payload received: ${JSON.stringify(payload).substring(0, 100)}...`);
        if (!payload || !payload.actions || !Array.isArray(payload.actions) || payload.actions.length === 0) {
          debug('Invalid payload: missing or malformed actions');
          res.status(400).send('Bad Request');
          return;
        }

        // Get the first available bot manager for handling interactive actions
        const botManagers = this.slackService.getBotManager();
        if (botManagers) {
          const bots = botManagers.getAllBots();
          if (bots.length > 0) {
            const botConfig = bots[0].config;
            await botManagers.handleMessage(
              new SlackMessage(payload.text || '', payload.channel?.id || '', payload),
              [],
              botConfig
            );
          }
        }
        res.status(200).send();
        return;
      }

      if (body.type === 'event_callback') {
        const event = body.event;
        debug(`Event callback: type=${event.type}, subtype=${event.subtype || 'none'}, ts=${event.event_ts}`);

        if (event.subtype === 'bot_message') {
          debug('Ignoring bot_message event');
          res.status(200).send();
          return;
        }
        if (event.subtype === 'message_deleted' && event.previous_message?.ts) {
          this.deletedMessages.add(event.previous_message.ts);
          debug(`Marked message as deleted: ts=${event.previous_message.ts}, total deleted=${this.deletedMessages.size}`);
          res.status(200).send();
          return;
        }
        if (event.event_ts && this.lastEventTs === event.event_ts) {
          debug(`Duplicate event detected: event_ts=${event.event_ts}, lastEventTs=${this.lastEventTs}`);
          res.status(200).send();
          return;
        }

        this.lastEventTs = event.event_ts;
        debug(`Updated lastEventTs: ${this.lastEventTs}`);

        if (event.type === 'message' && !event.subtype) {
          debug(`Processing message event: text="${event.text}", channel=${event.channel}`);

          // Route message to appropriate bot manager
          const botManager = this.slackService.getBotManager();
          if (botManager) {
            const bots = botManager.getAllBots();
            for (const botInfo of bots) {
              await botManager.handleMessage(
                new SlackMessage(event.text || '', event.channel, event),
                [],
                botInfo.config
              );
            }
          }
        }
        res.status(200).send();
        return;
      }

      debug('Unhandled request type');
      res.status(400).send('Bad Request');
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Error handling action request:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity
      });
      res.status(400).send('Bad Request');
    }
  }

  public async handleHelpRequest(req: Request, res: Response): Promise<void> {
    debug('Entering handleHelpRequest', { token: req.body.token ? 'provided' : 'missing', user_id: req.body.user_id });
    const token = req.body.token;
    const expectedToken = slackConfig.get<any>('SLACK_HELP_COMMAND_TOKEN') as string;

    if (!token || token !== expectedToken) {
      debug(`Unauthorized request: received token=${token}, expected=${expectedToken ? 'set' : 'unset'}`);
      res.status(401).send('Unauthorized');
      return;
    }

    const userId = req.body.user_id;
    if (!userId) {
      debug('Error: Missing user_id in request body');
      res.status(400).send('Missing user ID');
      return;
    }

    // Acknowledge the command immediately
    res.status(200).send();

    // Send DM asynchronously
    setImmediate(async () => {
      try {
        const channels = slackConfig.get('SLACK_JOIN_CHANNELS') || 'None';
        const mode = slackConfig.get('SLACK_MODE') || 'None';
        const defaultChannel = slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || 'None';
        const helpText = `*Hi <@${userId}>, here’s my configuration:*\n- *Channels joined:* ${channels}\n- *Mode:* ${mode}\n- *Default Channel:* ${defaultChannel}\n\nHow can I assist you?`;

        const helpBlocks: KnownBlock[] = [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: helpText }
          },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: 'Learning Objectives' }, action_id: `learn_objectives_${userId}`, value: 'learn_objectives' },
              { type: 'button', text: { type: 'plain_text', text: 'How-To' }, action_id: `how_to_${userId}`, value: 'how_to' },
              { type: 'button', text: { type: 'plain_text', text: 'Contact Support' }, action_id: `contact_support_${userId}`, value: 'contact_support' },
              { type: 'button', text: { type: 'plain_text', text: 'Report Issue' }, action_id: `report_issue_${userId}`, value: 'report_issue' }
            ]
          }
        ];

        const botManager = this.slackService.getBotManager();
        if (botManager) {
          const bots = botManager.getAllBots();
          if (bots.length > 0) {
            const botInfo = bots[0];
            await botInfo.webClient.chat.postMessage({
              channel: userId,
              text: helpText,
              blocks: helpBlocks,
              username: 'Bot',
              icon_emoji: ':robot_face:'
            });
            debug(`Sent DM help message with buttons to user ${userId}`);
          }
        }
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as any;
        const errorInfo = ErrorUtils.classifyError(hivemindError);
        debug(`Error sending help DM to user ${userId}:`, {
          error: hivemindError.message,
          errorCode: hivemindError.code,
          errorType: errorInfo.type,
          severity: errorInfo.severity,
          userId
        });
      }
    });
  }

  public async debugEventPermissions(): Promise<void> {
    debug('Entering debugEventPermissions');
    const botManager = this.slackService.getBotManager();
    if (!botManager) {
      debug('No bot manager available');
      return;
    }

    const bots = botManager.getAllBots();
    debug(`Checking permissions for ${bots.length} bots`);

    for (const botInfo of bots) {
      const botId = botInfo.botUserId || botInfo.botToken.substring(0, 8);
      try {
        const authTest = await botInfo.webClient.auth.test();
        debug(`Bot ${botId} auth test: ${JSON.stringify(authTest)}`);
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as any;
        const errorInfo = ErrorUtils.classifyError(hivemindError);
        debug(`Error running auth test for bot ${botId}:`, {
          error: hivemindError.message,
          errorCode: hivemindError.code,
          errorType: errorInfo.type,
          severity: errorInfo.severity,
          botId
        });
      }
      try {
        const channelsResponse = await botInfo.webClient.conversations.list({ types: 'public_channel,private_channel' });
        if (channelsResponse.ok) {
          debug(`Bot ${botId} channel list retrieved; total channels: ${channelsResponse.channels?.length || 0}`);
        } else {
          debug(`Bot ${botId} failed to retrieve channels list: ${channelsResponse.error}`);
        }
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as any;
        const errorInfo = ErrorUtils.classifyError(hivemindError);
        debug(`Error retrieving channels for bot ${botId}:`, {
          error: hivemindError.message,
          errorCode: hivemindError.code,
          errorType: errorInfo.type,
          severity: errorInfo.severity,
          botId
        });
      }
    }
  }

  public hasDeletedMessage(ts: string): boolean {
    const isDeleted = this.deletedMessages.has(ts);
    debug(`Checking if message is deleted: ts=${ts}, isDeleted=${isDeleted}`);
    return isDeleted;
  }
}
