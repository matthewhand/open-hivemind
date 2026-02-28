import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils, HivemindError } from '@src/types/errors';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import { DatabaseManager } from '../../database/DatabaseManager';

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
}

interface Persona {
  key: string;
  name: string;
  systemPrompt: string;
}

interface MCPServer {
  name: string;
  url: string;
  apiKey?: string;
  connected: boolean;
  tools?: string[];
}

// Agent Configuration Management
const AGENTS_CONFIG_FILE = join(process.cwd(), 'data', 'agents.json');
const PERSONAS_CONFIG_FILE = join(process.cwd(), 'data', 'personas.json');
const MCP_SERVERS_CONFIG_FILE = join(process.cwd(), 'data', 'mcp-servers.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug('Error creating data directory:', hivemindError.message);
  }
};

// Load/Save configurations
const loadJsonConfig = async <T>(filePath: string, defaultValue: T): Promise<T> => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug(`Config file ${filePath} not found, using defaults:`, hivemindError.message);
    return defaultValue;
  }
};

const saveJsonConfig = async <T>(filePath: string, data: T): Promise<void> => {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// Get environment variable overrides
const getEnvOverrides = (): Record<string, { isOverridden: boolean; redactedValue?: string }> => {
  const overrides: Record<string, { isOverridden: boolean; redactedValue?: string }> = {};

  // Check for common environment variables that might override config
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

// Routes

// GET /api/agents - Get all agents
router.get('/', async (req, res) => {
  try {
    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);
    const envOverrides = getEnvOverrides();

    // Add environment override information to each agent
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

    return res.json({ agents: agentsWithEnvInfo });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching agents:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'AGENTS_FETCH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/agents - Create new agent
router.post('/', async (req, res) => {
  try {
    const { name, messageProvider, llmProvider } = req.body;
    if (
      typeof name !== 'string' ||
      name.trim() === '' ||
      name.length > 100 ||
      typeof messageProvider !== 'string' ||
      messageProvider.trim() === '' ||
      typeof llmProvider !== 'string' ||
      llmProvider.trim() === ''
    ) {
      return res.status(400).json({ error: 'name, messageProvider, and llmProvider are required' });
    }

    const agentData: Omit<AgentConfig, 'id'> = req.body;

    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);
    const newAgent: AgentConfig = {
      ...agentData,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    agents.push(newAgent);
    await saveJsonConfig(AGENTS_CONFIG_FILE, agents);

    debug(`Created new agent: ${newAgent.name}`);
    return res.json({ agent: newAgent });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error creating agent:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'AGENT_CREATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req, res) => {
  try {
    const { name, messageProvider, llmProvider } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
        return res.status(400).json({ error: 'name, messageProvider, and llmProvider are required' });
      }
    }

    if (messageProvider !== undefined) {
      if (typeof messageProvider !== 'string' || messageProvider.trim() === '') {
        return res.status(400).json({ error: 'name, messageProvider, and llmProvider are required' });
      }
    }

    if (llmProvider !== undefined) {
      if (typeof llmProvider !== 'string' || llmProvider.trim() === '') {
        return res.status(400).json({ error: 'name, messageProvider, and llmProvider are required' });
      }
    }

    const { id } = req.params;
    const updates: Partial<AgentConfig> = req.body;

    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);
    const agentIndex = agents.findIndex((agent) => agent.id === id);

    if (agentIndex === -1) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    agents[agentIndex] = { ...agents[agentIndex], ...updates };
    await saveJsonConfig(AGENTS_CONFIG_FILE, agents);

    debug(`Updated agent: ${agents[agentIndex].name}`);
    return res.json({ agent: agents[agentIndex] });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error updating agent:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'AGENT_UPDATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const agents = await loadJsonConfig<AgentConfig[]>(AGENTS_CONFIG_FILE, []);
    const filteredAgents = agents.filter((agent) => agent.id !== id);

    if (filteredAgents.length === agents.length) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await saveJsonConfig(AGENTS_CONFIG_FILE, filteredAgents);

    debug(`Deleted agent: ${id}`);
    return res.json({ success: true });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error deleting agent:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'AGENT_DELETE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/agents/personas - Get all personas
router.get('/personas', async (req, res) => {
  try {
    const personas = await loadJsonConfig<Persona[]>(PERSONAS_CONFIG_FILE, [
      {
        key: 'default',
        name: 'Default Assistant',
        systemPrompt:
          'You are a helpful AI assistant. Be concise, accurate, and helpful in your responses.',
      },
      {
        key: 'friendly',
        name: 'Friendly Helper',
        systemPrompt:
          'You are a friendly and enthusiastic AI assistant. Use a warm, conversational tone and always try to be encouraging and supportive.',
      },
      {
        key: 'technical',
        name: 'Technical Expert',
        systemPrompt:
          'You are a technical expert AI assistant. Provide detailed, accurate technical information. Use precise terminology and include relevant examples when helpful.',
      },
    ]);

    return res.json({ personas });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching personas:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'PERSONAS_FETCH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/agents/personas - Create new persona
router.post('/personas', async (req, res) => {
  try {
    const { name, systemPrompt } = req.body;

    if (!name || !systemPrompt) {
      return res.status(400).json({ error: 'Name and system prompt are required' });
    }

    const personas = await loadJsonConfig<Persona[]>(PERSONAS_CONFIG_FILE, []);
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check if persona already exists
    if (personas.find((p) => p.key === key)) {
      return res.status(400).json({ error: 'Persona with this name already exists' });
    }

    const newPersona: Persona = { key, name, systemPrompt };
    personas.push(newPersona);

    await saveJsonConfig(PERSONAS_CONFIG_FILE, personas);

    debug(`Created new persona: ${name}`);
    return res.json({ persona: newPersona });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error creating persona:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'PERSONA_CREATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/agents/personas/:key - Update persona
router.put('/personas/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { name, systemPrompt } = req.body;

    const personas = await loadJsonConfig<Persona[]>(PERSONAS_CONFIG_FILE, []);
    const personaIndex = personas.findIndex((p) => p.key === key);

    if (personaIndex === -1) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    personas[personaIndex] = { key, name, systemPrompt };
    await saveJsonConfig(PERSONAS_CONFIG_FILE, personas);

    debug(`Updated persona: ${name}`);
    return res.json({ persona: personas[personaIndex] });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error updating persona:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'PERSONA_UPDATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/agents/personas/:key - Delete persona
router.delete('/personas/:key', async (req, res) => {
  try {
    const { key } = req.params;

    if (key === 'default') {
      return res.status(400).json({ error: 'Cannot delete default persona' });
    }

    const personas = await loadJsonConfig<Persona[]>(PERSONAS_CONFIG_FILE, []);
    const filteredPersonas = personas.filter((p) => p.key !== key);

    if (filteredPersonas.length === personas.length) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    await saveJsonConfig(PERSONAS_CONFIG_FILE, filteredPersonas);

    debug(`Deleted persona: ${key}`);
    return res.json({ success: true });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error deleting persona:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'PERSONA_DELETE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
