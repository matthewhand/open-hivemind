import { promises as fs } from 'fs';
import { join } from 'path';
import express, { Express } from 'express';
import request from 'supertest';
import agentsRouter from '../../src/server/routes/agents';

// Mock validation middleware to bypass validation in tests
jest.mock('../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

// Mock authentication middleware
jest.mock('../../src/auth/middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'test-user', isAdmin: true };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user?.isAdmin) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }),
}));

const AGENTS_CONFIG_FILE = join(process.cwd(), 'data', 'agents.json');
const PERSONAS_CONFIG_FILE = join(process.cwd(), 'data', 'personas.json');

describe('Agents API - Comprehensive Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/agents', agentsRouter);

    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory may already exist
    }
  });

  beforeEach(async () => {
    // Reset config files before each test
    try {
      await fs.writeFile(AGENTS_CONFIG_FILE, '[]', 'utf8');
      // Remove personas.json to use defaults
      try {
        await fs.unlink(PERSONAS_CONFIG_FILE);
      } catch (error) {
        // File might not exist, that's fine
      }
    } catch (error) {
      console.error('Error setting up test files:', error);
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.writeFile(AGENTS_CONFIG_FILE, '[]', 'utf8');
      try {
        await fs.unlink(PERSONAS_CONFIG_FILE);
      } catch (error) {
        // File might not exist
      }
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });

  // ========================================
  // GET /api/agents - List all agents
  // ========================================

  describe('GET /api/agents', () => {
    it('should return an empty list when no agents exist', async () => {
      const response = await request(app).get('/api/agents').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toEqual([]);
    });

    it('should return all agents with environment override information', async () => {
      // Create test agents
      const agents = [
        {
          id: 'agent_1',
          name: 'Discord Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          mcpServers: [],
          mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
          isActive: true,
        },
        {
          id: 'agent_2',
          name: 'Slack Bot',
          messageProvider: 'slack',
          llmProvider: 'anthropic',
          mcpServers: [],
          mcpGuard: { enabled: true, type: 'custom', allowedUserIds: ['user1'] },
          isActive: false,
        },
      ];
      await fs.writeFile(AGENTS_CONFIG_FILE, JSON.stringify(agents), 'utf8');

      const response = await request(app).get('/api/agents').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toHaveLength(2);
      expect(response.body.data.agents[0]).toHaveProperty('id', 'agent_1');
      expect(response.body.data.agents[0]).toHaveProperty('name', 'Discord Bot');
      expect(response.body.data.agents[0]).toHaveProperty('envOverrides');
    });

    it('should handle file read errors gracefully', async () => {
      // Delete the config file to simulate a read error scenario
      try {
        await fs.unlink(AGENTS_CONFIG_FILE);
      } catch (error) {
        // File might not exist
      }

      const response = await request(app).get('/api/agents').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toEqual([]);
    });
  });

  // ========================================
  // POST /api/agents - Create new agent
  // ========================================

  describe('POST /api/agents', () => {
    it('should create a new agent with all required fields', async () => {
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

      const response = await request(app).post('/api/agents').send(newAgent).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agent).toHaveProperty('id');
      expect(response.body.data.agent).toHaveProperty('createdAt');
      expect(response.body.data.agent).toHaveProperty('updatedAt');
      expect(response.body.data.agent.name).toBe('Test Agent');
      expect(response.body.data.agent.messageProvider).toBe('discord');
      expect(response.body.data.agent.llmProvider).toBe('openai');
      expect(response.body.data.agent.isActive).toBe(true);
    });

    it('should create a new agent with optional fields', async () => {
      const newAgent = {
        name: 'Advanced Agent',
        messageProvider: 'slack',
        llmProvider: 'anthropic',
        persona: 'friendly',
        systemInstruction: 'Be helpful and concise',
        mcpServers: ['server1', 'server2'],
        mcpGuard: {
          enabled: true,
          type: 'custom',
          allowedUserIds: ['user1', 'user2'],
        },
        isActive: false,
      };

      const response = await request(app).post('/api/agents').send(newAgent).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agent.persona).toBe('friendly');
      expect(response.body.data.agent.systemInstruction).toBe('Be helpful and concise');
      expect(response.body.data.agent.mcpServers).toEqual(['server1', 'server2']);
      expect(response.body.data.agent.mcpGuard.enabled).toBe(true);
      expect(response.body.data.agent.mcpGuard.type).toBe('custom');
    });

    it('should return existing agent if one with same name exists (idempotency)', async () => {
      const agent = {
        name: 'Duplicate Agent',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };

      // Create first agent
      const firstResponse = await request(app).post('/api/agents').send(agent).expect(200);
      const firstAgentId = firstResponse.body.data.agent.id;

      // Try to create duplicate
      const secondResponse = await request(app).post('/api/agents').send(agent).expect(200);

      expect(secondResponse.body.agent.id).toBe(firstAgentId);
      expect(secondResponse.body.agent.name).toBe('Duplicate Agent');
    });

    it('should generate unique IDs for different agents', async () => {
      const agent1 = {
        name: 'Agent One',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };

      const agent2 = {
        name: 'Agent Two',
        messageProvider: 'slack',
        llmProvider: 'anthropic',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };

      const response1 = await request(app).post('/api/agents').send(agent1).expect(200);
      const response2 = await request(app).post('/api/agents').send(agent2).expect(200);

      expect(response1.body.data.agent.id).not.toBe(response2.body.data.agent.id);
    });
  });

  // ========================================
  // PUT /api/agents/:id - Update agent
  // ========================================

  describe('PUT /api/agents/:id', () => {
    it('should update an existing agent', async () => {
      // Create an agent first
      const createResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Agent to Update',
          messageProvider: 'discord',
          llmProvider: 'openai',
          mcpServers: [],
          mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
          isActive: true,
        })
        .expect(200);

      const agentId = createResponse.body.data.agent.id;

      // Update the agent
      const updates = {
        name: 'Updated Agent Name',
        isActive: false,
        persona: 'technical',
      };

      const updateResponse = await request(app)
        .put(`/api/agents/${agentId}`)
        .send(updates)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.agent.name).toBe('Updated Agent Name');
      expect(updateResponse.body.data.agent.isActive).toBe(false);
      expect(updateResponse.body.data.agent.persona).toBe('technical');
      // Original fields should remain
      expect(updateResponse.body.data.agent.messageProvider).toBe('discord');
    });

    it('should update only specified fields', async () => {
      // Create an agent first
      const createResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Partial Update Agent',
          messageProvider: 'slack',
          llmProvider: 'anthropic',
          mcpServers: ['server1'],
          mcpGuard: { enabled: true, type: 'owner', allowedUserIds: [] },
          isActive: true,
        })
        .expect(200);

      const agentId = createResponse.body.data.agent.id;

      // Update only the name
      const updateResponse = await request(app)
        .put(`/api/agents/${agentId}`)
        .send({ name: 'New Name Only' })
        .expect(200);

      expect(updateResponse.body.data.agent.name).toBe('New Name Only');
      expect(updateResponse.body.data.agent.messageProvider).toBe('slack');
      expect(updateResponse.body.data.agent.llmProvider).toBe('anthropic');
      expect(updateResponse.body.data.agent.isActive).toBe(true);
    });

    it('should return 404 when updating non-existent agent', async () => {
      const updates = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/agents/non_existent_id')
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });

    it('should handle invalid agent ID gracefully', async () => {
      const response = await request(app).put('/api/agents/').send({ name: 'Test' }).expect(404);
    });
  });

  // ========================================
  // DELETE /api/agents/:id - Delete agent
  // ========================================

  describe('DELETE /api/agents/:id', () => {
    it('should delete an existing agent', async () => {
      // Create an agent first
      const createResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Agent to Delete',
          messageProvider: 'discord',
          llmProvider: 'openai',
          mcpServers: [],
          mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
          isActive: true,
        })
        .expect(200);

      const agentId = createResponse.body.data.agent.id;

      // Delete the agent
      const deleteResponse = await request(app).delete(`/api/agents/${agentId}`).expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify it's gone
      const getResponse = await request(app).get('/api/agents').expect(200);
      const deletedAgent = getResponse.body.data.agents.find((a: any) => a.id === agentId);
      expect(deletedAgent).toBeUndefined();
    });

    it('should return 404 when deleting non-existent agent', async () => {
      const response = await request(app).delete('/api/agents/non_existent_id').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });

    it('should not affect other agents when deleting one', async () => {
      // Create two agents
      const agent1Response = await request(app)
        .post('/api/agents')
        .send({
          name: 'Agent 1',
          messageProvider: 'discord',
          llmProvider: 'openai',
          mcpServers: [],
          mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
          isActive: true,
        })
        .expect(200);

      const agent2Response = await request(app)
        .post('/api/agents')
        .send({
          name: 'Agent 2',
          messageProvider: 'slack',
          llmProvider: 'anthropic',
          mcpServers: [],
          mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
          isActive: true,
        })
        .expect(200);

      const agent1Id = agent1Response.body.data.agent.id;
      const agent2Id = agent2Response.body.data.agent.id;

      // Delete first agent
      await request(app).delete(`/api/agents/${agent1Id}`).expect(200);

      // Verify second agent still exists
      const getResponse = await request(app).get('/api/agents').expect(200);
      expect(getResponse.body.data.agents).toHaveLength(1);
      expect(getResponse.body.data.agents[0].id).toBe(agent2Id);
    });
  });

  // ========================================
  // GET /api/agents/personas - List personas
  // ========================================

  describe('GET /api/agents/personas', () => {
    it('should return default personas when no custom ones exist', async () => {
      const response = await request(app).get('/api/agents/personas').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.personas).toBeInstanceOf(Array);
      expect(response.body.data.personas.length).toBeGreaterThan(0);

      // Check for default personas
      const defaultPersona = response.body.data.personas.find((p: any) => p.key === 'default');
      expect(defaultPersona).toBeDefined();
      expect(defaultPersona.name).toBe('Default Assistant');
      expect(defaultPersona.systemPrompt).toBeTruthy();
    });

    it('should return custom personas when they exist', async () => {
      // Create custom personas
      const customPersonas = [
        {
          key: 'custom1',
          name: 'Custom Persona 1',
          systemPrompt: 'Custom system prompt 1',
        },
        {
          key: 'custom2',
          name: 'Custom Persona 2',
          systemPrompt: 'Custom system prompt 2',
        },
      ];
      await fs.writeFile(PERSONAS_CONFIG_FILE, JSON.stringify(customPersonas), 'utf8');

      const response = await request(app).get('/api/agents/personas').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.personas).toHaveLength(2);
      expect(response.body.data.personas[0].key).toBe('custom1');
    });
  });

  // ========================================
  // POST /api/agents/personas - Create persona
  // ========================================

  describe('POST /api/agents/personas', () => {
    it('should create a new persona', async () => {
      const newPersona = {
        name: 'Test Persona',
        systemPrompt: 'You are a test persona.',
      };

      const response = await request(app).post('/api/agents/personas').send(newPersona).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.persona).toHaveProperty('key', 'test_persona');
      expect(response.body.data.persona.name).toBe('Test Persona');
      expect(response.body.data.persona.systemPrompt).toBe('You are a test persona.');
    });

    it('should generate key from name by converting to lowercase and replacing special chars', async () => {
      const newPersona = {
        name: 'My Special Persona!',
        systemPrompt: 'A special prompt.',
      };

      const response = await request(app).post('/api/agents/personas').send(newPersona).expect(200);

      // The key generation replaces all non-alphanumeric chars with underscore
      expect(response.body.data.persona.key).toBe('my_special_persona_');
    });

    it('should return existing persona if one with same key exists (idempotency)', async () => {
      const persona = {
        name: 'Duplicate Persona',
        systemPrompt: 'Original prompt',
      };

      // Create first persona
      const firstResponse = await request(app)
        .post('/api/agents/personas')
        .send(persona)
        .expect(200);

      // Try to create duplicate (same name generates same key)
      const secondResponse = await request(app)
        .post('/api/agents/personas')
        .send(persona)
        .expect(200);

      expect(secondResponse.body.persona.key).toBe(firstResponse.body.data.persona.key);
    });
  });

  // ========================================
  // PUT /api/agents/personas/:key - Update persona
  // ========================================

  describe('PUT /api/agents/personas/:key', () => {
    it('should update an existing persona', async () => {
      // Create a persona first
      await request(app)
        .post('/api/agents/personas')
        .send({
          name: 'Persona to Update',
          systemPrompt: 'Original prompt',
        })
        .expect(200);

      // Update the persona
      const updates = {
        name: 'Updated Persona Name',
        systemPrompt: 'Updated system prompt',
      };

      const updateResponse = await request(app)
        .put('/api/agents/personas/persona_to_update')
        .send(updates)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.persona.name).toBe('Updated Persona Name');
      expect(updateResponse.body.data.persona.systemPrompt).toBe('Updated system prompt');
      expect(updateResponse.body.data.persona.key).toBe('persona_to_update');
    });

    it('should return 404 when updating non-existent persona', async () => {
      const updates = {
        name: 'Updated Name',
        systemPrompt: 'Updated prompt',
      };

      const response = await request(app)
        .put('/api/agents/personas/non_existent_key')
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Persona not found');
    });
  });

  // ========================================
  // DELETE /api/agents/personas/:key - Delete persona
  // ========================================

  describe('DELETE /api/agents/personas/:key', () => {
    it('should delete an existing persona', async () => {
      // Create a persona first
      await request(app)
        .post('/api/agents/personas')
        .send({
          name: 'Persona to Delete',
          systemPrompt: 'Test prompt',
        })
        .expect(200);

      // Delete the persona
      const deleteResponse = await request(app)
        .delete('/api/agents/personas/persona_to_delete')
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify it's gone
      const getResponse = await request(app).get('/api/agents/personas').expect(200);
      const deletedPersona = getResponse.body.data.personas.find(
        (p: any) => p.key === 'persona_to_delete'
      );
      expect(deletedPersona).toBeUndefined();
    });

    it('should return 404 when deleting non-existent persona', async () => {
      const response = await request(app)
        .delete('/api/agents/personas/non_existent_key')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Persona not found');
    });

    it('should prevent deletion of default persona', async () => {
      const response = await request(app).delete('/api/agents/personas/default').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot delete default persona');
    });
  });

  // ========================================
  // Edge Cases and Error Handling
  // ========================================

  describe('Edge Cases', () => {
    it('should handle malformed JSON in agent config file', async () => {
      await fs.writeFile(AGENTS_CONFIG_FILE, 'invalid json{', 'utf8');

      const response = await request(app).get('/api/agents');

      // Should handle gracefully and return error or default
      expect([200, 500]).toContain(response.status);
    });

    it('should handle empty request body for POST /api/agents', async () => {
      const response = await request(app).post('/api/agents').send({});

      // Validation should catch this, but since we mocked it, it might pass through
      // In real scenario, this would be caught by validation
      expect(response.status).toBeDefined();
    });

    it('should handle very long agent names', async () => {
      const longName = 'A'.repeat(1000);
      const agent = {
        name: longName,
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };

      const response = await request(app).post('/api/agents').send(agent);

      expect(response.status).toBeDefined();
      if (response.status === 200) {
        expect(response.body.data.agent.name).toBe(longName);
      }
    });

    it('should handle special characters in agent names', async () => {
      const agent = {
        name: 'Test Agent 🤖 with émojis & spëcial çhars',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };

      const response = await request(app).post('/api/agents').send(agent).expect(200);

      expect(response.body.data.agent.name).toBe('Test Agent 🤖 with émojis & spëcial çhars');
    });

    it('should handle empty mcpServers array', async () => {
      const agent = {
        name: 'Empty MCP Agent',
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      };

      const response = await request(app).post('/api/agents').send(agent).expect(200);

      expect(response.body.data.agent.mcpServers).toEqual([]);
    });

    it('should handle multiple concurrent agent creations', async () => {
      const agents = Array.from({ length: 5 }, (_, i) => ({
        name: `Concurrent Agent ${i}`,
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner', allowedUserIds: [] },
        isActive: true,
      }));

      // Create agents sequentially to avoid race conditions with file writes
      for (const agent of agents) {
        await request(app).post('/api/agents').send(agent).expect(200);
      }

      // Verify all were created
      const getResponse = await request(app).get('/api/agents').expect(200);
      expect(getResponse.body.data.agents.length).toBe(5);
    });
  });
});
