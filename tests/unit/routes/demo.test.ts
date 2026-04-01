import express from 'express';
import request from 'supertest';
import router from '../../../src/server/routes/demo';

const mockDemoService = {
  getDemoStatus: jest.fn(),
  getDemoBots: jest.fn(),
  isInDemoMode: jest.fn(),
  addMessage: jest.fn(),
  generateDemoResponse: jest.fn(),
  getAllConversations: jest.fn(),
  getConversationHistory: jest.fn(),
  reset: jest.fn(),
};

jest.mock('tsyringe', () => ({
  container: {
    resolve: () => mockDemoService,
  },
}));

jest.mock('../../../src/types/errors', () => ({
  ErrorUtils: {
    toHivemindError: (e: unknown) => {
      const err = e instanceof Error ? e : new Error(String(e));
      return Object.assign(err, { statusCode: 500 });
    },
    getStatusCode: (e: any) => (e && typeof e === 'object' && 'statusCode' in e ? e.statusCode : undefined),
    getMessage: (e: any) => (e instanceof Error ? e.message : String(e)),
  },
}));

jest.mock('../../../src/services/DemoModeService', () => ({}));

describe('Demo Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/demo', router);
    jest.clearAllMocks();
  });

  describe('GET /demo/status', () => {
    it('should return demo status when in demo mode', async () => {
      mockDemoService.getDemoStatus.mockReturnValue({ isDemoMode: true });

      const res = await request(app).get('/demo/status');
      expect(res.status).toBe(200);
      expect(res.body.data.isDemoMode).toBe(true);
      expect(res.body.data.message).toContain('demo mode');
    });

    it('should return production status', async () => {
      mockDemoService.getDemoStatus.mockReturnValue({ isDemoMode: false });

      const res = await request(app).get('/demo/status');
      expect(res.status).toBe(200);
      expect(res.body.data.isDemoMode).toBe(false);
      expect(res.body.data.message).toContain('production mode');
    });

    it('should handle errors', async () => {
      mockDemoService.getDemoStatus.mockImplementation(() => {
        throw new Error('Service error');
      });

      const res = await request(app).get('/demo/status');
      expect(res.status).toBe(500);
      expect(res.body.code).toBe('DEMO_STATUS_ERROR');
    });
  });

  describe('GET /demo/bots', () => {
    it('should return demo bots', async () => {
      mockDemoService.getDemoBots.mockReturnValue([{ name: 'TestBot' }]);
      mockDemoService.isInDemoMode.mockReturnValue(true);

      const res = await request(app).get('/demo/bots');
      expect(res.status).toBe(200);
      expect(res.body.data.bots).toHaveLength(1);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.isDemo).toBe(true);
    });
  });

  describe('POST /demo/chat', () => {
    it('should return 400 when message is missing', async () => {
      const res = await request(app).post('/demo/chat').send({ botName: 'Bot' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['message']) }),
        ])
      );
    });

    it('should return 400 when botName is missing', async () => {
      const res = await request(app).post('/demo/chat').send({ message: 'hi' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['botName']) }),
        ])
      );
    });

    it('should return 400 when demo mode is inactive', async () => {
      mockDemoService.isInDemoMode.mockReturnValue(false);

      const res = await request(app).post('/demo/chat').send({ message: 'hello', botName: 'Bot' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DEMO_MODE_INACTIVE');
    });

    it('should return chat response in demo mode', async () => {
      mockDemoService.isInDemoMode.mockReturnValue(true);
      mockDemoService.addMessage.mockReturnValueOnce({ id: '1', text: 'hello' });
      mockDemoService.generateDemoResponse.mockReturnValue('Hello back!');
      mockDemoService.addMessage.mockReturnValueOnce({ id: '2', text: 'Hello back!' });

      const res = await request(app)
        .post('/demo/chat')
        .send({ message: 'hello', botName: 'TestBot' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userMessage).toEqual(expect.any(Object));
      expect(typeof res.body.data.userMessage.text).toBe('string');
      expect(res.body.data.botResponse).toEqual(expect.any(Object));
      expect(typeof res.body.data.botResponse.text).toBe('string');
      expect(res.body.data.isDemo).toBe(true);
    });
  });

  describe('GET /demo/conversations', () => {
    it('should return all conversations', async () => {
      mockDemoService.getAllConversations.mockReturnValue([{ id: 'c1' }]);

      const res = await request(app).get('/demo/conversations');
      expect(res.status).toBe(200);
      expect(res.body.data.conversations).toHaveLength(1);
      expect(res.body.data.count).toBe(1);
    });
  });

  describe('GET /demo/conversations/:channelId/:botName', () => {
    it('should return conversation history', async () => {
      mockDemoService.getConversationHistory.mockReturnValue([{ text: 'hi' }]);

      const res = await request(app).get('/demo/conversations/ch1/Bot1');
      expect(res.status).toBe(200);
      expect(res.body.data.channelId).toBe('ch1');
      expect(res.body.data.botName).toBe('Bot1');
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.count).toBe(1);
    });
  });

  describe('POST /demo/reset', () => {
    it('should reset demo mode', async () => {
      const res = await request(app).post('/demo/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDemoService.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /demo/info', () => {
    it('should return static demo info', async () => {
      const res = await request(app).get('/demo/info');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Open-Hivemind Demo Mode');
      expect(res.body.data.features).toBeInstanceOf(Array);
      expect(res.body.data.limitations).toBeInstanceOf(Array);
    });
  });
});
