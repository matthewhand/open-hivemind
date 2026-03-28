/**
 * Unit tests for ToolManager service.
 *
 * Tests tool aggregation across providers, execution routing,
 * formatToolsForLLM, timeout handling, and error isolation.
 */

/* ---------- types --------------------------------------------------------- */

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

interface IToolProvider {
  id: string;
  label: string;
  type: 'tool';
  listTools(): Promise<ToolDefinition[]>;
  executeTool(name: string, args?: Record<string, any>): Promise<any>;
  healthCheck(): Promise<{ ok: boolean; error?: string }>;
  disconnect(): Promise<void>;
}

/* ---------- inline reference implementation -------------------------------- */

class ToolManager {
  private providers: Map<string, IToolProvider> = new Map();
  private toolOwnership: Map<string, string> = new Map(); // toolName -> providerId
  private defaultTimeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    this.defaultTimeoutMs = options?.timeoutMs ?? 30_000;
  }

  registerProvider(provider: IToolProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IToolProvider | undefined {
    return this.providers.get(id);
  }

  async discoverTools(): Promise<ToolDefinition[]> {
    const allTools: ToolDefinition[] = [];
    const errors: Array<{ providerId: string; error: string }> = [];

    for (const [id, provider] of this.providers) {
      try {
        const tools = await provider.listTools();
        for (const tool of tools) {
          const qualifiedName = `${id}__${tool.name}`;
          this.toolOwnership.set(qualifiedName, id);
          allTools.push({ ...tool, name: qualifiedName });
        }
      } catch (err: any) {
        errors.push({ providerId: id, error: err.message });
      }
    }

    if (errors.length > 0 && allTools.length === 0) {
      throw new Error(`All tool providers failed: ${errors.map((e) => e.error).join('; ')}`);
    }

    return allTools;
  }

  async executeTool(qualifiedName: string, args: Record<string, any> = {}): Promise<any> {
    const providerId = this.toolOwnership.get(qualifiedName);
    if (!providerId) throw new Error(`Unknown tool: ${qualifiedName}`);

    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider '${providerId}' not found`);

    const originalName = qualifiedName.replace(`${providerId}__`, '');

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tool '${qualifiedName}' timed out after ${this.defaultTimeoutMs}ms`)), this.defaultTimeoutMs)
    );

    return Promise.race([provider.executeTool(originalName, args), timeoutPromise]);
  }

  formatToolsForLLM(tools: ToolDefinition[]): Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, any> } }> {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.providers.values()).map((p) =>
      p.disconnect().catch(() => {})
    );
    await Promise.all(promises);
  }
}

/* ---------- tests --------------------------------------------------------- */

