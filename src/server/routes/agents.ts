import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { ErrorUtils } from '@src/types/errors';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../types/constants';
import {
  AgentIdParamSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
} from '../../validation/schemas/agentsSchema';
import { validateRequest } from '../../validation/validateRequest';

const debug = Debug('app:webui:agents');
const router = Router();

interface AgentConfig {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers: string[];
  mcpGuard: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds: string[];
  };
  isActive: boolean;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

const AGENTS_CONFIG_FILE = join(process.cwd(), 'data', 'agents.json');

const ensureDataDir = async (): Promise<void> => {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error: unknown) {
    debug('Error creating data directory:', ErrorUtils.getMessage(error));
  }
};

const loadJsonConfig = async <T>(filePath: string, defaultValue: T): Promise<T> => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    debug(`Config file ${filePath} not found, using defaults`);
    return defaultValue;
  }
};

const saveJsonConfig = async <T>(filePath: string, data: T): Promise<void> => {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

const getEnvOverrides = (): Record<string, { isOverridden: boolean; redactedValue?: string }> => {
  const overrides: Record<string, { isOverridden: boolean; redactedValue?: string }> = {};
  const envVarPatterns = [
    /^DISCORD_/,
    /^SLACK_/,
    /^TELEGRAM_/,
    /^MATTERMOST_/,
    /^OPENAI_/,
    /^FLOWISE_/,
    /^OPENWEBUI_/,
    /^MCP_/,
    /^BOT_/,
    /^AGENT_/,
  ];

  Object.keys(process.env).forEach((key) => {
    if (envVarPatterns.some((pattern) => pattern.test(key))) {
      const value = process.env[key];
      if (value) {
        overrides[key] = {
          isOverridden: true,
          redactedValue:
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('secret')
              ? `***${value.slice(-4)}`
              : value.length > 20
                ? `${value.slice(0, 10)}...${value.slice(-4)}`
                : value,
        };
      }
    }
  });
  return overrides;
};

// GET /api/agents - Get all agents
router.get(
  '/',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);
    const envOverrides = getEnvOverrides();

    const agentsWithEnvInfo = agents.map((agent) => ({
      ...agent,
      envOverrides: Object.keys(envOverrides).reduce(
        (acc, key) => {
          if (
            key.toLowerCase().includes(agent.messageProvider.toLowerCase()) ||
            key.toLowerCase().includes(agent.llmProvider.toLowerCase()) ||
            key.toLowerCase().includes('bot') ||
            key.toLowerCase().includes('agent')
          ) {
            acc[key] = envOverrides[key];
          }
          return acc;
        },
        {} as Record<string, { isOverridden: boolean; redactedValue?: string }>
      ),
    }));

    return res.json(ApiResponse.success({ agents: agentsWithEnvInfo }));
  })
);

// POST /api/agents - Create new agent
router.post(
  '/',
  validateRequest(CreateAgentSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const agentData = req.body;
    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);

    const existingAgent = agents.find((a) => a.name === agentData.name);
    if (existingAgent) {
      return res.status(HTTP_STATUS.OK).json(ApiResponse.success({ agent: existingAgent }));
    }

    const newAgent: AgentConfig = {
      ...agentData,
      id: `agent_${Date.now()}_${randomUUID()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    agents.push(newAgent);
    await saveJsonConfig(AGENTS_CONFIG_FILE, agents);

    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ agent: newAgent }));
  })
);

// PUT /api/agents/:id - Update agent
router.put(
  '/:id',
  validateRequest(UpdateAgentSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);
    const agentIndex = agents.findIndex((agent) => agent.id === id);

    if (agentIndex === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Agent not found', 'NOT_FOUND'));
    }

    agents[agentIndex] = { ...agents[agentIndex], ...updates, updatedAt: new Date().toISOString() };
    await saveJsonConfig(AGENTS_CONFIG_FILE, agents);

    return res.json(ApiResponse.success({ agent: agents[agentIndex] }));
  })
);

// DELETE /api/agents/:id - Delete agent
router.delete(
  '/:id',
  validateRequest(AgentIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);
    const filteredAgents = agents.filter((agent) => agent.id !== id);

    if (filteredAgents.length === agents.length) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Agent not found', 'NOT_FOUND'));
    }

    await saveJsonConfig(AGENTS_CONFIG_FILE, filteredAgents);
    return res.json(ApiResponse.success());
  })
);

// NOTE: The legacy /personas sub-routes (backed by data/personas.json) were
// removed. The canonical persona store is PersonaManager, exposed via
// /api/personas (src/server/routes/personas.ts).

export default router;
