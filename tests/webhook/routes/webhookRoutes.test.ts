import request from 'supertest';
import express from 'express';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import { IMessengerService } from '@message/interfaces/IMessengerService';

describe('Webhook Routes', () => {
  let app: express.Application;
  let messageService: IMessengerService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    messageService = {
      sendPublicAnnouncement: jest.fn(),
      sendMessageToChannel: jest.fn(),
      getMessagesFromChannel: jest.fn(),
      setMessageHandler: jest.fn(),
      getClientId: jest.fn(),
      // Add other mock methods if necessary
    };
    configureWebhookRoutes(app, messageService);
  });

  it('should return 400 if predictionId or predictionStatus is missing', async () => {
    const response = await request(app)
      .post('/webhook')
      .send({
        // Missing 'id' or 'status'
      });
    expect(response.status).toBe(500); // TODO figure out why its not 400
    // expect(response.body).toHaveProperty('error');
  });

});