/**
 * OpenAiService provides a singleton interface for interacting with the OpenAI API.
 * It includes functionality for generating chat completions, checking service status,
 * and listing available models. Configuration details are retrieved from external
 * configuration sources like 'openaiConfig' and 'llmConfig'.
 */
import Debug from 'debug';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
import { OpenAI, ClientOptions } from 'openai';
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import openaiConfig from '@config/openaiConfig';
import llmConfig from '@config/llmConfig';
import { listModels } from './operations/listModels';
import { IMessage } from '@src/message/interfaces/IMessage';
import {
  OpenAIChatCompletionResponse,
  OpenAIModelsListResponse,
  OpenHivemindChatResponse,
  OpenAIError
} from '@src/types/openai';
import { ConfigurationError } from '@src/types/errorClasses';

const debug = Debug('app:OpenAiService');

// Guard: Validate openaiConfig object
if (!openaiConfig || typeof openaiConfig.get !== 'function') {
  throw new ConfigurationError('Invalid OpenAI configuration: expected an object with a get method.', 'OPENAI_CONFIG_VALIDATION_ERROR');
}

// Guard: Validate llmConfig object
if (!llmConfig || typeof llmConfig.get !== 'function') {
  throw new ConfigurationError('Invalid LLM configuration: expected an object with a get method.', 'LLM_CONFIG_VALIDATION_ERROR');
}

export class OpenAiService {
  private static instance: OpenAiService;
  public readonly openai: OpenAI;
  private busy: boolean = false;
  private readonly parallelExecution: boolean;
  private readonly finishReasonRetry: string;
  private readonly maxRetries: number;
  private readonly requestTimeout: number;

  /**
   * Private constructor to initialize the OpenAI client and configuration.
   */
  private constructor() {
    debug('[DEBUG] Entering OpenAiService constructor');

    const timeoutValue = Number(openaiConfig.get('OPENAI_TIMEOUT') || 300000);
    this.requestTimeout = timeoutValue;
    debug(`[DEBUG] Request timeout set to ${this.requestTimeout} ms`);

    const options: ClientOptions = {
      apiKey: String(openaiConfig.get('OPENAI_API_KEY') || ''),
      organization: String(openaiConfig.get('OPENAI_ORGANIZATION') || ''),
      baseURL: String(openaiConfig.get('OPENAI_BASE_URL') || 'https://api.openai.com'),
      timeout: timeoutValue,
    };

    debug('[DEBUG] OpenAI ClientOptions:', {
      apiKey: this.redactApiKeyForLogging(String(options.apiKey)),
      organization: options.organization,
      baseURL: options.baseURL,
      timeout: options.timeout
    });

    // Initialize OpenAI client
    this.openai = new OpenAI(options);
    debug('[DEBUG] OpenAI client initialized successfully');

    this.parallelExecution = llmConfig.get('LLM_PARALLEL_EXECUTION') === true; // Explicitly check for boolean
    debug(`[DEBUG] Parallel execution: ${this.parallelExecution}`);

    this.finishReasonRetry = openaiConfig.get('OPENAI_FINISH_REASON_RETRY') || 'stop';
    debug(`[DEBUG] Finish reason retry set to: ${this.finishReasonRetry}`);

    this.maxRetries = Number(openaiConfig.get('OPENAI_MAX_RETRIES') || 3);
    debug(`[DEBUG] Max retries set to: ${this.maxRetries}`);

    debug('[DEBUG] OpenAiService constructor complete');
  }

  /**
   * Singleton pattern to get the instance of OpenAiService.
   */
  public static getInstance(): OpenAiService {
    debug('[DEBUG] getInstance called');
    if (!OpenAiService.instance) {
      debug('[DEBUG] No instance found, creating new one');
      OpenAiService.instance = new OpenAiService();
    } else {
      debug('[DEBUG] Returning existing instance');
    }
    return OpenAiService.instance;
  }

  /**
   * Checks whether the service is currently busy processing requests.
   */
  public isBusy(): boolean {
    debug(`[DEBUG] isBusy called, returning: ${this.busy}`);
    return this.busy;
  }

  /**
   * Sets the busy status of the service.
   * @param status - True to set the service as busy, false to set it as idle.
   */
  public setBusy(status: boolean): void {
    debug(`[DEBUG] setBusy called with status: ${status}`);
    this.busy = status;
  }

