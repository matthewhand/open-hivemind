import { AuditLogger } from '@src/common/auditLogger';
import { getGuardrailProfileByKey } from '@src/config/guardrailProfiles';
import { UserConfigStore } from '@src/config/UserConfigStore';
import { MessageBus } from '@src/events/MessageBus';
import { getLlmProviderForBot } from '@src/llm/getLlmProvider';
import { SyncProviderRegistry } from '@src/registries/SyncProviderRegistry';
import type { ContentFilterConfig } from '@src/types/config';
import { InputSanitizer } from '@src/utils/InputSanitizer';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { processCommand } from '../helpers/handler/processCommand';
import { addUserHintFn as addUserHint } from '../helpers/processing/addUserHint';
import { recordBotActivity } from '../helpers/processing/ChannelActivity';
import { stripBotId } from '../helpers/processing/stripBotId';
import { contentFilterService, getSemanticGuardrailService } from './messageHandler';
import type { MessageContext } from './types';

/**
 * Checks if the system is in maintenance mode and logs the event if so.
 */
export async function checkMaintenanceMode(ctx: MessageContext): Promise<boolean> {
  const userConfigStore = UserConfigStore.getInstance();
  const isMaintenanceMode = userConfigStore.isMaintenanceMode();

  if (isMaintenanceMode) {
    ctx.logger('Message received but system is in maintenance mode - skipping processing');
    try {
      AuditLogger.getInstance().logBotAction(
        ctx.message.getAuthorId(),
        'UPDATE',
        String(ctx.botConfig.name || ctx.botConfig.BOT_ID || 'unknown-bot'),
        'failure',
        'Message blocked due to maintenance mode',
        {
          metadata: {
            type: 'MAINTENANCE_MODE_BLOCKED',
            channelId: ctx.message.getChannelId(),
            botId: String(ctx.botConfig.BOT_ID || 'unknown-bot'),
          },
        }
      );
    } catch (auditError) {
      ctx.logger('Failed to log maintenance mode block:', auditError);
    }
    return true;
  }
  return false;
}

/**
 * Validates the incoming message and resolves initial context.
 */
export async function validateAndResolveContext(ctx: MessageContext): Promise<boolean> {
  const text = ctx.message.getText();
  if (text && text.trim().length > 0) {
    MessageBus.getInstance().emit('message:incoming', {
      message: ctx.message,
      botName: String(ctx.safeBotConfig.name || 'unknown'),
    } as any);
  }

  if (!text) {
    ctx.logger('Empty message content, skipping processing.');
    return false;
  }
  ctx.pipelineMetrics.endStage('receive', { channelId: ctx.message.getChannelId(), hasText: true });

  // Sanitize input
  ctx.pipelineMetrics.startStage('validate');
  const sanitizedText = InputSanitizer.sanitizeMessage(text);
  const validation = InputSanitizer.validateMessage(sanitizedText);
  if (!validation.isValid) {
    ctx.logger(`Invalid message: ${validation.reason}`);
    return false;
  }

  // Get providers
  const messageProviders = await getMessengerProvider();
  if (messageProviders.length === 0) {
    ctx.logger('ERROR:', 'No message provider available');
    return false;
  }
  ctx.messageProvider = messageProviders[0];

  // Resolve LLM provider
  let llmProvider;
  const syncRegistry = SyncProviderRegistry.getInstance();
  if (syncRegistry.isInitialized()) {
    try {
      const botNameForRegistry = String(ctx.botConfig.name || ctx.botConfig.BOT_ID || 'unknown');
      llmProvider = syncRegistry.getLlmProviderForBot(botNameForRegistry, ctx.botConfig);
    } catch {
      llmProvider = undefined;
    }
  }
  if (!llmProvider) {
    try {
      llmProvider = await getLlmProviderForBot(ctx.botConfig);
    } catch {
      ctx.logger('ERROR:', 'No LLM provider available');
      return false;
    }
  }
  ctx.llmProvider = llmProvider;

  // Platform resolution
  const providerType = String(
    ctx.botConfig.messageProvider ||
      ctx.botConfig.MESSAGE_PROVIDER ||
      ctx.botConfig.integration ||
      'generic'
  );
  ctx.platform = providerType.toLowerCase();

  // Resolve agent context
  const mpUnknown = ctx.messageProvider as unknown as Record<string, unknown>;
  ctx.resolvedAgentContext =
    typeof mpUnknown?.resolveAgentContext === 'function'
      ? (
          mpUnknown.resolveAgentContext as (
            opts: Record<string, unknown>
          ) => Record<string, unknown> | null
        )({
          botConfig: ctx.botConfig,
          agentDisplayName: ctx.activeAgentName,
        })
      : null;

  const botId = String(
    ctx.resolvedAgentContext?.botId ||
      ctx.botConfig?.BOT_ID ||
      ctx.messageProvider.getClientId() ||
      ''
  );
  ctx.resolvedBotId = botId || String(ctx.botConfig.BOT_ID || ctx.botConfig.name || 'unknown-bot');
  ctx.providerSenderKey = String(
    ctx.resolvedAgentContext?.senderKey || ctx.botConfig?.name || ctx.activeAgentName
  );

  const userId = ctx.message.getAuthorId();
  let processedMessage = stripBotId(text, botId);
  processedMessage = addUserHint(processedMessage, userId, botId);
  ctx.processedMessage = processedMessage;

  ctx.logger(
    `Processing message in channel ${ctx.message.getChannelId()} from user ${userId}: \"${processedMessage}\"`
  );
  return true;
}

/**
 * Applies content filtering to the input message.
 */
