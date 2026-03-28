/**
 * Integration test: tool pipeline.
 *
 * Tests the full flow: discover tools -> LLM with tool definitions ->
 * execute tool calls -> feed results back -> get final response.
 * All external services are mocked.
 */

/* ---------- types --------------------------------------------------------- */

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface LLMResponse {
  text: string;
  toolCalls?: ToolCall[];
}

interface ToolManager {
  discoverTools(): Promise<ToolDefinition[]>;
  executeTool(name: string, args: Record<string, any>): Promise<any>;
  formatToolsForLLM(tools: ToolDefinition[]): any[];
}

interface LLMProvider {
  generateChatCompletionWithTools(
    messages: Array<{ role: string; content: string }>,
    tools: any[],
    options: any
  ): Promise<LLMResponse>;
}

/* ---------- inline pipeline implementation -------------------------------- */

async function toolAugmentedPipeline(options: {
  toolManager: ToolManager;
  llmProvider: LLMProvider;
  userMessage: string;
  systemPrompt: string;
  maxTurns?: number;
}): Promise<{ response: string; toolsUsed: string[]; turns: number }> {
  const { toolManager, llmProvider, userMessage, systemPrompt, maxTurns = 5 } = options;

  // Step 1: Discover available tools
  const tools = await toolManager.discoverTools();
  const formattedTools = toolManager.formatToolsForLLM(tools);

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const toolsUsed: string[] = [];
  let turns = 0;

  while (turns < maxTurns) {
    turns++;

    const response = await llmProvider.generateChatCompletionWithTools(messages, formattedTools, {});

    // No tool calls — done
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return { response: response.text, toolsUsed, turns };
    }

    // Execute tool calls
    messages.push({ role: 'assistant', content: JSON.stringify(response.toolCalls) });

    for (const tc of response.toolCalls) {
      let result: string;
      try {
        const args = JSON.parse(tc.function.arguments);
        const execResult = await toolManager.executeTool(tc.function.name, args);
        result = typeof execResult === 'string' ? execResult : JSON.stringify(execResult);
        toolsUsed.push(tc.function.name);
      } catch (err: any) {
        result = `Error executing ${tc.function.name}: ${err.message}`;
      }

      messages.push({ role: 'tool', content: result });
    }
  }

  // Max turns reached — get a final response without tools
  const finalResponse = await llmProvider.generateChatCompletionWithTools(messages, [], {});
  return { response: finalResponse.text, toolsUsed, turns };
}

/* ---------- tests --------------------------------------------------------- */

