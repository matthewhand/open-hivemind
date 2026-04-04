import express from 'express';
import request from 'supertest';
import { getLlmProfileByKey } from '../../../src/config/llmProfiles';
import { UserConfigStore } from '../../../src/config/UserConfigStore';
import router from '../../../src/server/routes/ai-assist';

const mockLoadPlugin = jest.fn();
const mockInstantiateLlmProvider = jest.fn();

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

jest.mock('../../../src/plugins/PluginLoader', () => ({
  loadPlugin: (...args: any[]) => mockLoadPlugin(...args),
  instantiateLlmProvider: (...args: any[]) => mockInstantiateLlmProvider(...args),
}));

jest.mock('../../../src/types/errors', () => ({
  ErrorUtils: {
    toHivemindError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  },
}));

describe('AI Assist Route - POST /generate', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', router);
    jest.clearAllMocks();

    (UserConfigStore.getInstance as jest.Mock).mockReturnValue({
      getGeneralSettings: () => ({ webuiIntelligenceProvider: 'test-provider' }),
    });

    mockLoadPlugin.mockResolvedValue({ plugin: 'ok' });
    mockInstantiateLlmProvider.mockReturnValue({
      supportsChatCompletion: () => true,
      supportsCompletion: () => false,
      generateChatCompletion: jest.fn().mockResolvedValue('AI response'),
      generateCompletion: jest.fn(),
    });
  });

  it('returns 400 validation envelope when required message field is missing', async () => {
    const res = await request(app).post('/generate').send({ botName: 'test-bot' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when prompt exceeds max length', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ message: 'x'.repeat(33000), botName: 'test-bot' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false });
  });

  it('returns 400 when provider is not configured', async () => {
    (UserConfigStore.getInstance as jest.Mock).mockReturnValue({
      getGeneralSettings: () => ({ webuiIntelligenceProvider: 'none' }),
    });

    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hello', message: 'hello', botName: 'test-bot' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('AI Assistance is not configured.');
  });

  it('returns 404 when provider profile is not found', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue(null);

    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hello', message: 'hello', botName: 'test-bot' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('provider profile not found');
  });

  it('returns success envelope for chat-capable provider', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue({
      name: 'test',
      provider: 'openai',
      config: {},
    });

    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hello', message: 'hello', botName: 'test-bot' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { result: 'AI response' } });
    expect(mockLoadPlugin).toHaveBeenCalledWith('llm-openai');
  });

  it('falls back to completion-only provider path', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue({
      name: 'test',
      provider: 'openai',
      config: {},
    });

    const completionMock = jest.fn().mockResolvedValue('completion response');
    mockInstantiateLlmProvider.mockReturnValue({
      supportsChatCompletion: () => false,
      supportsCompletion: () => true,
      generateChatCompletion: jest.fn(),
      generateCompletion: completionMock,
    });

    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hello', systemPrompt: 'sys', message: 'hello', botName: 'test-bot' });

    expect(res.status).toBe(200);
    expect(res.body.data.result).toBe('completion response');
    expect(completionMock).toHaveBeenCalledWith('hello');
  });

  it('returns 400 when provider supports no generation modes', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue({
      name: 'test',
      provider: 'openai',
      config: {},
    });

    mockInstantiateLlmProvider.mockReturnValue({
      supportsChatCompletion: () => false,
      supportsCompletion: () => false,
      generateChatCompletion: jest.fn(),
      generateCompletion: jest.fn(),
    });

    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hello', message: 'hello', botName: 'test-bot' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Provider does not support generation.');
  });

  it('returns 500 when plugin initialization fails', async () => {
    (getLlmProfileByKey as jest.Mock).mockReturnValue({
      name: 'test',
      provider: 'openai',
      config: {},
    });

    mockLoadPlugin.mockRejectedValue(new Error('plugin load failed'));

    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hello', message: 'hello', botName: 'test-bot' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Failed to initialize provider: plugin load failed');
  });
});
