/**
 * Unit tests for toolAugmentedCompletion — the service that orchestrates
 * LLM calls with tool use: passthrough (no tools), single/multi tool call,
 * multi-turn, max iterations cap, and error feedback.
 */

/* ---------- types --------------------------------------------------------- */

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface LLMResponse {
  text: string;
  toolCalls?: ToolCall[];
}

interface ToolResult {
  toolCallId: string;
  content: string;
}

/* ---------- inline reference implementation -------------------------------- */

async function toolAugmentedCompletion(options: {
  messages: Array<{ role: string; content: string }>;
  tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: any } }>;
  llmCall: (messages: any[], tools?: any[]) => Promise<LLMResponse>;
  executeTool: (name: string, args: Record<string, any>) => Promise<string>;
  maxIterations?: number;
}): Promise<{ text: string; iterations: number; toolResults: ToolResult[] }> {
  const { messages, tools, llmCall, executeTool, maxIterations = 5 } = options;

  // If no tools provided, passthrough
  if (!tools || tools.length === 0) {
    const response = await llmCall(messages);
    return { text: response.text, iterations: 1, toolResults: [] };
  }

  const conversationMessages = [...messages];
  const allToolResults: ToolResult[] = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const response = await llmCall(conversationMessages, tools);

    // If no tool calls, we're done
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return { text: response.text, iterations, toolResults: allToolResults };
    }

    // Process each tool call
    conversationMessages.push({
      role: 'assistant',
      content: JSON.stringify({ toolCalls: response.toolCalls }),
    });

    for (const tc of response.toolCalls) {
      let resultText: string;
      try {
        const args = JSON.parse(tc.function.arguments);
        resultText = await executeTool(tc.function.name, args);
      } catch (err: any) {
        resultText = `Error: ${err.message}`;
      }

      allToolResults.push({ toolCallId: tc.id, content: resultText });
      conversationMessages.push({
        role: 'tool',
        content: resultText,
      });
    }
  }

  // Hit max iterations — do one final call without tools to get a summary
  const finalResponse = await llmCall(conversationMessages);
  return { text: finalResponse.text, iterations, toolResults: allToolResults };
}

/* ---------- tests --------------------------------------------------------- */

