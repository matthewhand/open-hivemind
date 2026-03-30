import express from 'express';
import request from 'supertest';
import router from '../../../src/server/routes/agents';

const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();

jest.mock('fs', () => ({
  promises: {
    readFile: (...args: any[]) => mockReadFile(...args),
    writeFile: (...args: any[]) => mockWriteFile(...args),
    mkdir: (...args: any[]) => mockMkdir(...args),
  },
}));

jest.mock('@src/types/errors', () => ({
  ErrorUtils: {
    toHivemindError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
    classifyError: () => ({ type: 'unknown', severity: 'error' }),
    getMessage: (e: any) => e.message || String(e),
    getCode: () => 'TEST_ERROR',
    getStatusCode: () => 500,
  },
}));

describe('Agents Routes', () => {
  let app: express.Application;

  const sampleAgent = {
    id: 'agent_123',
    name: 'TestBot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    mcpServers: [],
    mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/agents', router);
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('GET /agents', () => {
    it('should return all agents', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([sampleAgent]));
      const res = await request(app).get('/agents');
      expect(res.status).toBe(200);
      expect(res.body.agents).toHaveLength(1);
      expect(res.body.agents[0].name).toBe('TestBot');
    });

    it('should return empty array when no config file exists', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const res = await request(app).get('/agents');
      expect(res.status).toBe(200);
      expect(res.body.agents).toEqual([]);
    });
  });

  describe('POST /agents', () => {
    it('should create a new agent', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const newAgent = {
        name: 'NewBot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };

      const res = await request(app).post('/agents').send(newAgent);
      expect(res.status).toBe(200);
      expect(res.body.agent).toEqual(
        expect.objectContaining({ name: 'NewBot', messageProvider: 'slack', llmProvider: 'openai' })
      );
      expect(res.body.agent.name).toBe('NewBot');
      expect(res.body.agent.id).toMatch(/^agent_/);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should return existing agent if name already exists', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([sampleAgent]));
      const res = await request(app).post('/agents').send({
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });
      expect(res.status).toBe(200);
      expect(res.body.agent.id).toBe('agent_123');
    });
  });

  describe('PUT /agents/:id', () => {
    it('should update an existing agent', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([sampleAgent]));
      const res = await request(app).put('/agents/agent_123').send({ name: 'UpdatedBot' });
      expect(res.status).toBe(200);
      expect(res.body.agent.name).toBe('UpdatedBot');
    });

    it('should return 404 for non-existent agent', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));
      const res = await request(app).put('/agents/nonexistent').send({ name: 'X' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });
  });

  describe('DELETE /agents/:id', () => {
    it('should delete an existing agent', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([sampleAgent]));
      const res = await request(app).delete('/agents/agent_123');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent agent', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));
      const res = await request(app).delete('/agents/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });
  });

  describe('GET /agents/personas', () => {
    it('should return personas with defaults when no config', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const res = await request(app).get('/agents/personas');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.personas)).toBe(true);
      expect(res.body.personas.length).toBeGreaterThan(0);
    });
  });

  describe('POST /agents/personas', () => {
    it('should return 400 if name or systemPrompt is missing', async () => {
      const res = await request(app).post('/agents/personas').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should create a new persona', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const res = await request(app)
        .post('/agents/personas')
        .send({ name: 'Custom', systemPrompt: 'Be helpful.' });
      expect(res.status).toBe(200);
      expect(res.body.persona.key).toBe('custom');
      expect(res.body.persona.name).toBe('Custom');
    });
  });

  describe('DELETE /agents/personas/:key', () => {
    it('should return 400 when trying to delete default persona', async () => {
      const res = await request(app).delete('/agents/personas/default');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot delete default persona');
    });

    it('should return 404 for non-existent persona', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));
      const res = await request(app).delete('/agents/personas/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Persona not found');
    });
  });
});
