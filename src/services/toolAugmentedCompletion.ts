import Debug from 'debug';
import { ToolManager, type OpenAITool, type ToolResult } from './ToolManager';

const debug = Debug('app:toolAugmentedCompletion');

/** A single tool call as returned by the LLM. */
interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Minimal chat message shape used for multi-turn tool conversations. */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Performs a chat completion that supports tool use. If the bot has tools
 * configured, they are included in the request and tool calls are executed
 * in a loop until the model produces a final text response (or the safety
 * cap is reached).
 *
 * Falls back to plain `generateChatCompletion` when the bot has no tools.
 */
export async function toolAugmentedCompletion(opts: {
  botName: string;
  llmProvider: any;
  userMessage: string;
  historyMessages: any[];
  metadata: Record<string, any>;
  systemPrompt: string;
  /** Extra context forwarded to tool execution for guard checks. */
  toolContext?: {
    userId?: string;
    channelId?: string;
    messageProvider?: string;
    forumId?: string;
    forumOwnerId?: string;
  };
}): Promise<string> {
  const {
    botName,
    llmProvider,
    userMessage,
    historyMessages,
    metadata,
    systemPrompt,
    toolContext,
  } = opts;

  const toolManager = ToolManager.getInstance();
  const tools = await toolManager.getToolsForBot(botName);

  // If no tools are available, fall back to the standard path.
  if (tools.length === 0) {
    debug(`No tools for bot "${botName}", using standard completion`);
    return llmProvider.generateChatCompletion(userMessage, historyMessages, metadata);
  }

  debug(`Bot "${botName}" has ${tools.length} tools — entering tool-augmented flow`);

  // We need to call the OpenAI-compatible API directly with tool definitions.
  // The ILlmProvider interface doesn't expose tool calling, so we reconstruct
  // the request using the provider's config context (passed via metadata) and
  // OpenAI SDK or axios.
  const openAITools = toolManager.formatToolsForLLM(tools);
  const maxIterations = toolManager.getMaxToolCalls();

  // Build the initial messages array.
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  for (const h of historyMessages) {
    try {
      const role = (h as any).role || 'user';
      const content = typeof h.getText === 'function' ? h.getText() : String(h);
      messages.push({ role, content });
    } catch {
      // skip malformed history entries
    }
  }
  messages.push({ role: 'user', content: userMessage });

  // Tool use loop.
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const assistantMessage = await callLLMWithTools(llmProvider, messages, openAITools, metadata);

    // If the model produced a text reply (no tool calls), we're done.
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      debug(`Tool loop done after ${iteration} tool call(s)`);
      return assistantMessage.content || '';
    }

    // Append the assistant message (with tool_calls) to conversation history.
    messages.push(assistantMessage);

    // Execute each tool call and feed results back.
    for (const toolCall of assistantMessage.tool_calls) {
      const result = await executeToolCall(toolManager, botName, toolCall, toolContext);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: formatToolResultContent(result),
      });
    }
  }

  // Safety cap reached — make one final call without tools to get a text reply.
  debug(`Tool call cap (${maxIterations}) reached for bot "${botName}", requesting final response`);
  const finalMessage = await callLLMWithTools(llmProvider, messages, [], metadata);
  return finalMessage.content || '';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Calls the LLM using the OpenAI SDK (via the provider's existing OpenAI
 * client configuration). Because ILlmProvider doesn't expose tool calling,
 * we dynamically detect if the provider is OpenAI-compatible and reconstruct
 * the call.
 */
async function callLLMWithTools(
  llmProvider: any,
  messages: ChatMessage[],
  tools: OpenAITool[],
  metadata: Record<string, any>
): Promise<ChatMessage> {
  // Strategy: Try to use the OpenAI SDK directly. We load it dynamically
  // to avoid hard coupling. The provider's config tells us the API key
  // and base URL.
  try {
    const { OpenAI } = await import('openai');
    const openaiConfig = (await import('@config/openaiConfig')).default;

    const apiKey =
      metadata?.openaiApiKey || openaiConfig.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;

    const baseURL =
      metadata?.openaiBaseUrl ||
      openaiConfig.get('OPENAI_BASE_URL') ||
      process.env.OPENAI_BASE_URL ||
      'https://api.openai.com/v1';

    const model =
      metadata?.modelOverride ||
      metadata?.model ||
      process.env.OPENAI_MODEL ||
      openaiConfig.get('OPENAI_MODEL') ||
      'gpt-4o';

    const temperature = metadata?.temperature ?? openaiConfig.get('OPENAI_TEMPERATURE') ?? 0.7;
    const maxTokens = metadata?.maxTokens ?? openaiConfig.get('OPENAI_MAX_TOKENS') ?? 150;

    const client = new OpenAI({ apiKey, baseURL });

    const requestBody: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const response = await client.chat.completions.create(requestBody);
    const choice = response.choices[0];

    if (!choice) {
      return { role: 'assistant', content: '' };
    }

    return {
      role: 'assistant',
      content: choice.message.content || null,
      tool_calls: choice.message.tool_calls as LLMToolCall[] | undefined,
    };
  } catch (error) {
    debug('Failed to call LLM with tools:', error);
    // If we can't use the OpenAI SDK path, return empty so the caller
    // can fall through gracefully.
    return { role: 'assistant', content: '' };
  }
}

async function executeToolCall(
  toolManager: ToolManager,
  botName: string,
  toolCall: LLMToolCall,
  context?: {
    userId?: string;
    channelId?: string;
    messageProvider?: string;
    forumId?: string;
    forumOwnerId?: string;
  }
): Promise<ToolResult> {
  const toolName = toolCall.function.name;
  let args: Record<string, unknown> = {};

  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch (parseError) {
    debug(`Failed to parse args for tool "${toolName}":`, parseError);
    return { toolName, success: false, error: 'Invalid tool arguments (malformed JSON)' };
  }

  return toolManager.executeTool(botName, toolName, args, context);
}

function formatToolResultContent(result: ToolResult): string {
  if (!result.success) {
    return JSON.stringify({ error: result.error || 'Tool execution failed' });
  }

  // If the result is already a string, use it directly.
  if (typeof result.result === 'string') {
    return result.result;
  }

  // MCP tool results often come as { content: [{ type, text }] }.
  if (result.result && typeof result.result === 'object') {
    const r = result.result as any;
    if (Array.isArray(r.content)) {
      return r.content
        .map((c: any) => (typeof c.text === 'string' ? c.text : JSON.stringify(c)))
        .join('\n');
    }
  }

  return JSON.stringify(result.result);
}
