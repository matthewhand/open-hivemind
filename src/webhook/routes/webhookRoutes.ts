import Debug from 'debug';
import express, { Request, Response } from 'express';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import { Client, TextChannel } from 'discord.js';
import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';

const debug = Debug('app:webhookRoutes');

export function configureWebhookRoutes(app: express.Application, client: Client, DISCORD_CHAT_CHANNEL_ID: string): void {
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

    const channel = client.channels.cache.get(DISCORD_CHAT_CHANNEL_ID) as TextChannel;
    if (channel) {
      let resultMessage: string;

      if (predictionStatus === 'succeeded') {
        const resultText = resultArray.join(' ');
        resultMessage = `${resultText}\nImage URL: ${imageUrl}`;
      } else if (predictionStatus === 'processing') {
        debug('Processing:', predictionId);
        return res.sendStatus(200);
      } else {
        resultMessage = `Prediction ID: ${predictionId}\nStatus: ${predictionStatus}`;
      }

      await channel.send(resultMessage).catch(error => {
        debug('Failed to send message to channel:', error.message);
      });

      predictionImageMap.delete(predictionId);
    } else {
      debug('Channel not found for ID:', DISCORD_CHAT_CHANNEL_ID);
    }

    res.setHeader('Content-Type', 'application/json');
    res.sendStatus(200);
  });
}