describe('ToolManager', () => {
  let manager: ToolManager;
  let providerA: jest.Mocked<IToolProvider>;
  let providerB: jest.Mocked<IToolProvider>;

  beforeEach(() => {
    providerA = {
      id: 'mcp-a',
      label: 'MCP A',
      type: 'tool',
      listTools: jest.fn().mockResolvedValue([
        { name: 'search', description: 'Search', inputSchema: { type: 'object' } },
        { name: 'calc', description: 'Calculate', inputSchema: { type: 'object' } },
      ]),
      executeTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'result-a' }] }),
      healthCheck: jest.fn().mockResolvedValue({ ok: true }),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    providerB = {
      id: 'mcp-b',
      label: 'MCP B',
      type: 'tool',
      listTools: jest.fn().mockResolvedValue([
        { name: 'weather', description: 'Get weather', inputSchema: { type: 'object' } },
      ]),
      executeTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'result-b' }] }),
      healthCheck: jest.fn().mockResolvedValue({ ok: true }),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    manager = new ToolManager({ timeoutMs: 500 });
    manager.registerProvider(providerA);
    manager.registerProvider(providerB);
  });

  /* -- tool aggregation --------------------------------------------------- */

  describe('discoverTools', () => {
    it('aggregates tools from all providers with qualified names', async () => {
      const tools = await manager.discoverTools();
      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual(['mcp-a__search', 'mcp-a__calc', 'mcp-b__weather']);
    });

    it('continues when one provider fails (partial success)', async () => {
      providerA.listTools.mockRejectedValue(new Error('offline'));
      const tools = await manager.discoverTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('mcp-b__weather');
    });

    it('throws when ALL providers fail', async () => {
      providerA.listTools.mockRejectedValue(new Error('fail-a'));
      providerB.listTools.mockRejectedValue(new Error('fail-b'));
      await expect(manager.discoverTools()).rejects.toThrow('All tool providers failed');
    });

    it('returns empty array when no providers registered', async () => {
      const empty = new ToolManager();
      const tools = await empty.discoverTools();
      expect(tools).toEqual([]);
    });
  });

  /* -- execution routing -------------------------------------------------- */

  describe('executeTool', () => {
    it('routes to correct provider', async () => {
      await manager.discoverTools();
      const result = await manager.executeTool('mcp-a__search', { q: 'hello' });
      expect(providerA.executeTool).toHaveBeenCalledWith('search', { q: 'hello' });
      expect(result.content[0].text).toBe('result-a');
    });

    it('routes to provider B', async () => {
      await manager.discoverTools();
      const result = await manager.executeTool('mcp-b__weather', { city: 'NYC' });
      expect(providerB.executeTool).toHaveBeenCalledWith('weather', { city: 'NYC' });
      expect(result.content[0].text).toBe('result-b');
    });

    it('throws for unknown tool', async () => {
      await expect(manager.executeTool('unknown__tool')).rejects.toThrow('Unknown tool');
    });

    it('defaults to empty args', async () => {
      await manager.discoverTools();
      await manager.executeTool('mcp-a__calc');
      expect(providerA.executeTool).toHaveBeenCalledWith('calc', {});
    });
  });

  /* -- timeout ------------------------------------------------------------ */

  describe('timeout', () => {
    it('rejects when tool exceeds timeout', async () => {
      await manager.discoverTools();
      providerA.executeTool.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('late'), 2000))
      );
      await expect(manager.executeTool('mcp-a__search')).rejects.toThrow('timed out');
    });
  });

  /* -- formatToolsForLLM -------------------------------------------------- */

  describe('formatToolsForLLM', () => {
    it('formats tools in OpenAI function-calling schema', async () => {
      const tools = await manager.discoverTools();
      const formatted = manager.formatToolsForLLM(tools);
      expect(formatted).toHaveLength(3);
      expect(formatted[0]).toEqual({
        type: 'function',
        function: {
          name: 'mcp-a__search',
          description: 'Search',
          parameters: { type: 'object' },
        },
      });
    });

    it('returns empty array for empty tools', () => {
      expect(manager.formatToolsForLLM([])).toEqual([]);
    });
  });

  /* -- error isolation ---------------------------------------------------- */

  describe('error isolation', () => {
    it('provider error does not affect other providers', async () => {
      providerA.executeTool.mockRejectedValue(new Error('provider A down'));
      await manager.discoverTools();

      await expect(manager.executeTool('mcp-a__search')).rejects.toThrow('provider A down');
      // Provider B still works
      const result = await manager.executeTool('mcp-b__weather');
      expect(result.content[0].text).toBe('result-b');
    });
  });

  /* -- disconnectAll ------------------------------------------------------ */

  describe('disconnectAll', () => {
    it('disconnects all providers', async () => {
      await manager.disconnectAll();
      expect(providerA.disconnect).toHaveBeenCalled();
      expect(providerB.disconnect).toHaveBeenCalled();
    });

    it('swallows disconnect errors', async () => {
      providerA.disconnect.mockRejectedValue(new Error('fail'));
      await expect(manager.disconnectAll()).resolves.not.toThrow();
    });
  });
});
