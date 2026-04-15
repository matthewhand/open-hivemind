import express from 'express';
import request from 'supertest';
import agentsRouter from '../../src/server/routes/agents';
import { webUIStorage } from '../../src/storage/webUIStorage';
import path from 'path';
import fs from 'fs';

describe('WebUI Config API Integration', () => {
  let app: express.Application;
  const testConfigDir = path.join(process.cwd(), 'config', 'user-test');

  beforeAll(() => {
    // Override config directory for testing
    (webUIStorage as any).configDir = testConfigDir;
    (webUIStorage as any).configFile = path.join(testConfigDir, 'webui-config.json');
    (webUIStorage as any).ensureConfigDirSync();

    app = express();
    app.use(express.json());
    app.use('/api/agents', agentsRouter);
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  it('should create and retrieve agents via WebUIStorage', async () => {
    const newAgent = {
      name: 'Integration Test Agent',
      messageProvider: 'slack',
      llmProvider: 'openai',
      isActive: true
    };

    // 1. Create agent
    const createRes = await request(app)
      .post('/api/agents')
      .send(newAgent);
    
    expect(createRes.status).toBe(200);
    expect(createRes.body.data.agent.name).toBe(newAgent.name);
    const agentId = createRes.body.data.agent.id;

    // 2. Retrieve agents
    const getRes = await request(app).get('/api/agents');
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.agents.some((a: any) => a.id === agentId)).toBe(true);
  });
});
