import { Application, Request, Response, NextFunction } from 'express';
import Debug from 'debug';
import { SlackSignatureVerifier } from '../SlackSignatureVerifier';
import { SlackEventProcessor } from '../SlackEventProcessor';
import { SlackInteractiveHandler } from '../SlackInteractiveHandler';

const debug = Debug('app:SlackEventBus');

export interface ISlackEventBus {
  registerBotRoutes(
    app: Application,
    botName: string,
    signatureVerifier: SlackSignatureVerifier,
    eventProcessor: SlackEventProcessor,
    interactiveHandler: SlackInteractiveHandler
  ): void;
}

export class SlackEventBus implements ISlackEventBus {
  registerBotRoutes(
    app: Application,
    botName: string,
    signatureVerifier: SlackSignatureVerifier,
    eventProcessor: SlackEventProcessor,
    interactiveHandler: SlackInteractiveHandler
  ): void {
    debug('registerBotRoutes()', { botName });
    const basePath = `/slack/${botName}`;

    app.post(
      `${basePath}/action-endpoint`,
      (req: Request, res: Response, next: NextFunction) => {
        try {
          if (!signatureVerifier) {
            res.status(500).send('Bot configuration error');
            return;
          }
          signatureVerifier.verify(req, res, next);
        } catch (error) {
          debug(`Signature verification failed for ${botName}: ${error}`);
          res.status(400).send('Invalid request signature');
        }
      },
      (req: Request, res: Response) => {
        if (eventProcessor) {
          eventProcessor.handleActionRequest(req, res);
        } else {
          res.status(500).send('Bot not found');
        }
      }
    );

    app.post(
      `${basePath}/interactive-endpoint`,
      (req: Request, res: Response, next: NextFunction) => {
        try {
          if (!signatureVerifier) {
            res.status(500).send('Bot configuration error');
            return;
          }
          signatureVerifier.verify(req, res, next);
        } catch (error) {
          debug(`Signature verification failed for ${botName}: ${error}`);
          res.status(400).send('Invalid request signature');
        }
      },
      (req: Request, res: Response) => {
        if (interactiveHandler) {
          interactiveHandler.handleRequest(req, res);
        } else {
          res.status(500).send('Bot not found');
        }
      }
    );

    app.post(`${basePath}/help`, (req: Request, res: Response) => {
      if (eventProcessor) {
        eventProcessor.handleHelpRequest(req, res);
      } else {
        res.status(500).send('Bot not found');
      }
    });
  }
}