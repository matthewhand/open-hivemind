import { promises as fs } from 'fs';
import { join } from 'path';
import express, { Express } from 'express';
import request from 'supertest';
import { authenticate, requireAdmin } from '../../src/auth/middleware';
import agentsRouter from '../../src/server/routes/agents';

jest.mock('../../src/auth/middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'test-user', isAdmin: true };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user?.isAdmin) {
      next();
    } else {
      res.status(403).send('Forbidden');
    }
  }),
}));

const AGENTS_CONFIG_FILE = join(process.cwd(), 'data', 'agents.json');
const PERSONAS_CONFIG_FILE = join(process.cwd(), 'data', 'personas.json');

describe('Agent API Endpoints', () => {
  let app: Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/agents', agentsRouter);

    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(AGENTS_CONFIG_FILE, '[]', 'utf8');
      // Don't create personas.json initially so it falls back to defaults
    } catch (error) {
      console.error('Error setting up test files:', error);
    }
  });

  afterEach(async () => {
    // Clear mock function calls after each test
    (authenticate as jest.Mock).mockClear();
    (requireAdmin as jest.Mock).mockClear();
    // Clean up created files
    try {
      await fs.writeFile(AGENTS_CONFIG_FILE, '[]', 'utf8');
      // Remove personas.json to reset to defaults for next test
      try {
        await fs.unlink(PERSONAS_CONFIG_FILE);
      } catch (error) {
        // File might not exist, that's fine
      }
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });

  describe('GET /api/agents', () => {
    it('should return an empty list of agents', async () => {
      const response = await request(app).get('/api/agents');
      expect(response.status).toBe(200);
      expect(response.body.agents).toEqual([]);
    });
  });

  describe('POST /api/agents', () => {
    it('should create a new agent', async () => {
      const newAgent = {
        name: 'Test Agent',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: {
          enabled: false,
          type: 'owner',
          allowedUserIds: [],
        },
        isActive: true,
      };
      const response = await request(app).post('/api/agents').send(newAgent);
      expect(response.status).toBe(200);
      expect(response.body.agent).toHaveProperty('id');
      expect(response.body.agent.name).toBe('Test Agent');
    });

    it('should return 400 when missing required fields', async () => {
      const newAgent = {
        name: 'Test Agent',
      };
      const response = await request(app).post('/api/agents').send(newAgent);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/agents/personas', () => {
    it('should return default personas when no custom ones are saved', async () => {
      const response = await request(app).get('/api/agents/personas');
      expect(response.status).toBe(200);
      expect(response.body.personas).toBeInstanceOf(Array);
      expect(response.body.personas.length).toBeGreaterThan(0);
      expect(response.body.personas[0]).toHaveProperty('key', 'default');
    });
  });

  describe('POST /api/agents/personas', () => {
    it('should create a new persona', async () => {
      const newPersona = {
        name: 'Test Persona',
        systemPrompt: 'You are a test persona.',
      };
      const response = await request(app).post('/api/agents/personas').send(newPersona);
      expect(response.status).toBe(200);
      expect(response.body.persona).toHaveProperty('key', 'test_persona');
      expect(response.body.persona.name).toBe('Test Persona');
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should update an existing agent', async () => {
      // First, create an agent
      const newAgent = {
        name: 'Agent to Update',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };
      const createResponse = await request(app).post('/api/agents').send(newAgent);
      const agentId = createResponse.body.agent.id;

      // Now, update the agent
      const updates = { name: 'Updated Agent Name' };
      const updateResponse = await request(app).put(`/api/agents/${agentId}`).send(updates);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.agent.name).toBe('Updated Agent Name');
    });

    it('should return 400 when updating with invalid name', async () => {
      const newAgent = {
        name: 'Agent to Update',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };
      const createResponse = await request(app).post('/api/agents').send(newAgent);
      const agentId = createResponse.body.agent.id;
      const updates = { name: '' };
      const updateResponse = await request(app).put(`/api/agents/${agentId}`).send(updates);
      expect(updateResponse.status).toBe(400);
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('should delete an existing agent', async () => {
      // First, create an agent
      const newAgent = {
        name: 'Agent to Delete',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };
      const createResponse = await request(app).post('/api/agents').send(newAgent);
      const agentId = createResponse.body.agent.id;

      // Now, delete the agent
      const deleteResponse = await request(app).delete(`/api/agents/${agentId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify it's gone
      const getResponse = await request(app).get('/api/agents');
      expect(getResponse.body.agents.find((a: any) => a.id === agentId)).toBeUndefined();
    });
  });

  describe('PUT /api/agents/personas/:key', () => {
    it('should update an existing persona', async () => {
      // First, create a persona
      const newPersona = { name: 'Persona to Update', systemPrompt: 'Initial prompt.' };
      await request(app).post('/api/agents/personas').send(newPersona);

      // Now, update the persona
      const updates = { name: 'Updated Persona Name', systemPrompt: 'Updated prompt.' };
      const updateResponse = await request(app)
        .put(`/api/agents/personas/persona_to_update`)
        .send(updates);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.persona.name).toBe('Updated Persona Name');
      expect(updateResponse.body.persona.systemPrompt).toBe('Updated prompt.');
    });
  });

  describe('DELETE /api/agents/personas/:key', () => {
    it('should delete an existing persona', async () => {
      // First, create a persona
      const newPersona = { name: 'Persona to Delete', systemPrompt: '...' };
      await request(app).post('/api/agents/personas').send(newPersona);

      // Now, delete the persona
      const deleteResponse = await request(app).delete(`/api/agents/personas/persona_to_delete`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });
  });
});
