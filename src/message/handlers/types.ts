import type { BotConfig } from '@src/types/config';
import type { IMessage } from '@message/interfaces/IMessage';

/**
 * Extended bot configuration including legacy and platform-specific keys
 */
export interface BotConfiguration extends BotConfig {
  BOT_ID?: string;
  MESSAGE_USERNAME_OVERRIDE?: string;
  MESSAGE_PROVIDER?: string;
  integration?: string;
  MESSAGE_CONTENT_FILTER_NOTIFY?: boolean;
  MESSAGE_SEMANTIC_GUARD_NOTIFY?: boolean;
  MESSAGE_COMMAND_INLINE?: boolean;
  MESSAGE_COMMAND_AUTHORISED_USERS?: string;
  MESSAGE_MIN_DELAY?: number | string;
  MESSAGE_TYPING_INDICATOR?: boolean;
  LLM_MAX_HISTORY_TOKENS?: number | string;
  MESSAGE_LLM_DIRECT?: boolean;
  LLM_MAX_TOKENS?: number | string;
  LLM_TEMPERATURE?: number | string;
  MESSAGE_SYSTEM_PROMPT?: string;
  MESSAGE_REPLY_IN_THREAD?: boolean;
  MESSAGE_MAX_LENGTH?: number | string;
  guardrailProfile?: string;
  [key: string]: unknown;
}

/**
 * Context maintained throughout the message processing pipeline
 */
export interface MessageContext {
  message: IMessage;
  historyMessages: IMessage[];
  botConfig: BotConfiguration;
  safeBotConfig: BotConfiguration;
  activeAgentName: string;

  logger: any; // debug.Debugger

  pipelineMetrics: any; // PipelineMetrics

  // Resolved during processing
  resolvedBotId?: string;
  providerSenderKey?: string;
  processedMessage?: string;

  platform?: string;

  messageProvider?: any;

  llmProvider?: any;

  resolvedAgentContext?: any;

  // State
  didLock?: boolean;
  isLeaderInvocation?: boolean;
  delayKey?: string;

  // LLM Response
  llmResponse?: {
    text: string;
    usage?: {
      total_tokens?: number;
    };
  } | null;
}

/**
 * Result of the message handling process
 */
export interface HandlerResult {
  response: string | null;
  error?: Error;
}
