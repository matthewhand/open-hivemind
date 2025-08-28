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
import { getEmoji } from '@common/getEmoji';

/**
 * Error classification for retry logic
 */
interface ErrorClassification {
  isRetryable: boolean;
  isRateLimit: boolean;
  isTransient: boolean;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

const debug = Debug('app:OpenAiService');

// Guard: Validate openaiConfig object
if (!openaiConfig || typeof openaiConfig.get !== 'function') {
  throw new Error('Invalid OpenAI configuration: expected an object with a get method.');
}

// Guard: Validate llmConfig object
if (!llmConfig || typeof llmConfig.get !== 'function') {
  throw new Error('Invalid LLM configuration: expected an object with a get method.');
}

export class OpenAiService {
  private static instance: OpenAiService;
  public readonly openai: OpenAI;
  private busy: boolean = false;
  private readonly parallelExecution: boolean;
  private readonly finishReasonRetry: string;
  private readonly maxRetries: number;
  private readonly requestTimeout: number;
  private readonly retryConfig: RetryConfig;

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

    // Initialize retry configuration
    this.retryConfig = {
      maxRetries: this.maxRetries,
      baseDelay: 1000, // 1 second base delay
      maxDelay: 30000, // 30 seconds max delay
      jitterFactor: 0.1 // 10% jitter
    };
    debug(`[DEBUG] Retry config initialized:`, this.retryConfig);

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
   * @returns {Promise<any>} The generated chat completion response object.
   */
  public async generateChatCompletion(
    message: string,
    historyMessages: IMessage[],
    systemMessageContent: string = String(openaiConfig.get('OPENAI_SYSTEM_PROMPT') || ''),
    maxTokens: number = Number(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS') || 150),
    temperature: number = Number(openaiConfig.get('OPENAI_TEMPERATURE') || 0.7)
  ): Promise<any> {
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

    debug('[DEBUG] Chat parameters: %s', JSON.stringify(chatParams, null, 2));

    try {
      const response = await this.executeWithRetry(async () => {
        return await this.openai.chat.completions.create({
          model: openaiConfig.get('OPENAI_MODEL') || 'gpt-4o',
          messages: chatParams,
          max_tokens: maxTokens,
          temperature,
          stream: false
        });
      }, 'generateChatCompletion');

      debug('[DEBUG] OpenAI API response received:', response);

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
    } catch (error: any) {
      const classification = this.classifyError(error);
      debug('[DEBUG] Error generating chat completion:', { 
        message: redactSensitiveInfo('user_message', message), 
        historyCount: historyMessages.length, 
        error: error.message,
        classification
      });
      
      // Provide more specific error messages based on error type
      if (classification.isRateLimit) {
        throw new Error(`Rate limit exceeded. Please try again later. Original error: ${error.message}`);
      } else if (classification.isTransient) {
        throw new Error(`Temporary service error. Please try again. Original error: ${error.message}`);
      } else {
        throw new Error(`Failed to generate chat completion: ${error.message}`);
      }
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
  ): Promise<any> {
    debug('[DEBUG] generateChatResponse called');
    return this.generateChatCompletion(message, historyMessages, systemMessageContent, maxTokens, temperature);
  }

  /**
   * Lists available OpenAI models by invoking the OpenAI API.
   */
  public async listModels(): Promise<any> {
    debug('[DEBUG] listModels called');
    try {
      const models = await this.executeWithRetry(async () => {
        return await listModels(this.openai);
      }, 'listModels');
      debug('[DEBUG] Models retrieved:', models);
      return models;
    } catch (error: any) {
      const classification = this.classifyError(error);
      debug('[DEBUG] Error listing models:', {
        error: error.message,
        classification
      });
      
      // Provide more specific error messages based on error type
      if (classification.isRateLimit) {
        throw new Error(`Rate limit exceeded while listing models. Please try again later. Original error: ${error.message}`);
      } else if (classification.isTransient) {
        throw new Error(`Temporary service error while listing models. Please try again. Original error: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Classifies errors for retry logic
   */
  private classifyError(error: any): ErrorClassification {
    const status = error?.status || error?.response?.status;
    const code = error?.code;
    
    // Rate limit errors (429)
    if (status === 429) {
      return {
        isRetryable: true,
        isRateLimit: true,
        isTransient: true
      };
    }
    
    // Server errors (5xx)
    if (status >= 500 && status < 600) {
      return {
        isRetryable: true,
        isRateLimit: false,
        isTransient: true
      };
    }
    
    // Network/timeout errors
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
      return {
        isRetryable: true,
        isRateLimit: false,
        isTransient: true
      };
    }
    
    // Client errors (4xx except 429) are not retryable
    if (status >= 400 && status < 500) {
      return {
        isRetryable: false,
        isRateLimit: false,
        isTransient: false
      };
    }
    
    // Unknown errors - be conservative and don't retry
    return {
      isRetryable: false,
      isRateLimit: false,
      isTransient: false
    };
  }

  /**
   * Calculates delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    const jitter = exponentialDelay * this.retryConfig.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;
    
    return Math.min(delayWithJitter, this.retryConfig.maxDelay);
  }

  /**
   * Sleeps for the specified number of milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executes a function with exponential backoff retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          debug(`[DEBUG] ${operationName} succeeded on attempt ${attempt + 1}`);
        }
        return result;
      } catch (error: any) {
        lastError = error;
        const classification = this.classifyError(error);
        
        debug(`[DEBUG] ${operationName} failed on attempt ${attempt + 1}:`, {
          error: error.message,
          status: error?.status || error?.response?.status,
          classification
        });
        
        // If this is the last attempt or error is not retryable, throw
        if (attempt === this.retryConfig.maxRetries || !classification.isRetryable) {
          break;
        }
        
        // Calculate delay and wait before retry
        const delay = this.calculateDelay(attempt);
        debug(`[DEBUG] Retrying ${operationName} in ${delay}ms (attempt ${attempt + 2}/${this.retryConfig.maxRetries + 1})`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
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