  /**
   * Generates a chat completion from OpenAI based on the user's message and history.
   * Instead of returning just a string, this method returns an object with two properties:
   *  - text: the generated response content.
   *  - context_variables: an object that includes active_agent_name (if available).
   *
   * @param message - The user's input message.
   * @param historyMessages - Previous chat messages.
   * @param systemMessageContent - A system-level message to initialize the chat context.
   * @param maxTokens - Maximum number of tokens for the response (default: 150).
   * @param temperature - Controls randomness in the response (default: 0.7).
   * @returns {Promise<OpenHivemindChatResponse>} The generated chat completion response object.
   */
  public async generateChatCompletion(
    message: string,
    historyMessages: IMessage[],
    systemMessageContent: string = String(openaiConfig.get('OPENAI_SYSTEM_PROMPT') || ''),
    maxTokens: number = Number(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS') || 150),
    temperature: number = Number(openaiConfig.get('OPENAI_TEMPERATURE') || 0.7)
  ): Promise<OpenHivemindChatResponse> {
    debug('[DEBUG] generateChatCompletion called');
    debug('[DEBUG] Input parameters:', { message, systemMessageContent, maxTokens, temperature });
    debug('[DEBUG] History messages count:', historyMessages.length);

    const fullMetadata = {
      workspaceInfo: {
        workspaceId: "T123456",
        workspaceName: "ENAB101"
      },
      channelInfo: {
        channelId: "C123456",
        channelName: "lecture-1",
        description: "Writing academically tips",
        createdDate: "2025-01-01T09:00:00Z"
      },
      threadInfo: {
        isThread: true,
        threadTs: "1692302345.2345",
        threadOwnerUserId: "U999999",
        threadParticipants: ["U999999", "U123456"],
        messageCount: 4
      },
      slackUser: {
        slackUserId: "U123456",
        userName: "jane_student",
        email: "jane@example.edu",
        preferredName: "Jane",
        isStaff: false,
        dateOfBirth: "2000-05-10",
        userCreatedDate: "2024-01-15T10:00:00Z"
      },
      studentCourseAttempt: {
        courseCd: "ENAB101",
        courseVersionNumber: 1,
        courseStatus: "ENROLLED",
        commencedDate: "2024-02-01T00:00:00Z",
        course: {
          courseCd: "ENAB101",
          versionNumber: 1,
          courseType: "Diploma",
          title: "Enabling Learning Strategies",
          courseStatus: "ACTIVE",
          creditPoints: 12
        }
      },
      unitAttempts: {
        unitAttempt: [
          {
            courseCd: "ENAB101",
            unitAttemptStatus: "ENROLLED",
            outcomeDate: null,
            grade: null,
            mark: null,
            enrolledUnit: {
              unitCd: "ENAB101-01",
              version: 1,
              title: "Academic Writing Basics",
              creditPoints: 3,
              unitStatus: "active"
            }
          }
        ]
      },
      learningCanvas: {
        title: "How to write academically",
        description: "Guidelines for academic style",
        contentUrl: "https://une-n70.slack.com/canvas/C07GNG6MAV9"
      },
      messageAttachments: [
        {
          id: 9999,
          fileName: "example.pdf",
          fileType: "pdf",
          url: "https://une-n70.slack.com/files/U07GNGXLMGB/F082J4FFNA1/usyd_ai_policy_change.pdf",
          size: 2048
        }
      ],
      messageReactions: [
        {
          reaction: "thumbsup",
          reactedUserId: "U999999",
          messageId: 999999,
          messageChannelId: "C123456"
        }
      ]
    };

    const conversationId = "conversation-id-string-less-than-40-char";
    const toolCallId = "matches-tool_call_id-in-tool-message";

    const chatParams: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessageContent },
      { role: 'user', content: message },
      ...historyMessages.map((msg) => ({
        role: msg.isFromBot() ? ('assistant' as const) : ('user' as const),
        content: msg.getText() || ""
      })),
      {
        role: 'assistant',
        content: "",
        tool_calls: [
          {
            id: toolCallId,
            type: "function",
            function: {
              name: "metadata_for_conversation",
              arguments: conversationId
            }
          }
        ]
      },
      {
        role: 'tool',
        tool_call_id: toolCallId,
        content: JSON.stringify(fullMetadata)
      }
    ];