describe('toolAugmentedCompletion', () => {
  const tools = [
    {
      type: 'function' as const,
      function: { name: 'search', description: 'Search', parameters: { type: 'object' } },
    },
    {
      type: 'function' as const,
      function: { name: 'calc', description: 'Calculate', parameters: { type: 'object' } },
    },
  ];

  const messages = [{ role: 'user', content: 'Hello' }];

  /* -- passthrough (no tools) --------------------------------------------- */

  describe('passthrough (no tools)', () => {
    it('returns LLM response directly when no tools provided', async () => {
      const llmCall = jest.fn().mockResolvedValue({ text: 'Direct answer' });
      const executeTool = jest.fn();

      const result = await toolAugmentedCompletion({ messages, llmCall, executeTool });
      expect(result.text).toBe('Direct answer');
      expect(result.iterations).toBe(1);
      expect(result.toolResults).toEqual([]);
      expect(executeTool).not.toHaveBeenCalled();
    });

    it('returns LLM response directly when tools array is empty', async () => {
      const llmCall = jest.fn().mockResolvedValue({ text: 'No tools' });
      const result = await toolAugmentedCompletion({ messages, tools: [], llmCall, executeTool: jest.fn() });
      expect(result.text).toBe('No tools');
    });
  });

  /* -- single tool call --------------------------------------------------- */

  describe('single tool call', () => {
    it('executes one tool then returns final response', async () => {
      const llmCall = jest
        .fn()
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc1', function: { name: 'search', arguments: '{"q":"hello"}' } }],
        })
        .mockResolvedValueOnce({ text: 'Based on search: hello world' });

      const executeTool = jest.fn().mockResolvedValue('search result: hello world');

      const result = await toolAugmentedCompletion({ messages, tools, llmCall, executeTool });
      expect(executeTool).toHaveBeenCalledWith('search', { q: 'hello' });
      expect(result.text).toBe('Based on search: hello world');
      expect(result.iterations).toBe(2);
      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0]).toEqual({ toolCallId: 'tc1', content: 'search result: hello world' });
    });
  });

  /* -- multi tool call (parallel in one turn) ----------------------------- */

  describe('multi tool call', () => {
    it('executes multiple tools in one turn', async () => {
      const llmCall = jest
        .fn()
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [
            { id: 'tc1', function: { name: 'search', arguments: '{"q":"A"}' } },
            { id: 'tc2', function: { name: 'calc', arguments: '{"expr":"1+1"}' } },
          ],
        })
        .mockResolvedValueOnce({ text: 'Combined result' });

      const executeTool = jest
        .fn()
        .mockResolvedValueOnce('result-A')
        .mockResolvedValueOnce('2');

      const result = await toolAugmentedCompletion({ messages, tools, llmCall, executeTool });
      expect(executeTool).toHaveBeenCalledTimes(2);
      expect(result.toolResults).toHaveLength(2);
      expect(result.text).toBe('Combined result');
    });
  });

  /* -- multi-turn --------------------------------------------------------- */

  describe('multi-turn', () => {
    it('handles multiple rounds of tool calls', async () => {
      const llmCall = jest
        .fn()
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc1', function: { name: 'search', arguments: '{"q":"step1"}' } }],
        })
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc2', function: { name: 'calc', arguments: '{"expr":"2+2"}' } }],
        })
        .mockResolvedValueOnce({ text: 'Final after 2 tools' });

      const executeTool = jest.fn().mockResolvedValueOnce('step1-result').mockResolvedValueOnce('4');

      const result = await toolAugmentedCompletion({ messages, tools, llmCall, executeTool });
      expect(result.iterations).toBe(3);
      expect(result.toolResults).toHaveLength(2);
      expect(result.text).toBe('Final after 2 tools');
    });
  });

  /* -- max iterations cap ------------------------------------------------- */

  describe('max iterations cap', () => {
    it('stops after maxIterations and produces final response', async () => {
      const llmCall = jest.fn().mockImplementation((_msgs: any[], tools?: any[]) => {
        if (tools) {
          return Promise.resolve({
            text: '',
            toolCalls: [{ id: `tc-${Date.now()}`, function: { name: 'search', arguments: '{}' } }],
          });
        }
        return Promise.resolve({ text: 'Forced summary' });
      });

      const executeTool = jest.fn().mockResolvedValue('result');

      const result = await toolAugmentedCompletion({
        messages,
        tools,
        llmCall,
        executeTool,
        maxIterations: 3,
      });

      // 3 iterations with tool calls + 1 final call without tools
      expect(result.iterations).toBe(3);
      expect(executeTool).toHaveBeenCalledTimes(3);
      expect(result.text).toBe('Forced summary');
    });
  });

  /* -- error fed back ----------------------------------------------------- */

  describe('error fed back', () => {
    it('feeds tool execution error back to LLM as tool result', async () => {
      const llmCall = jest
        .fn()
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc1', function: { name: 'search', arguments: '{"q":"fail"}' } }],
        })
        .mockResolvedValueOnce({ text: 'I see the search failed' });

      const executeTool = jest.fn().mockRejectedValue(new Error('network error'));

      const result = await toolAugmentedCompletion({ messages, tools, llmCall, executeTool });
      expect(result.toolResults[0].content).toBe('Error: network error');
      expect(result.text).toBe('I see the search failed');
    });

    it('feeds JSON parse error back to LLM', async () => {
      const llmCall = jest
        .fn()
        .mockResolvedValueOnce({
          text: '',
          toolCalls: [{ id: 'tc1', function: { name: 'search', arguments: 'not-json' } }],
        })
        .mockResolvedValueOnce({ text: 'Handled parse error' });

      const executeTool = jest.fn();

      const result = await toolAugmentedCompletion({ messages, tools, llmCall, executeTool });
      expect(result.toolResults[0].content).toContain('Error:');
      expect(result.text).toBe('Handled parse error');
    });

    it('LLM call failure propagates as exception', async () => {
      const llmCall = jest.fn().mockRejectedValue(new Error('LLM down'));
      await expect(
        toolAugmentedCompletion({ messages, tools, llmCall, executeTool: jest.fn() })
      ).rejects.toThrow('LLM down');
    });
  });
});
