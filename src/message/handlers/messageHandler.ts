import Debug from 'debug';
import { AuditLogger } from '@src/common/auditLogger';
import { ErrorHandler } from '@src/common/errors/ErrorHandler';
import { PerformanceMonitor } from '@src/common/errors/PerformanceMonitor';
import { ContentFilterService } from '@src/services/ContentFilterService';
import { SemanticGuardrailService } from '@src/services/SemanticGuardrailService';
import { ChannelDelayManager } from '@message/helpers/handler/ChannelDelayManager';
import type { IMessage } from '@message/interfaces/IMessage';
import { IdleResponseManager } from '@message/management/IdleResponseManager';
import MessageDelayScheduler from '../helpers/handler/MessageDelayScheduler';
import AdaptiveHistoryTuner from '../helpers/processing/AdaptiveHistoryTuner';
import DuplicateMessageDetector from '../helpers/processing/DuplicateMessageDetector';
import OutgoingMessageRateLimiter from '../helpers/processing/OutgoingMessageRateLimiter';
import TokenTracker from '../helpers/processing/TokenTracker';
import TypingActivity from '../helpers/processing/TypingActivity';
import { PipelineMetrics } from '../PipelineMetrics';
import processingLocks from '../processing/processingLocks';
import { processInference } from './inferenceProcessor';
import {
  checkInputGuardrails,
  checkMaintenanceMode,
  filterInput,
  handleCommands,
  validateAndResolveContext,
} from './inputProcessor';
import { processOutput } from './outputProcessor';
import { determineReplyEligibility } from './replyDecision';
// New extracted handlers and types
import type { BotConfiguration, MessageContext } from './types';

export const _timingManager = MessageDelayScheduler.getInstance();
export const idleResponseManager = IdleResponseManager.getInstance();
export const duplicateDetector = DuplicateMessageDetector.getInstance();
export const _tokenTracker = TokenTracker.getInstance();
export const channelDelayManager = ChannelDelayManager.getInstance();
export const outgoingRateLimiter = OutgoingMessageRateLimiter.getInstance();
export const _typingActivity = TypingActivity.getInstance();
export const _historyTuner = AdaptiveHistoryTuner.getInstance();
export const contentFilterService = ContentFilterService.getInstance();
// Lazy: resolved per-call so mocks set in beforeEach are picked up in tests
export const getSemanticGuardrailService = () => SemanticGuardrailService.getInstance();

/**
 * Main message handler that processes incoming messages and generates responses.
 *
 * This function handles the complete message processing pipeline including:
 * - Input sanitization and validation
 * - Command processing
 * - Reply eligibility determination
 * - Delay and timing management
 * - LLM inference with retry logic
 * - Response sending with typing indicators
 *
 * @param {IMessage} message - The incoming message to process
 * @param {IMessage[]} [historyMessages=[]] - Previous messages for context
 * @param {BotConfiguration} botConfig - Bot configuration settings
 * @returns {Promise<string | null>} The generated response, or null if no response should be sent
 */
export async function handleMessage(
  message: IMessage,
  historyMessages: IMessage[] = [],
  botConfig: BotConfiguration = {} as BotConfiguration
): Promise<string | null> {
  const safeBotConfig = botConfig || {};
  const activeAgentName = String(
    safeBotConfig.MESSAGE_USERNAME_OVERRIDE || safeBotConfig.name || 'Bot'
  );
  const logger = Debug(`app:messageHandler:${activeAgentName}`);
  const pipelineMetrics = new PipelineMetrics();

  const ctx: MessageContext = {
    message,
    historyMessages,
    botConfig,
    safeBotConfig,
    activeAgentName,
    logger,
    pipelineMetrics,
  };

  return await PerformanceMonitor.measureAsync(
    async () => {
      try {
        // 1. Maintenance & Metrics
        if (await checkMaintenanceMode(ctx)) return null;
        pipelineMetrics.startStage('receive');

        // 2. Initial Audit Log
        const text = message.getText();
        if (text) {
          AuditLogger.getInstance().logBotAction(
            message.getAuthorId(),
            'UPDATE',
            String(botConfig.name || botConfig.BOT_ID || 'unknown-bot'),
            'success',
            `Received message: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
            {
              metadata: {
                type: 'MESSAGE_RECEIVED',
                channelId: message.getChannelId(),
                botId: String(botConfig.BOT_ID || 'unknown-bot'),
                content: text,
              },
            }
          );
        }

        // 3. Input Validation & Context Resolution
        if (!(await validateAndResolveContext(ctx))) return null;

        // 4. Content Filter
        if (!(await filterInput(ctx))) return null;

        // 5. Semantic Guardrail (Input)
        if (!(await checkInputGuardrails(ctx))) return null;

        // 6. Command Processing
        if (!(await handleCommands(ctx))) return null;

        // 7. Reply Eligibility
        if (!(await determineReplyEligibility(ctx))) return null;

        // 8. Inference
        if (!(await processInference(ctx))) return null;

        // 9. Output Processing
        return await processOutput(ctx);
      } catch (error: unknown) {
        ErrorHandler.handle(error, 'messageHandler.handleMessage');
        const modelInfo = botConfig
          ? ` | provider: ${botConfig.llmProvider} | model: ${botConfig.llmModel || 'default'}`
          : '';
        logger(
          `❌ INFERENCE/PROCESSING FAILED | error: ${error instanceof Error ? error.message : String(error)}${modelInfo}`
        );
        return null;
      } finally {
        // Cleanup locks and delays
        if (ctx.didLock && ctx.resolvedBotId) {
          try {
            processingLocks.unlock(message.getChannelId(), ctx.resolvedBotId);
          } catch (error) {
            logger('Failed to unlock processing lock', {
              error: error instanceof Error ? error.message : String(error),
              channelId: message.getChannelId(),
              botId: ctx.resolvedBotId,
            });
          }
        }
        if (ctx.isLeaderInvocation && ctx.delayKey) {
          try {
            channelDelayManager.clear(ctx.delayKey);
          } catch (error) {
            logger('Failed to clear channel delay', {
              error: error instanceof Error ? error.message : String(error),
              delayKey: ctx.delayKey,
              channelId: message.getChannelId(),
            });
          }
        }
      }
    },
    'handleMessage',
    5000
  );
}

export function stripSystemPromptLeak(response: string, ...promptTexts: string[]): string {
  let out = String(response ?? '');
  if (!out) {
    return out;
  }

  const prompts = (promptTexts || [])
    .map((p) => String(p || ''))
    .map((p) => p.trim())
    .filter(Boolean);

  if (prompts.length === 0) {
    return out;
  }

  for (const p of prompts) {
    if (!p) {
      continue;
    }
    if (!out.includes(p)) {
      continue;
    }
    out = out.replaceAll(p, '');
  }

  return out.trim();
}

export function buildSystemPromptWithBotName(baseSystemPrompt: unknown, botName: string): string {
  const base = typeof baseSystemPrompt === 'string' ? baseSystemPrompt.trim() : '';
  const name = String(botName || '').trim();
  const hint = name
    ? `You are ${name}. Your display name in chat is "${name}".`
    : 'You are an assistant operating inside a multi-user chat.';

  if (!base) {
    return hint;
  }
  // Put the hint first so models see it early.
  return `${hint}\n\n${base}`;
}
