import express from 'express';
import request from 'supertest';
import router from '../../../src/server/routes/webui';
import { webUIStorage } from '../../../src/storage/webUIStorage';

jest.mock('../../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    loadConfig: jest.fn(),
    saveConfig: jest.fn(),
  },
}));

const mockedStorage = webUIStorage as jest.Mocked<typeof webUIStorage>;

describe('POST /api/webui/config — privilege-escalation guard', () => {
  let app: express.Application;

  const baseConfig = {
    agents: [{ id: 'existing-agent' }],
    mcpServers: [{ name: 'existing-mcp' }],
    llmProviders: [{ id: 'existing-llm' }],
    messengerProviders: [],
    personas: [],
    guards: [],
    layout: ['stats'],
    lastUpdated: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', router);
    jest.clearAllMocks();
    mockedStorage.loadConfig.mockResolvedValue({ ...baseConfig } as any);
    mockedStorage.saveConfig.mockResolvedValue(undefined as any);
  });

  it('rejects requests that try to overwrite llmProviders with 400', async () => {
    const res = await request(app)
      .post('/config')
      .send({ llmProviders: [{ id: 'attacker-llm', apiKey: 'pwned' }] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(mockedStorage.saveConfig).not.toHaveBeenCalled();
  });

  it('rejects requests that try to overwrite agents with 400', async () => {
    const res = await request(app)
      .post('/config')
      .send({ agents: [{ id: 'attacker-agent' }] });

    expect(res.status).toBe(400);
    expect(mockedStorage.saveConfig).not.toHaveBeenCalled();
  });

  it('rejects requests that try to overwrite mcpServers with 400', async () => {
    const res = await request(app)
      .post('/config')
      .send({ mcpServers: [{ name: 'attacker-mcp' }] });

    expect(res.status).toBe(400);
    expect(mockedStorage.saveConfig).not.toHaveBeenCalled();
  });

  it('rejects requests that smuggle layout alongside forbidden keys with 400', async () => {
    const res = await request(app)
      .post('/config')
      .send({
        layout: ['stats'],
        llmProviders: [{ id: 'attacker-llm' }],
      });

    expect(res.status).toBe(400);
    expect(mockedStorage.saveConfig).not.toHaveBeenCalled();
  });

  it('rejects unknown keys with 400', async () => {
    const res = await request(app)
      .post('/config')
      .send({ somethingElse: 'evil' });

    expect(res.status).toBe(400);
    expect(mockedStorage.saveConfig).not.toHaveBeenCalled();
  });

  it('accepts a valid dashboard-layout request and persists only layout', async () => {
    const res = await request(app)
      .post('/config')
      .send({ layout: ['stats', 'agents', 'command-stream'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockedStorage.saveConfig).toHaveBeenCalledTimes(1);

    const saved = mockedStorage.saveConfig.mock.calls[0][0] as any;
    expect(saved.layout).toEqual(['stats', 'agents', 'command-stream']);
    // Existing sensitive sections must be preserved, not overwritten
    expect(saved.agents).toEqual(baseConfig.agents);
    expect(saved.mcpServers).toEqual(baseConfig.mcpServers);
    expect(saved.llmProviders).toEqual(baseConfig.llmProviders);
  });

  it('accepts an empty body and leaves config unchanged', async () => {
    const res = await request(app).post('/config').send({});

    expect(res.status).toBe(200);
    expect(mockedStorage.saveConfig).toHaveBeenCalledTimes(1);
    const saved = mockedStorage.saveConfig.mock.calls[0][0] as any;
    expect(saved.agents).toEqual(baseConfig.agents);
    expect(saved.llmProviders).toEqual(baseConfig.llmProviders);
    expect(saved.layout).toEqual(baseConfig.layout);
  });
});
