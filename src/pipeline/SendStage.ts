/**
 * Pipeline Stage 5 -- SendStage
 *
 * Delivers the LLM-generated response back to the originating platform,
 * stores conversation memory (fire-and-forget), and signals completion.
 *
 * **Event flow:**
 *
 * ```
 *   message:response  -->  SendStage  -->  message:sent
 *                                     +-->  message:error
 * ```
 *
 * @module pipeline/SendStage
 */

import Debug from 'debug';
import { container } from 'tsyringe';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';
import { PipelineDebuggerService } from '../server/services/PipelineDebuggerService';
import { DefaultActivityRecorder, type ActivityRecorder } from './ActivityRecorder';

const debug = Debug('app:pipeline:send');

// ---------------------------------------------------------------------------
// Platform resolution (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Resolve the outbound platform key for multi-provider messenger routing.
 *
 * Prefer `botConfig.MESSAGE_PROVIDER` (always set on configured bots) over
 * `ctx.platform` (sometimes empty or generic on the pipeline path). Falls
 * back to `messageProvider` metadata when present.
 */
export function resolveOutboundPlatform(ctx: {
  platform?: string;
  botConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): string | undefined {
  const candidates = [
    ctx.botConfig?.MESSAGE_PROVIDER,
    ctx.botConfig?.messageProvider,
    ctx.platform,
    ctx.metadata?.messageProvider,
    ctx.metadata?.platform,
  ];
  for (const raw of candidates) {
    if (raw == null) continue;
    const key = String(raw).trim().toLowerCase();
    // "generic" is a decision-strategy placeholder, not a real messenger.
    if (key && key !== 'generic') {
      return key;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Collaborator interfaces
// ---------------------------------------------------------------------------

/**
 * Optional routing / threading hints passed with an outbound send.
 */
export interface MessageSendOptions {
  /** Thread/parent ID when the platform supports threaded replies. */
  threadId?: string;
  /** Message ID to reply to (used by some providers as the thread root). */
  replyToMessageId?: string;
  /** Originating platform key used to select the correct messenger service. */
  platform?: string;
}

/**
 * Abstraction for sending messages to a platform channel.
 */
export interface MessageSender {
  sendToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    options?: MessageSendOptions
  ): Promise<void>;
}

/**
 * Abstraction for persisting conversation memories.
 */
export interface MemoryStorer {
  storeMemory(
    botName: string,
    text: string,
    role: 'user' | 'assistant',

    meta?: Record<string, any>
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum character length for a single message part. */
const MAX_PART_LENGTH = 2000;

// ---------------------------------------------------------------------------
// SendStage
// ---------------------------------------------------------------------------

/**
 * Subscribes to `message:response` events, formats and sends the response
 * to the platform in one or more parts, stores conversation memory, and
 * emits `message:sent` on success or `message:error` on failure.
 */
export class SendStage {
  constructor(
    private bus: MessageBus,
    private sender: MessageSender,
    private memoryStorer?: MemoryStorer,
    private recorder: ActivityRecorder = new DefaultActivityRecorder(),
    private botId?: string
  ) {}

  /**
   * Wire up the stage by subscribing to `message:response`.
   */
  register(): void {
    this.bus.on('message:response', async (ctx) => {
      await this.process(ctx);
    });
    debug('SendStage registered on message:response');
  }

  /**
   * Process a single response context: format, split, send, store, emit.
   */
  async process(ctx: MessageContext & { responseText: string }): Promise<void> {
    // --- Pipeline Debugger Breakpoint Check ---
    try {
      const debuggerService = container.resolve(PipelineDebuggerService);
      if (debuggerService.shouldPause('response')) {
        debug(`[Debugger] Pausing pipeline for bot ${ctx.botName} at stage 'response'`);
        ctx = await debuggerService.pause('response', ctx);
        debug(`[Debugger] Resuming pipeline for bot ${ctx.botName}`);
      }
    } catch {
      // Ignore DI errors
    }

    const trimmed = ctx.responseText.trim();

    // Empty response after trim -- nothing to send. Release the swarm claim so
    // another bot (or a retry) can pick the message up.
    if (!trimmed) {
      debug('SendStage: empty response after trim, skipping send for bot=%s', ctx.botName);
      this.releaseSwarmClaim(ctx);
      return;
    }

    const parts = this.splitMessage(trimmed);
    const sendOptions = this.resolveSendOptions(ctx);

    try {
      for (const part of parts) {
        await this.sender.sendToChannel(ctx.channelId, part, ctx.botName, sendOptions);
      }

      // Capture metadata
      ctx.metadata.send = {
        partsCount: parts.length,
        totalLength: trimmed.length,
        status: 'sent',
        threadId: sendOptions.threadId,
        replyToMessageId: sendOptions.replyToMessageId,
        platform: sendOptions.platform,
      };

      // Record response-scoring signals (fatigue, grace window, idle response).
      // Mirrors the legacy `outputProcessor.ts` recordings so these signals are
      // live in pipeline mode. Best-effort: never block delivery.
      try {
        const serviceName = resolveOutboundPlatform(ctx) || 'generic';
        const botId =
          this.botId || (ctx.botConfig.BOT_ID as string) || (ctx.botConfig.botId as string) || '';
        this.recorder.recordBotResponse(serviceName, ctx.channelId, botId);
      } catch (recordErr) {
        debug('SendStage: failed to record bot activity (non-fatal): %O', recordErr);
      }

      await this.bus.emitAsync('message:sent', {
        ...ctx,
        responseText: trimmed,
        parts,
      });

      debug(
        'SendStage: sent %d part(s) for bot=%s channel=%s',
        parts.length,
        ctx.botName,
        ctx.channelId
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debug('SendStage: send error: %O', error);
      // Free the swarm claim so another bot can attempt delivery.
      this.releaseSwarmClaim(ctx);
      await this.bus.emitAsync('message:error', { ...ctx, error, stage: 'send' });
      return;
    }

    // Fire-and-forget memory storage.
    if (this.memoryStorer) {
      this.storeMemories(ctx, trimmed);
    }
  }

  // ---- Private helpers ----------------------------------------------------

  /**
   * Resolve thread / reply / platform options for an outbound send.
   *
   * Mirrors legacy `outputProcessor.ts`:
   * - Prefer an explicit thread id from the inbound message when available.
   * - When `MESSAGE_REPLY_IN_THREAD` is enabled (bot config or env), pass the
   *   inbound message id as `replyToMessageId` so providers can start/continue
   *   a thread (Slack uses this as `thread_ts`).
   */
  private resolveSendOptions(ctx: MessageContext): MessageSendOptions {
    const msg = ctx.message as {
      getThreadId?: () => string | null | undefined;
      getMessageId?: () => string;
      metadata?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };

    let threadId: string | undefined;
    if (typeof msg.getThreadId === 'function') {
      const tid = msg.getThreadId();
      if (tid != null && String(tid).length > 0) {
        threadId = String(tid);
      }
    }
    if (!threadId) {
      const meta = msg.metadata ?? {};
      const data = msg.data ?? {};
      const candidate =
        meta.threadId ??
        meta.thread_ts ??
        data.threadId ??
        data.thread_ts ??
        data.message_thread_id;
      if (candidate != null && String(candidate).length > 0) {
        threadId = String(candidate);
      }
    }

    const replyInThreadFlag =
      ctx.botConfig.MESSAGE_REPLY_IN_THREAD ?? process.env.MESSAGE_REPLY_IN_THREAD;
    const replyInThread =
      replyInThreadFlag === true ||
      replyInThreadFlag === 'true' ||
      replyInThreadFlag === 1 ||
      replyInThreadFlag === '1';

    let replyToMessageId: string | undefined;
    if (replyInThread && typeof msg.getMessageId === 'function') {
      const mid = msg.getMessageId();
      if (mid) {
        replyToMessageId = mid;
      }
    }

    return {
      threadId,
      replyToMessageId,
      // Prefer bot-config MESSAGE_PROVIDER (set on almost every bot) over
      // ctx.platform, which is sometimes empty/generic on the pipeline path.
      // Without this multi-provider deploys silently route all sends to the
      // primary messenger (messengerServices[0]).
      platform: resolveOutboundPlatform(ctx),
    };
  }

  /**
   * Best-effort release of a swarm claim after a failed/empty send so another
   * bot (or retry) can claim the message.
   */
  private releaseSwarmClaim(ctx: MessageContext): void {
    try {
      const messageId =
        typeof ctx.message.getMessageId === 'function' ? ctx.message.getMessageId() : undefined;
      if (messageId) {
        SwarmCoordinator.getInstance().releaseClaim(messageId);
        debug('SendStage: released swarm claim for messageId=%s', messageId);
      }
    } catch (err) {
      debug('SendStage: failed to release swarm claim (non-fatal): %O', err);
    }
  }

  /**
   * Split a message into parts of at most {@link MAX_PART_LENGTH} characters,
   * respecting newline boundaries and never splitting mid-word.
   */
  private splitMessage(text: string): string[] {
    if (text.length <= MAX_PART_LENGTH) {
      return [text];
    }

    const parts: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= MAX_PART_LENGTH) {
        parts.push(remaining);
        break;
      }

      // Try to split at the last newline within the limit.
      const chunk = remaining.slice(0, MAX_PART_LENGTH);
      let splitIdx = chunk.lastIndexOf('\n');

      // No newline found -- split at last space to avoid mid-word break.
      if (splitIdx === -1) {
        splitIdx = chunk.lastIndexOf(' ');
      }

      // No space either -- hard-split at the limit (shouldn't normally happen
      // with well-formed text).
      if (splitIdx === -1) {
        splitIdx = MAX_PART_LENGTH;
      }

      parts.push(remaining.slice(0, splitIdx).trimEnd());
      remaining = remaining.slice(splitIdx).trimStart();
    }

    return parts.filter((p) => p.length > 0);
  }

  /**
   * Fire-and-forget memory storage. Errors are logged but never propagated.
   */
  private storeMemories(
    ctx: MessageContext & { responseText: string },
    trimmedResponse: string
  ): void {
    const storer = this.memoryStorer;
    if (!storer) {
      return;
    }

    const userText =
      typeof ctx.message.getText === 'function' ? ctx.message.getText() : ctx.message.content;

    // Store user message.
    storer
      .storeMemory(ctx.botName, userText, 'user', {
        channelId: ctx.channelId,
      })
      .catch((err) => {
        debug('SendStage: memory store error (user): %O', err);
      });

    // Store bot response.
    storer
      .storeMemory(ctx.botName, trimmedResponse, 'assistant', {
        channelId: ctx.channelId,
      })
      .catch((err) => {
        debug('SendStage: memory store error (assistant): %O', err);
      });
  }
}
