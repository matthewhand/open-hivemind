import express from 'express';
import request from 'supertest';

// Mock dependencies before importing the router
jest.mock('../../../src/config/llmProfiles', () => ({
  getLlmProfileByKey: jest.fn(),
}));

jest.mock('../../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(() => ({
      getGeneralSettings: jest.fn(() => ({
        webuiIntelligenceProvider: 'test-provider',
      })),
    })),
  },
}));

jest.mock('../../../src/integrations/flowise/flowiseProvider', () => ({
  FlowiseProvider: jest.fn(),
}));

jest.mock('../../../src/integrations/openwebui/runInference', () => ({
  generateChatCompletion: jest.fn(),
}));

jest.mock('../../../src/types/errors', () => ({
  ErrorUtils: {
    toHivemindError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  },
}));

jest.mock('../../../src/message/interfaces/IMessage', () => {
  return {
    IMessage: class {
      content: string;
      role: string;
      constructor(_raw: any, role: string) {
        this.role = role;
        this.content = '';
      }
    },
  };
});

import { getLlmProfileByKey } from '../../../src/config/llmProfiles';
import { UserConfigStore } from '../../../src/config/UserConfigStore';
import router from '../../../src/server/routes/ai-assist';

describe('AI Assist Route - POST /generate', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', router);
    jest.clearAllMocks();

    // Default: provider configured
    (UserConfigStore.getInstance as jest.Mock).mockReturnValue({
      getGeneralSettings: () => ({ webuiIntelligenceProvider: 'test-provider' }),
    });
  });

  it('should return 400 when prompt is missing', async () => {
    const res = await request(app).post('/generate').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('required') })])
    );
  });

  it('should return 400 when prompt exceeds max length', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'x'.repeat(33000) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('Prompt exceeds maximum length') })])
    );
  });

  it('should return 400 when system prompt exceeds max length', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hello', systemPrompt: 'x'.repeat(17000) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('System prompt exceeds maximum length') })])
    );
  });

  it('should return 400 when provider is not configured', async () => {
    (UserConfigStore.getInstance as jest.Mock).mockReturnValue({
      getGeneralSettings: () => ({ webuiIntelligenceProvider: 'none' }),
    });

    const res = await request(app).post('/generate').send({ prompt: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('AI Assistance is not configured.');
  });

  it('should return 404 when provider profile is not found', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue(null);

    const res = await request(app).post('/generate').send({ prompt: 'hello' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('provider profile not found');
  });

  it('should return 400 for unsupported provider type', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue({
      name: 'test',
      provider: 'unknown-provider',
      config: {},
    });

    const res = await request(app).post('/generate').send({ prompt: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Unsupported provider type');
  });

  it('should return result for openwebui provider', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue({
      name: 'test',
      provider: 'openwebui',
      config: {},
    });

    const { generateChatCompletion } = require('../../../src/integrations/openwebui/runInference');
    (generateChatCompletion as jest.Mock).mockResolvedValue({ text: 'AI response' });

    const res = await request(app).post('/generate').send({ prompt: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('AI response');
  });

  it('should handle provider initialization errors', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue({
      name: 'test',
      provider: 'openai',
      config: {},
    });

    const res = await request(app).post('/generate').send({ prompt: 'hello' });
    // openai require will fail in test env, resulting in 500
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to generate response');
  });
});