describe('Tool Pipeline Integration', () => {
  let toolManager: jest.Mocked<ToolManager>;
  let llmProvider: jest.Mocked<LLMProvider>;

  const sampleTools: ToolDefinition[] = [
    { name: 'mcp-a__search', description: 'Search the web', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
    { name: 'mcp-a__calc', description: 'Calculator', inputSchema: { type: 'object', properties: { expr: { type: 'string' } } } },
  ];

  beforeEach(() => {
    toolManager = {
      discoverTools: jest.fn().mockResolvedValue(sampleTools),
      executeTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'tool result' }] }),
      formatToolsForLLM: jest.fn().mockReturnValue([
        { type: 'function', function: { name: 'mcp-a__search', description: 'Search the web', parameters: {} } },
        { type: 'function', function: { name: 'mcp-a__calc', description: 'Calculator', parameters: {} } },
      ]),
    };

    llmProvider = {
      generateChatCompletionWithTools: jest.fn().mockResolvedValue({ text: 'Final answer' }),
    };
  });

  /* -- discover tools ----------------------------------------------------- */

  describe('tool discovery', () => {
    it('discovers and formats tools before LLM call', async () => {
      const result = await toolAugmentedPipeline({
        toolManager,
        llmProvider,
        userMessage: 'What is 2+2?',
        systemPrompt: 'You are helpful.',
      });

      expect(toolManager.discoverTools).toHaveBeenCalledTimes(1);
      expect(toolManager.formatToolsForLLM).toHaveBeenCalledWith(sampleTools);
      expect(result.response).toBe('Final answer');
    });
  });

  /* -- LLM with tools → no tool call (passthrough) ----------------------- */

  describe('passthrough (no tool calls)', () => {
    it('returns direct response when LLM does not use tools', async () => {
      const result = await toolAugmentedPipeline({
        toolManager,
        llmProvider,
        userMessage: 'Hello',
        systemPrompt: 'You are helpful.',
      });

      expect(result.response).toBe('Final answer');
      expect(result.toolsUsed).toEqual([]);
      expect(result.turns).toBe(1);
      expect(toolManager.executeTool).not.toHaveBeenCalled();
    });
  });

  /* -- single tool call --------------------------------------------------- */

  describe('single tool call', () => {
    it('executes tool and feeds result back to LLM', async () => {
      llmProvider.generateChatCompletionWithTools
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc1', function: { name: 'mcp-a__search', arguments: '{"q":"weather NYC"}' } }],
        })
        .mockResolvedValueOnce({ text: 'The weather in NYC is sunny.' });

      const result = await toolAugmentedPipeline({
        toolManager,
        llmProvider,
        userMessage: 'What is the weather in NYC?',
        systemPrompt: 'You are helpful.',
      });

      expect(toolManager.executeTool).toHaveBeenCalledWith('mcp-a__search', { q: 'weather NYC' });
      expect(result.toolsUsed).toEqual(['mcp-a__search']);
      expect(result.response).toBe('The weather in NYC is sunny.');
      expect(result.turns).toBe(2);
    });
  });

  /* -- multi tool call ---------------------------------------------------- */

  describe('multiple tool calls in one turn', () => {
    it('executes multiple tools and feeds all results back', async () => {
      llmProvider.generateChatCompletionWithTools
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [
            { id: 'tc1', function: { name: 'mcp-a__search', arguments: '{"q":"news"}' } },
            { id: 'tc2', function: { name: 'mcp-a__calc', arguments: '{"expr":"100/4"}' } },
          ],
        })
        .mockResolvedValueOnce({ text: 'Here are the results.' });

      toolManager.executeTool
        .mockResolvedValueOnce('Breaking news...')
        .mockResolvedValueOnce('25');

      const result = await toolAugmentedPipeline({
        toolManager,
        llmProvider,
        userMessage: 'Get news and calculate',
        systemPrompt: 'You are helpful.',
      });

      expect(toolManager.executeTool).toHaveBeenCalledTimes(2);
      expect(result.toolsUsed).toEqual(['mcp-a__search', 'mcp-a__calc']);
      expect(result.response).toBe('Here are the results.');
    });
  });

  /* -- multi-turn tool use ------------------------------------------------ */

  describe('multi-turn tool use', () => {
    it('handles sequential tool calls across turns', async () => {
      llmProvider.generateChatCompletionWithTools
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc1', function: { name: 'mcp-a__search', arguments: '{"q":"step1"}' } }],
        })
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc2', function: { name: 'mcp-a__calc', arguments: '{"expr":"step2"}' } }],
        })
        .mockResolvedValueOnce({ text: 'Final multi-turn result' });

      toolManager.executeTool
        .mockResolvedValueOnce('step1-result')
        .mockResolvedValueOnce('step2-result');

      const result = await toolAugmentedPipeline({
        toolManager,
        llmProvider,
        userMessage: 'Complex task',
        systemPrompt: 'You are helpful.',
      });

      expect(result.turns).toBe(3);
      expect(result.toolsUsed).toEqual(['mcp-a__search', 'mcp-a__calc']);
      expect(result.response).toBe('Final multi-turn result');
    });
  });

  /* -- max turns cap ------------------------------------------------------ */

  describe('max turns cap', () => {
    it('stops after maxTurns and gets a summary response', async () => {
      llmProvider.generateChatCompletionWithTools.mockImplementation((_msgs, tools) => {
        if (tools && tools.length > 0) {
          return Promise.resolve({
            text: '',
            toolCalls: [{ id: `tc-${Date.now()}`, function: { name: 'mcp-a__search', arguments: '{}' } }],
          });
        }
        return Promise.resolve({ text: 'Summary after cap' });
      });

      toolManager.executeTool.mockResolvedValue('result');

      const result = await toolAugmentedPipeline({
        toolManager,
        llmProvider,
        userMessage: 'Loop',
        systemPrompt: 'You are helpful.',
        maxTurns: 2,
      });

      expect(result.turns).toBe(2);
      expect(result.response).toBe('Summary after cap');
    });
  });

  /* -- error handling ----------------------------------------------------- */

  describe('error handling', () => {
    it('feeds tool execution error back to LLM', async () => {
      llmProvider.generateChatCompletionWithTools
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc1', function: { name: 'mcp-a__search', arguments: '{"q":"fail"}' } }],
        })
        .mockResolvedValueOnce({ text: 'Search failed, sorry.' });

      toolManager.executeTool.mockRejectedValue(new Error('MCP server unreachable'));

      const result = await toolAugmentedPipeline({
        toolManager,
        llmProvider,
        userMessage: 'Search for something',
        systemPrompt: 'You are helpful.',
      });

      // The error message should have been passed to LLM as tool result
      const lastCallMessages = llmProvider.generateChatCompletionWithTools.mock.calls[1][0];
      const toolResultMsg = lastCallMessages.find((m: any) => m.role === 'tool');
      expect(toolResultMsg.content).toContain('Error executing mcp-a__search');

      expect(result.response).toBe('Search failed, sorry.');
    });

    it('propagates tool discovery failure', async () => {
      toolManager.discoverTools.mockRejectedValue(new Error('All providers down'));

      await expect(
        toolAugmentedPipeline({
          toolManager,
          llmProvider,
          userMessage: 'Hello',
          systemPrompt: 'You are helpful.',
        })
      ).rejects.toThrow('All providers down');
    });

    it('propagates LLM failure', async () => {
      llmProvider.generateChatCompletionWithTools.mockRejectedValue(new Error('LLM timeout'));

      await expect(
        toolAugmentedPipeline({
          toolManager,
          llmProvider,
          userMessage: 'Hello',
          systemPrompt: 'You are helpful.',
        })
      ).rejects.toThrow('LLM timeout');
    });
  });
});
