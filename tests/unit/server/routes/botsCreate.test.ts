/**
 * Unit tests for the POST /api/bots route handler.
 *
 * Regression coverage for the llm-integration journey bug: creating a bot
 * whose `llmProvider` referenced a just-created LLM provider *profile key*
 * returned a 500 (Express default HTML error page) because
 * BotManager.createBot wrapped the validation failure in a generic
 * 'configuration' error with no statusCode. The route must:
 *   - return 201 when creation succeeds (e.g. profile key accepted),
 *   - return 400 JSON for validation failures (unknown provider/profile),
 *   - still return 500 for unexpected server-side failures.
 */

import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '@src/middleware/errorHandler';
// Import the router AFTER the mocks are registered.
import botsRouter from '@src/server/routes/bots';

// --- Mock BotManager so the route uses a controllable in-memory manager ---
const getAllBots = jest.fn();
const createBot = jest.fn();

const mockManager = {
  getAllBots,
  createBot,
};

jest.mock('@src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn(async () => mockManager),
  },
}));

// Avoid pulling heavy singletons during router import.
jest.mock('@src/server/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => {
      throw new Error('DI not ready');
    }),
  },
}));

function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/bots', botsRouter);
  app.use(globalErrorHandler);
  return app;
}

/** Build an Error tagged the way botValidation.createValidationError tags it. */
function validationError(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400, code: 'VALIDATION_ERROR' });
}

describe('POST /api/bots', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    getAllBots.mockResolvedValue([]);
    app = createApp();
  });

  it('returns 201 when the bot is created (llmProvider profile key accepted)', async () => {
    createBot.mockResolvedValue({ id: 'bot-1', name: 'Provider Test Bot' });

    const res = await request(app).post('/api/bots').send({
      name: 'Provider Test Bot',
      messageProvider: 'discord',
      llmProvider: 'e2e-openai-12345', // profile key, not a built-in provider type
      persona: 'default',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true });
    expect(createBot).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Provider Test Bot', llmProvider: 'e2e-openai-12345' })
    );
  });

  it('returns 400 JSON (not 500) when creation fails validation', async () => {
    createBot.mockRejectedValue(
      validationError(
        'Unknown LLM provider "bogus-key" — expected one of openai, flowise, openwebui, openswarm or an existing LLM provider profile key'
      )
    );

    const res = await request(app).post('/api/bots').send({
      name: 'Bad Provider Bot',
      messageProvider: 'discord',
      llmProvider: 'bogus-key',
    });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      error: expect.stringContaining('Unknown LLM provider "bogus-key"'),
    });
  });

  it('returns 200 (idempotent no-op) when a bot with the same name exists', async () => {
    getAllBots.mockResolvedValue([{ id: 'bot-1', name: 'Existing Bot' }]);

    const res = await request(app).post('/api/bots').send({
      name: 'Existing Bot',
      messageProvider: 'discord',
    });

    expect(res.status).toBe(200);
    expect(createBot).not.toHaveBeenCalled();
  });

  it('lets unexpected errors (no 4xx statusCode) bubble to the error handler', async () => {
    createBot.mockRejectedValue(new Error('disk on fire'));

    const res = await request(app).post('/api/bots').send({
      name: 'Doomed Bot',
      messageProvider: 'discord',
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toMatchObject({ success: false });
  });
});
