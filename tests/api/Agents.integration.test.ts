import express from 'express';
import request from 'supertest';
import { promises as fs } from 'fs';
import agentsRouter from '../../src/server/routes/agents';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

// Mock authenticateToken middleware
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('Agents API Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/agents', agentsRouter);
  });

  describe('GET /api/agents', () => {
    it('should return a list of agents', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', messageProvider: 'discord', llmProvider: 'openai' },
      ];
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockAgents));
      
      const response = await request(app).get('/api/agents');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.agents)).toBe(true);
      expect(response.body.data.agents[0].id).toBe('agent-1');
    });

    it('should handle empty config file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('[]');
      
      const response = await request(app).get('/api/agents');
      
      expect(response.status).toBe(200);
      expect(response.body.data.agents).toEqual([]);
    });
  });

  describe('POST /api/agents', () => {
    it('should create a new agent', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('[]');
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      const response = await request(app)
        .post('/api/agents')
        .send({
          name: 'New Agent',
          messageProvider: 'discord',
          llmProvider: 'openai',
          config: {},
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.agent.name).toBe('New Agent');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return existing agent if name matches (idempotency)', async () => {
      const existing = { id: 'agent-1', name: 'Existing', messageProvider: 'discord', llmProvider: 'openai' };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([existing]));
      
      const response = await request(app)
        .post('/api/agents')
        .send({ name: 'Existing', messageProvider: 'discord', llmProvider: 'openai' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.agent.id).toBe('agent-1');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should update an existing agent', async () => {
      const existing = [
        { id: 'agent-1', name: 'Agent 1', messageProvider: 'discord', llmProvider: 'openai' },
      ];
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existing));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      const response = await request(app)
        .put('/api/agents/agent-1')
        .send({ name: 'Updated' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return 404 for non-existent agent', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('[]');
      
      const response = await request(app)
        .put('/api/agents/non-existent')
        .send({ name: 'Updated' });
      
      expect(response.status).toBe(404);
    });
  });
});
