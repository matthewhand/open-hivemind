import { AuditLogger } from '@src/common/auditLogger';
import { getGuardrailProfileByKey } from '@src/config/guardrailProfiles';
import { MemoryManager } from '@src/services/MemoryManager';
import type { ContentFilterConfig } from '@src/types/config';
import { recordBotActivity } from '../helpers/processing/ChannelActivity';
import { splitMessageContent } from '../helpers/processing/splitMessageContent';
import { pipelineEventEmitter } from '../PipelineMetrics';
import { PipelineMetricsAggregator } from '../PipelineMetricsAggregator';
import {
  contentFilterService,
  duplicateDetector,
  getSemanticGuardrailService,
  idleResponseManager,
  outgoingRateLimiter,
  stripSystemPromptLeak,
} from './messageHandler';
import type { MessageContext } from './types';

/**
 * Processes the LLM response, applies filters/guardrails, and sends the final message(s).
 */
export async function processOutput(ctx: MessageContext): Promise<string | null> {
  if (!ctx.llmResponse || !ctx.llmResponse.text) {
    ctx.logger('LLM returned empty response.');
    return null;
  }

  const channelId = ctx.message.getChannelId();
  const userId = ctx.message.getAuthorId();
  const botId = ctx.resolvedBotId || '';
  const serviceName = String(ctx.botConfig.MESSAGE_PROVIDER || 'generic');

  ctx.pipelineMetrics.startStage('format');

  // Prepare system prompt for leak stripping
  const memoryManager = MemoryManager.getInstance();
  const memories = await memoryManager.retrieveRelevantMemories(
    String(ctx.botConfig.name || botId),
    ctx.processedMessage || ''
  );
  const memoryContext = memoryManager.formatMemoriesForPrompt(memories);
  const baseSystemPrompt = (ctx.botConfig.MESSAGE_SYSTEM_PROMPT || '') as string;
  const systemPrompt = memoryContext ? `${baseSystemPrompt}\n\n${memoryContext}` : baseSystemPrompt;

  let responseText = stripSystemPromptLeak(ctx.llmResponse.text, systemPrompt);
  responseText = responseText.replace(/\\n/g, '\n').trim();

  // Content filter (output)
  const contentFilter = ctx.botConfig.contentFilter as ContentFilterConfig | undefined;
  if (contentFilter && contentFilter.enabled) {
    const botFilterResult = contentFilterService.checkContent(
      responseText,
      contentFilter,
      'assistant'
    );

    if (!botFilterResult.allowed) {
      ctx.logger(
        `Bot response blocked by filter: ${botFilterResult.reason}`,
        botFilterResult.matchedTerms
      );
      AuditLogger.getInstance().logBotAction(
        userId,
        'UPDATE',
        String(ctx.botConfig.name || ctx.botConfig.BOT_ID || 'unknown-bot'),
        'success',
        `Bot response blocked: ${botFilterResult.reason}`,
        {
          metadata: {
            type: 'BOT_RESPONSE_FILTER_BLOCK',
            channelId: channelId,
            botId: String(ctx.botConfig.BOT_ID || 'unknown-bot'),
            matchedTerms: botFilterResult.matchedTerms,
            strictness: contentFilter.strictness,
          },
        }
      );
      return null;
    }
  }

  // Semantic output guardrail
  const guardrailProfileKey = ctx.botConfig.guardrailProfile as string | undefined;
  if (guardrailProfileKey) {
    const guardrailProfile = getGuardrailProfileByKey(guardrailProfileKey);
    if (guardrailProfile?.guards?.semanticOutputGuard?.enabled) {
      ctx.pipelineMetrics.startStage('semantic_output_guard');
      try {
        const semanticResult = await getSemanticGuardrailService().evaluateOutput(
          responseText,
          guardrailProfile.guards.semanticOutputGuard,
          {
            userId,
            channelId,
            metadata: {
              botId: String(ctx.botConfig.BOT_ID || 'unknown-bot'),
              guardrailProfile: guardrailProfileKey,
              originalInput: ctx.processedMessage || '',
            },
          }
        );

        if (!semanticResult.allowed) {
          ctx.logger(`Bot response blocked by semantic output guardrail: ${semanticResult.reason}`);
          AuditLogger.getInstance().logBotAction(
            userId,
            'UPDATE',
            String(ctx.botConfig.name || ctx.botConfig.BOT_ID || 'unknown-bot'),
            'success',
            `Semantic output blocked: ${semanticResult.reason}`,
            {
              metadata: {
                type: 'SEMANTIC_OUTPUT_GUARD_BLOCK',
                channelId: channelId,
                botId: String(ctx.botConfig.BOT_ID || 'unknown-bot'),
                reason: semanticResult.reason,
                confidence: semanticResult.confidence,
                processingTime: semanticResult.processingTime,
                guardrailProfile: guardrailProfileKey,
              },
            }
          );
          ctx.pipelineMetrics.endStage('semantic_output_guard', { blocked: true });
          return null;
        }
        ctx.pipelineMetrics.endStage('semantic_output_guard', {
          blocked: false,
          confidence: semanticResult.confidence,
          processingTime: semanticResult.processingTime,
        });
      } catch (semanticErr) {
        ctx.logger('Semantic output guardrail failed (non-fatal):', semanticErr);
        ctx.pipelineMetrics.endStage('semantic_output_guard', { error: true });
      }
    }
  }

  // Split and send
  const parts = responseText
    ? splitMessageContent(responseText, Number(ctx.botConfig.MESSAGE_MAX_LENGTH || 2000))
    : [];
  ctx.pipelineMetrics.endStage('format', { parts: parts.length });

  if (responseText) {
    ctx.pipelineMetrics.startStage('send');
    for (const part of parts) {
      const finalReplyId = ctx.botConfig.MESSAGE_REPLY_IN_THREAD
        ? ctx.message.getMessageId()
        : undefined;

      await ctx.messageProvider.sendMessageToChannel(
        channelId,
        part,
        ctx.providerSenderKey,
        undefined,
        finalReplyId
      );

      duplicateDetector.recordMessage(channelId, part);
      outgoingRateLimiter.recordSend(channelId);
      if (ctx.resolvedBotId) recordBotActivity(channelId, ctx.resolvedBotId);
      idleResponseManager.recordBotResponse(serviceName, channelId);
    }
    ctx.pipelineMetrics.endStage('send', { partsSent: parts.length });
  }

  // Store memories
  ctx.pipelineMetrics.startStage('memory_store');
  const memBotName = String(ctx.botConfig.name || ctx.resolvedBotId);
  const memMeta = { channelId, userId };

  memoryManager
    .storeConversationMemory(memBotName, ctx.processedMessage || '', 'user', memMeta)
    .catch((e: unknown) => ctx.logger('Memory store (user) failed: %O', e));
  memoryManager
    .storeConversationMemory(memBotName, ctx.llmResponse.text, 'assistant', memMeta)
    .catch((e: unknown) => ctx.logger('Memory store (assistant) failed: %O', e));

  ctx.pipelineMetrics.endStage('memory_store');

  // Emit metrics
  const metricsJson = ctx.pipelineMetrics.toJSON();
  ctx.logger('Pipeline metrics: %O', metricsJson);
  pipelineEventEmitter.emit('pipeline:complete', metricsJson);
  PipelineMetricsAggregator.getInstance().record(
    metricsJson as Parameters<PipelineMetricsAggregator['record']>[0]
  );

  return responseText;
}
