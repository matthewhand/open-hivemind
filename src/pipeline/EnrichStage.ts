/**
 * Pipeline Stage 3 -- EnrichStage
 *
 * Retrieves relevant memories and builds a system prompt for the LLM,
 * then emits the enriched context downstream.
 *
 * **Event flow:**
 *
 * ```
 *   message:accepted  -->  EnrichStage  -->  message:enriched
 *                                        |->  message:error
 * ```
 *
 * @module pipeline/EnrichStage
 */

import Debug from 'debug';
import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext, ReplyDecision } from '@src/events/types';

const debug = Debug('app:pipeline:enrich');

/** Default timeout (ms) for memory retrieval. */
const MEMORY_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Dependency interfaces
// ---------------------------------------------------------------------------

/**
 * Retrieves relevant memories for the bot given a query string.
 */
export interface MemoryRetriever {
  retrieveMemories(botName: string, query: string, limit?: number): Promise<string[]>;
}

/**
 * Builds the system prompt string from bot config, memories, and bot name.
 */
export interface PromptBuilder {
  buildSystemPrompt(
    botConfig: Record<string, unknown>,
    memories: string[],
    botName: string
  ): string;
}

// ---------------------------------------------------------------------------
// EnrichStage
// ---------------------------------------------------------------------------

/**
 * Subscribes to `message:accepted` events, retrieves memories, builds a
 * system prompt, and emits `message:enriched` with the enriched context.
 *
 * - Memory retrieval has a 5 s timeout; on timeout, empty memories are used.
 * - If memory retrieval throws, empty memories are used (graceful degradation).
 * - If the prompt builder throws, `message:error` is emitted.
 */
export class EnrichStage {
  constructor(
    private bus: MessageBus,
    private memoryRetriever: MemoryRetriever,
    private promptBuilder: PromptBuilder
  ) {}

  /**
   * Wire up the stage by subscribing to `message:accepted`.
   */
  register(): void {
    this.bus.on('message:accepted', async (ctx) => {
      await this.process(ctx);
    });
    debug('EnrichStage registered on message:accepted');
  }

  /**
   * Enrich a single accepted message context with memories and a system prompt.
   */
  async process(ctx: MessageContext & { decision: ReplyDecision }): Promise<void> {
    let memories: string[] = [];

    // 1. Retrieve memories (with timeout and error handling)
    try {
      const messageText = ctx.message.getText();
      memories = await this.retrieveWithTimeout(ctx.botName, messageText, 5);
    } catch (err) {
      debug('Memory retrieval failed, using empty memories: %O', err);
      memories = [];
    }

    // 2. Build system prompt
    try {
      const systemPrompt = this.promptBuilder.buildSystemPrompt(
        ctx.botConfig,
        memories,
        ctx.botName
      );

      // 3. Emit enriched context
      await this.bus.emitAsync('message:enriched', { ...ctx, memories, systemPrompt });
      debug('Message enriched: bot=%s memories=%d', ctx.botName, memories.length);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debug('Prompt builder error: %O', error);
      await this.bus.emitAsync('message:error', { ...ctx, error, stage: 'enrich' });
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Call retrieveMemories with a race against a timeout.
   * If the timeout fires first, resolve with an empty array.
   */
  private retrieveWithTimeout(botName: string, query: string, limit: number): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          debug('Memory retrieval timed out after %dms', MEMORY_TIMEOUT_MS);
          resolve([]);
        }
      }, MEMORY_TIMEOUT_MS);

      this.memoryRetriever
        .retrieveMemories(botName, query, limit)
        .then((result) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }
}
