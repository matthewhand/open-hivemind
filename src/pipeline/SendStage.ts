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
import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';

const debug = Debug('app:pipeline:send');

// ---------------------------------------------------------------------------
// Collaborator interfaces
// ---------------------------------------------------------------------------

/**
 * Abstraction for sending messages to a platform channel.
 */
export interface MessageSender {
  sendToChannel(channelId: string, text: string, senderName?: string): Promise<void>;
}

/**
 * Abstraction for persisting conversation memories.
 */
export interface MemoryStorer {
  storeMemory(
    botName: string,
    text: string,
    role: 'user' | 'assistant',
    meta?: Record<string, any>,
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
    const trimmed = ctx.responseText.trim();

    // Empty response after trim -- nothing to send.
    if (!trimmed) {
      debug('SendStage: empty response after trim, skipping send for bot=%s', ctx.botName);
      return;
    }

    const parts = this.splitMessage(trimmed);

    try {
      for (const part of parts) {
        await this.sender.sendToChannel(ctx.channelId, part, ctx.botName);
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
        ctx.channelId,
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debug('SendStage: send error: %O', error);
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
    trimmedResponse: string,
  ): void {
    const userText =
      typeof ctx.message.getText === 'function'
        ? ctx.message.getText()
        : ctx.message.content;

    // Store user message.
    this.memoryStorer!
      .storeMemory(ctx.botName, userText, 'user', { channelId: ctx.channelId })
      .catch((err) => {
        debug('SendStage: memory store error (user): %O', err);
      });

    // Store bot response.
    this.memoryStorer!
      .storeMemory(ctx.botName, trimmedResponse, 'assistant', { channelId: ctx.channelId })
      .catch((err) => {
        debug('SendStage: memory store error (assistant): %O', err);
      });
  }
}