    console.debug('[DEBUG] Chat parameters:', JSON.stringify(chatParams, null, 2));

    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.openai.chat.completions.create({
          model: openaiConfig.get('OPENAI_MODEL') || 'gpt-4o',
          messages: chatParams,
          max_tokens: maxTokens,
          temperature,
          stream: false
        });
      });

      debug('[DEBUG] OpenAI API response received:', redactSensitiveInfo('response', JSON.stringify(response)));

      const choice = response.choices && response.choices[0];
      debug('[DEBUG] Raw first choice:', JSON.stringify(choice));

      let content = choice?.message?.content || "";
      debug('[DEBUG] Extracted content from choices:', content);

      if (!content && (response as any).full_response && Array.isArray((response as any).full_response.messages)) {
        const messages = (response as any).full_response.messages;
        debug('[DEBUG] Iterating through full_response.messages for assistant content. Total messages:', messages.length);
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          debug(`[DEBUG] Checking message at index ${i}: role=${msg.role}, content="${msg.content}"`);
          if (msg.role !== 'assistant') {
            debug(`[DEBUG] Encountered non-assistant message at index ${i}; stopping iteration.`);
            break;
          }
          if (msg.content && msg.content.trim().length > 0) {
            content = msg.content;
            debug(`[DEBUG] Found assistant message content at index ${i}: ${content}`);
            break;
          }
        }
      }

      debug('[DEBUG] Final extracted content:', content);

      // --- Attach agent metadata ---
      let activeAgentName: string | undefined;
      if ((response as any).full_response && (response as any).full_response.agent && (response as any).full_response.agent.name) {
        activeAgentName = (response as any).full_response.agent.name;
      }

      return {
        text: content,
        context_variables: { active_agent_name: activeAgentName }
      };
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('[DEBUG] Error generating chat completion:', { message, historyMessages, error: ErrorUtils.getMessage(hivemindError) });
      throw hivemindError;
    }
  }

  /**
   * Generates a chat response using OpenAI, passthrough to generateChatCompletion.
   */
  public async generateChatResponse(
    message: string,
    historyMessages: IMessage[],
    systemMessageContent: string = String(openaiConfig.get('OPENAI_SYSTEM_PROMPT') || ''),
    maxTokens: number = Number(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS') || 150),
    temperature: number = Number(openaiConfig.get('OPENAI_TEMPERATURE') || 0.7)
  ): Promise<OpenHivemindChatResponse> {
    debug('[DEBUG] generateChatResponse called');
    return this.generateChatCompletion(message, historyMessages, systemMessageContent, maxTokens, temperature);
  }

  /**
   * Lists available OpenAI models by invoking the OpenAI API.
   */
  public async listModels(): Promise<OpenAIModelsListResponse> {
    debug('[DEBUG] listModels called');
    try {
      const models = await listModels(this.openai);
      debug('[DEBUG] Models retrieved:', models);
      return models;
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('[DEBUG] Error listing models:', ErrorUtils.getMessage(hivemindError));
      throw hivemindError;
    }
  }

  /**
   * Retry with exponential backoff and jitter for rate limits and transient errors
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        const errorType = this.classifyError(hivemindError);
        
        if (errorType === 'fatal' || attempt === this.maxRetries) {
          throw hivemindError;
        }
        
        if (errorType === 'rate-limit' || errorType === 'transient') {
          const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
          debug(`[DEBUG] Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw hivemindError;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Classify errors as rate-limit, transient, or fatal
   */
  private classifyError(error: HivemindError): 'rate-limit' | 'transient' | 'fatal' {
    const statusCode = ErrorUtils.getStatusCode(error);
    const errorCode = ErrorUtils.getCode(error);

    if (statusCode === 429) return 'rate-limit';
    if (statusCode && statusCode >= 500 && statusCode < 600) return 'transient';
    if (errorCode === 'ECONNRESET' || errorCode === 'ETIMEDOUT') return 'transient';
    return 'fatal';
  }

  /**
   * Redacts the OpenAI API key for logging purposes.
   */
  private redactApiKeyForLogging(key: string): string {
    debug('[DEBUG] redactApiKeyForLogging called');
    if (debug.enabled) {
      const redacted = redactSensitiveInfo('OPENAI_API_KEY', key);
      debug('[DEBUG] Redacted API key:', redacted);
      return redacted;
    }
    return key;
  }
}

export default OpenAiService.getInstance();
