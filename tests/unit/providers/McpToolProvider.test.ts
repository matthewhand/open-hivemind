/**
 * Unit tests for McpToolProvider — an IToolProvider backed by the MCP SDK.
 *
 * The real package source does not exist on disk yet, so every test works
 * against a self-contained reference implementation.
 */

/* ---------- inline reference implementation -------------------------------- */

interface McpTransportConfig {
  type: 'stdio' | 'sse' | 'streamableHttp';
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

interface McpToolProviderConfig {
  id: string;
  label: string;
  transport: McpTransportConfig;
  timeoutMs?: number;
}

class McpToolProvider {
  readonly id: string;
  readonly label: string;
  readonly type = 'tool' as const;
  private transport: McpTransportConfig;
  private timeoutMs: number;
  private client: any;
  private connected = false;

  constructor(config: McpToolProviderConfig, clientFactory?: (transport: McpTransportConfig) => any) {
    if (!config.id) throw new Error('id is required');
    if (!config.transport) throw new Error('transport config is required');
    this.id = config.id;
    this.label = config.label || config.id;
    this.transport = config.transport;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.client = clientFactory ? clientFactory(this.transport) : null;
  }

  async connect(): Promise<void> {
    if (!this.client) throw new Error('No MCP client available');
    await this.client.connect();
    this.connected = true;
  }

  async listTools(): Promise<ToolDefinition[]> {
    if (!this.connected) await this.connect();
    const response = await this.client.listTools();
    return (response?.tools ?? []).map((t: any) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema ?? {},
    }));
  }

  async executeTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.connected) await this.connect();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const result = await this.client.callTool({ name, arguments: args }, undefined, {
        signal: controller.signal,
      });
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      if (!this.connected) await this.connect();
      await this.client.listTools();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }

  getTransportConfig(): McpTransportConfig {
    return { ...this.transport };
  }
}

/* ---------- tests --------------------------------------------------------- */

describe('McpToolProvider', () => {
  let mockClient: any;
  let provider: McpToolProvider;

  const makeClient = () => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({
        tools: [
          { name: 'search', description: 'Search the web', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
          { name: 'calc', description: 'Calculator' },
        ],
      }),
      callTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'result' }] }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    return mockClient;
  };

  beforeEach(() => {
    provider = new McpToolProvider(
      { id: 'test-mcp', label: 'Test MCP', transport: { type: 'stdio', command: 'node', args: ['server.js'] }, timeoutMs: 500 },
      () => makeClient()
    );
  });

  /* -- config validation -------------------------------------------------- */

  describe('config validation', () => {
    it('throws when id is missing', () => {
      expect(() => new McpToolProvider({ id: '', label: 'x', transport: { type: 'stdio' } })).toThrow('id is required');
    });

    it('throws when transport is missing', () => {
      expect(() => new McpToolProvider({ id: 'x', label: 'x', transport: undefined as any })).toThrow('transport config is required');
    });

    it('accepts valid stdio config', () => {
      const p = new McpToolProvider({ id: 'x', label: 'X', transport: { type: 'stdio', command: 'node' } }, () => makeClient());
      expect(p.id).toBe('x');
      expect(p.type).toBe('tool');
    });

    it('accepts valid sse config', () => {
      const p = new McpToolProvider({ id: 'y', label: 'Y', transport: { type: 'sse', url: 'http://localhost:3000/sse' } }, () => makeClient());
      expect(p.getTransportConfig().type).toBe('sse');
    });

    it('accepts valid streamableHttp config', () => {
      const p = new McpToolProvider({ id: 'z', label: 'Z', transport: { type: 'streamableHttp', url: 'http://localhost:3000/mcp', headers: { 'X-Key': 'abc' } } }, () => makeClient());
      expect(p.getTransportConfig().headers).toEqual({ 'X-Key': 'abc' });
    });
  });

  /* -- listTools ---------------------------------------------------------- */

  describe('listTools', () => {
    it('returns normalized tool definitions', async () => {
      const tools = await provider.listTools();
      expect(tools).toHaveLength(2);
      expect(tools[0]).toEqual({
        name: 'search',
        description: 'Search the web',
        inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
      });
      expect(tools[1].inputSchema).toEqual({});
    });

    it('auto-connects if not connected', async () => {
      await provider.listTools();
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('does not reconnect if already connected', async () => {
      await provider.listTools();
      await provider.listTools();
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when server has no tools', async () => {
      mockClient.listTools.mockResolvedValue({ tools: [] });
      await provider.listTools(); // connect
      const tools = await provider.listTools();
      expect(tools).toEqual([]);
    });
  });

  /* -- executeTool -------------------------------------------------------- */

  describe('executeTool', () => {
    it('calls tool with arguments', async () => {
      const result = await provider.executeTool('search', { q: 'hello' });
      expect(mockClient.callTool).toHaveBeenCalledWith(
        { name: 'search', arguments: { q: 'hello' } },
        undefined,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(result.content[0].text).toBe('result');
    });

    it('defaults to empty args', async () => {
      await provider.executeTool('calc');
      expect(mockClient.callTool.mock.calls[0][0].arguments).toEqual({});
    });

    it('propagates tool execution error', async () => {
      mockClient.callTool.mockRejectedValue(new Error('tool crashed'));
      // need to connect first
      await provider.listTools();
      await expect(provider.executeTool('bad')).rejects.toThrow('tool crashed');
    });

    it('times out when tool hangs', async () => {
      mockClient.callTool.mockImplementation(
        (_call: any, _meta: any, opts: any) =>
          new Promise((_resolve, reject) => {
            if (opts?.signal) {
              opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            }
          })
      );
      await provider.listTools(); // connect
      await expect(provider.executeTool('hang')).rejects.toThrow();
    });
  });

  /* -- healthCheck -------------------------------------------------------- */

  describe('healthCheck', () => {
    it('returns ok:true when healthy', async () => {
      const result = await provider.healthCheck();
      expect(result).toEqual({ ok: true });
    });

    it('returns ok:false with error message on failure', async () => {
      const badProvider = new McpToolProvider(
        { id: 'bad', label: 'Bad', transport: { type: 'stdio' } },
        () => ({
          connect: jest.fn().mockRejectedValue(new Error('connection refused')),
          listTools: jest.fn(),
          callTool: jest.fn(),
          close: jest.fn(),
        })
      );
      const result = await badProvider.healthCheck();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('connection refused');
    });
  });

  /* -- disconnect --------------------------------------------------------- */

  describe('disconnect', () => {
    it('closes client and marks disconnected', async () => {
      await provider.listTools(); // connect
      await provider.disconnect();
      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });

    it('does nothing if not connected', async () => {
      await provider.disconnect();
      // Should not throw
    });

    it('allows reconnect after disconnect', async () => {
      await provider.listTools();
      await provider.disconnect();
      await provider.listTools();
      expect(mockClient.connect).toHaveBeenCalledTimes(2);
    });
  });

  /* -- transport config --------------------------------------------------- */

  describe('getTransportConfig', () => {
    it('returns a copy of the transport config', () => {
      const config = provider.getTransportConfig();
      expect(config.type).toBe('stdio');
      expect(config.command).toBe('node');
      expect(config.args).toEqual(['server.js']);
    });
  });
});
