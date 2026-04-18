import { promises as fs } from 'fs';
import express from 'express';
import request from 'supertest';
import agentsRouter from '../../src/server/routes/agents';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock validation to avoid schema overhead in this test
jest.mock('../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

describe.skip('Agents API Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/agents', agentsRouter);
  });

  const mockAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    messageProvider: 'discord',
    llmProvider: 'openai',
    mcpServers: [],
    mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
    isActive: true,
  };

  describe('GET /api/agents', () => {
    it('should return a list of agents', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([mockAgent]));

      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toHaveLength(1);
      expect(response.body.data.agents[0].id).toBe('agent-1');
    });

    it('should handle empty config file', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(response.body.data.agents).toEqual([]);
    });
  });

  describe('POST /api/agents', () => {
    it('should create a new agent', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('[]');
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const newAgentData = {
        name: 'New Bot',
        messageProvider: 'slack',
        llmProvider: 'anthropic',
      };

      const response = await request(app).post('/api/agents').send(newAgentData);

      expect(response.status).toBe(200);
      expect(response.body.data.agent.name).toBe('New Bot');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return existing agent if name matches (idempotency)', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([mockAgent]));

      const response = await request(app).post('/api/agents').send({ name: 'Test Agent' });

      expect(response.status).toBe(200);
      expect(response.body.agent.id).toBe('agent-1');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should update an existing agent', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([mockAgent]));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).put('/api/agents/agent-1').send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.data.agent.isActive).toBe(false);

      const savedData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedData[0].isActive).toBe(false);
    });

    it('should return 404 for non-existent agent', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('[]');

      const response = await request(app).put('/api/agents/non-existent').send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });
  });
});