export async function filterInput(ctx: MessageContext): Promise<boolean> {
  if (!ctx.processedMessage) return true;

  const contentFilter = ctx.botConfig.contentFilter as ContentFilterConfig | undefined;
  if (contentFilter) {
    const filterResult = contentFilterService.checkContent(
      ctx.processedMessage,
      contentFilter,
      ctx.message.role
    );

    if (!filterResult.allowed) {
      const userId = ctx.message.getAuthorId();
      ctx.logger(`Content blocked by filter: ${filterResult.reason}`, filterResult.matchedTerms);
      AuditLogger.getInstance().logBotAction(
        userId,
        'UPDATE',
        String(ctx.botConfig.name || ctx.botConfig.BOT_ID || 'unknown-bot'),
        'success',
        `Content blocked: ${filterResult.reason}`,
        {
          metadata: {
            type: 'CONTENT_FILTER_BLOCK',
            channelId: ctx.message.getChannelId(),
            botId: String(ctx.botConfig.BOT_ID || 'unknown-bot'),
            matchedTerms: filterResult.matchedTerms,
            strictness: contentFilter.strictness,
          },
        }
      );

      if (ctx.botConfig.MESSAGE_CONTENT_FILTER_NOTIFY !== false) {
        try {
          await ctx.messageProvider.sendMessageToChannel(
            ctx.message.getChannelId(),
            'Your message contains content that is not allowed.',
            ctx.providerSenderKey
          );
        } catch (notifyErr) {
          ctx.logger('Failed to send content filter notification:', notifyErr);
        }
      }
      return false;
    }
  }
  return true;
}

/**
 * Evaluates semantic guardrails for the input message.
 */
export async function checkInputGuardrails(ctx: MessageContext): Promise<boolean> {
  if (!ctx.processedMessage) return true;

  const guardrailProfileKey = ctx.botConfig.guardrailProfile as string | undefined;
  if (guardrailProfileKey) {
    const guardrailProfile = getGuardrailProfileByKey(guardrailProfileKey);
    if (guardrailProfile?.guards?.semanticInputGuard?.enabled) {
      ctx.pipelineMetrics.startStage('semantic_input_guard');
      try {
        const semanticResult = await getSemanticGuardrailService().evaluateInput(
          ctx.processedMessage,
          guardrailProfile.guards.semanticInputGuard,
          {
            userId: ctx.message.getAuthorId(),
            channelId: ctx.message.getChannelId(),
            metadata: {
              botId: String(ctx.botConfig.BOT_ID || 'unknown-bot'),
              guardrailProfile: guardrailProfileKey,
            },
          }
        );

        if (!semanticResult.allowed) {
          const userId = ctx.message.getAuthorId();
          ctx.logger(`Content blocked by semantic input guardrail: ${semanticResult.reason}`);
          AuditLogger.getInstance().logBotAction(
            userId,
            'UPDATE',
            String(ctx.botConfig.name || ctx.botConfig.BOT_ID || 'unknown-bot'),
            'success',
            `Semantic input blocked: ${semanticResult.reason}`,
            {
              metadata: {
                type: 'SEMANTIC_INPUT_GUARD_BLOCK',
                channelId: ctx.message.getChannelId(),
                botId: String(ctx.botConfig.BOT_ID || 'unknown-bot'),
                reason: semanticResult.reason,
                confidence: semanticResult.confidence,
                processingTime: semanticResult.processingTime,
                guardrailProfile: guardrailProfileKey,
              },
            }
          );

          if (ctx.botConfig.MESSAGE_SEMANTIC_GUARD_NOTIFY !== false) {
            try {
              await ctx.messageProvider.sendMessageToChannel(
                ctx.message.getChannelId(),
                'Your message was flagged by our content safety system.',
                ctx.providerSenderKey
              );
            } catch (notifyErr) {
              ctx.logger('Failed to send semantic guardrail notification:', notifyErr);
            }
          }

          ctx.pipelineMetrics.endStage('semantic_input_guard', { blocked: true });
          return false;
        }

        ctx.pipelineMetrics.endStage('semantic_input_guard', {
          blocked: false,
          confidence: semanticResult.confidence,
          processingTime: semanticResult.processingTime,
        });
      } catch (semanticErr) {
        ctx.logger('Semantic input guardrail failed (non-fatal):', semanticErr);
        ctx.pipelineMetrics.endStage('semantic_input_guard', { error: true });
      }
    }
  }
  return true;
}

/**
 * Processes commands if they are enabled and present in the message.
 */
export async function handleCommands(ctx: MessageContext): Promise<boolean> {
  if (ctx.botConfig.MESSAGE_COMMAND_INLINE) {
    let commandProcessed = false;
    const userId = ctx.message.getAuthorId();
    await processCommand(ctx.message, async (result: string): Promise<void> => {
      const authorisedUsers = String(ctx.botConfig.MESSAGE_COMMAND_AUTHORISED_USERS || '');
      const allowedUsers = authorisedUsers.split(',').map((user: string) => user.trim());
      if (!allowedUsers.includes(userId)) {
        ctx.logger('User not authorized:', userId);
        await ctx.messageProvider.sendMessageToChannel(
          ctx.message.getChannelId(),
          'You are not authorized to use commands.',
          ctx.providerSenderKey
        );
        if (ctx.resolvedBotId) {
          recordBotActivity(ctx.message.getChannelId(), ctx.resolvedBotId);
        }
        commandProcessed = true;
        return;
      }
      await ctx.messageProvider.sendMessageToChannel(
        ctx.message.getChannelId(),
        result,
        ctx.providerSenderKey
      );
      if (ctx.resolvedBotId) {
        recordBotActivity(ctx.message.getChannelId(), ctx.resolvedBotId);
      }
      commandProcessed = true;
    });
    if (commandProcessed) {
      return false; // Stop processing
    }
  }
  return true; // Continue processing
}
