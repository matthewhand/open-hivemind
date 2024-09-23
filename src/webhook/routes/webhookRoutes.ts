import Debug from 'debug';
import express, { Request, Response } from 'express';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';
import { IMessengerService } from '@message/interfaces/IMessengerService';

const debug = Debug('app:webhookRoutes');

export function configureWebhookRoutes(app: express.Application, messageService: IMessengerService): void {
  app.post('/webhook', verifyWebhookToken, verifyIpWhitelist, async (req: Request, res: Response) => {
    debug('Received webhook:', JSON.stringify(req.body));

    const predictionId = req.body.id;
    const predictionStatus = req.body.status;
    const resultArray = req.body.output;
    const imageUrl = predictionImageMap.get(predictionId);

    if (!predictionId || !predictionStatus) {
      debug('Missing predictionId or predictionStatus:', { predictionId, predictionStatus });
      return res.status(400).send({ error: 'Missing predictionId or predictionStatus' });
    }

    debug('Image URL:', imageUrl);

    // Use the message service to send platform-agnostic messages
    const resultMessage = predictionStatus === 'succeeded'
      ? `${resultArray.join(' ')}\nImage URL: ${imageUrl}`
      : `Prediction ID: ${predictionId}\nStatus: ${predictionStatus}`;

    try {
      await messageService.sendPublicAnnouncement('', resultMessage);  // Use empty channel for now
    } catch (error: any) {
      debug('Failed to send message:', error.message);
    }

    predictionImageMap.delete(predictionId);
    res.setHeader('Content-Type', 'application/json');
    res.sendStatus(200);
  });
}
