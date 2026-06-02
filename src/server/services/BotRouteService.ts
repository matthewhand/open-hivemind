import fs from 'fs';
import path from 'path';
import { createLogger } from '../../common/StructuredLogger';
import { getLlmProvider } from '../../llm/getLlmProvider';
import { BotManager, type BotInstance, type CreateBotRequest } from '../../managers/BotManager';

// eslint-disable-next-line unused-imports/no-unused-vars
const logger = createLogger('BotRouteService');

export interface ImportReport {
  created: string[];
  updated: string[];
  skipped: string[];
  errors: string[];
}

export interface DiagnosticResult {
  messageProvider: { status: string; details: string };
  llm: { status: string; details: string };
  mcp: Array<{ name: string; status: string; details?: string }>;
  timestamp: string;
}

export interface GeneratedBotConfig {
  name: string;
  personaName: string;
  systemInstruction: string;
  suggestedMcpTools: string[];
}

export class BotRouteService {
  private static instance: BotRouteService;

  private constructor() {}

  public static getInstance(): BotRouteService {
    if (!BotRouteService.instance) {
      BotRouteService.instance = new BotRouteService();
    }
    return BotRouteService.instance;
  }

  public async reorderBots(ids: string[]): Promise<void> {
    const orderFilePath = path.join(process.cwd(), 'config', 'user', 'bot-order.json');
    const orderDir = path.dirname(orderFilePath);
    await fs.promises.mkdir(orderDir, { recursive: true });
    await fs.promises.writeFile(orderFilePath, JSON.stringify(ids, null, 2));
  }

  public async importBots(incoming: unknown[]): Promise<ImportReport> {
    const manager = await BotManager.getInstance();
    const existingBots = await manager.getAllBots();
    const existingByName = new Map(existingBots.map((b) => [b.name.toLowerCase(), b]));

    const report: ImportReport = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    for (const bot of incoming) {
      try {
        const botObj = bot as any;
        if (!botObj.name) {
          report.errors.push('Skipped bot with no name');
          continue;
        }
        const {
          id: _id,
          status: _status,
          messageCount: _mc,
          errorCount: _ec,
          ...importData
        } = botObj;

        const existing = existingByName.get(String(botObj.name).toLowerCase());
        if (existing) {
          await manager.updateBot(existing.id, importData);
          report.updated.push(String(botObj.name));
        } else {
          await manager.createBot(importData as CreateBotRequest);
          report.created.push(String(botObj.name));
        }
      } catch (err: unknown) {
        const name = (bot as any)?.name || 'unknown';
        const msg = err instanceof Error ? err.message : String(err);
        report.errors.push(`${name}: ${msg}`);
      }
    }
    return report;
  }

  public async generateConfig(description: string): Promise<GeneratedBotConfig> {
    const providers = await getLlmProvider();
    const provider = providers[0];

    if (!provider) {
      throw new Error('No LLM provider available for generation');
    }

    const systemPrompt = `You are an expert AI Bot Designer for the Open Hivemind platform.
Your task is to take a user's brief description of a bot they want to create and generate a high-quality configuration.

Output MUST be a JSON object with these fields:
- name: A short, catchy name for the bot (e.g., "DevOpsMaster", "CodeCritic", "ResearchAlly")
- personaName: A descriptive name for its personality (e.g., "Proactive Engineer", "Detail-Oriented Librarian")
- systemInstruction: A comprehensive, expert-level system prompt (200-500 words) that defines the bot's tone, rules, expertise, and behavior. Use markdown formatting.
- suggestedMcpTools: An array of 3-5 strings naming types of tools it would likely need (e.g., "filesystem", "fetch", "google-search", "sqlite").

User Description: "${description}"

Respond ONLY with valid JSON. No preamble or explanation.`;

    const responseText = await provider.generateChatCompletion(systemPrompt, []);
    // Clean up markdown code blocks if the LLM included them
    const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanJson) as GeneratedBotConfig;
  }

  public async runDiagnostic(botId: string): Promise<DiagnosticResult> {
    const manager = await BotManager.getInstance();
    const bot = await manager.getBot(botId);
    if (!bot) {
      throw new Error('Bot not found');
    }

    const results: DiagnosticResult = {
      messageProvider: { status: 'pending', details: '' },
      llm: { status: 'pending', details: '' },
      mcp: [],
      timestamp: new Date().toISOString(),
    };

    // 1. Test Message Provider
    try {
      const { getMessengerService } = await import('../../managers/botLifecycle');
      const service = await getMessengerService(bot.messageProvider);
      if (service) {
        const isConnected = await (service as any).isConnected(bot.name);
        results.messageProvider = {
          status: isConnected ? 'ok' : 'error',
          details: isConnected
            ? 'Active connection confirmed'
            : 'Provider unreachable or disconnected',
        };
      }
    } catch (err) {
      results.messageProvider = { status: 'error', details: String(err) };
    }

    // 2. Test LLM
    try {
      const providers = await getLlmProvider();
      const provider = providers.find((p) => p.name === bot.llmProvider) || providers[0];
      if (provider) {
        const start = Date.now();
        await provider.generateCompletion('ping');
        results.llm = {
          status: 'ok',
          details: `Latency: ${Date.now() - start}ms`,
        };
      }
    } catch (err) {
      results.llm = { status: 'error', details: String(err) };
    }

    // 3. Test MCP
    if (bot.mcpServers && Array.isArray(bot.mcpServers)) {
      const { MCPService } = await import('../../mcp/MCPService');
      const mcp = MCPService.getInstance();
      for (const serverName of bot.mcpServers) {
        try {
          const server = typeof serverName === 'string' ? serverName : (serverName as any).name;
          const isUp = mcp.getConnectedServers().includes(server);
          results.mcp.push({ name: server, status: isUp ? 'ok' : 'error' });
        } catch (err) {
          results.mcp.push({ name: String(serverName), status: 'error', details: String(err) });
        }
      }
    }
    return results;
  }

  public async testChat(
    botConfig: Record<string, unknown>,
    message: string,
    history: unknown[] = []
  ): Promise<string> {
    const providers = await getLlmProvider();
    const provider =
      providers.find((p) => p.name === (botConfig.llmProvider as string)) || providers[0];

    if (!provider) {
      throw new Error('No LLM available');
    }

    return await provider.generateChatCompletion(message, history as any[], {
      systemPrompt: (botConfig.systemInstruction as string) || '',
    });
  }

  public sanitizeBotForExport(bot: Record<string, unknown> | BotInstance): Record<string, unknown> {
    const { envOverrides: _envOverrides, ...rest } = bot as any;
    const sensitiveKeys = [
      'token',
      'apikey',
      'bottoken',
      'apptoken',
      'signingsecret',
      'accesstoken',
      'secret',
    ];

    const cleanConfig: Record<string, unknown> = {};
    if (rest.config && typeof rest.config === 'object') {
      for (const [k, v] of Object.entries(rest.config as Record<string, unknown>)) {
        if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
          cleanConfig[k] = '***REDACTED***';
        } else {
          cleanConfig[k] = v;
        }
      }
    }
    return { ...rest, config: cleanConfig };
  }
}
