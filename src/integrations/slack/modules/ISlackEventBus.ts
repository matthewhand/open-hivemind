import express, { Application, Request, Response, NextFunction } from 'express';
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

    // Capture raw body for signature verification (Slack requires exact raw payload)
    const urlencodedWithRaw = (express as any).urlencoded({
      extended: true,
      verify: (req: any, _res: Response, buf: Buffer) => {
        req.rawBody = buf.toString('utf8');
      }
    });
    (express as any).json({
      verify: (req: any, _res: Response, buf: Buffer) => {
        req.rawBody = buf.toString('utf8');
      }
    });

    app.post(
      `${basePath}/action-endpoint`,
      urlencodedWithRaw,
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
      urlencodedWithRaw,
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
