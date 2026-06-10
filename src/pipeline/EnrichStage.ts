/**
 * Pipeline Stage 3 -- EnrichStage
 *
 * Retrieves relevant memories, optionally compresses older conversation
 * history into an LLM-generated summary, and builds a system prompt for the
 * LLM, then emits the enriched context downstream.
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
import { container } from 'tsyringe';
import type { IMessage } from '@hivemind/shared-types';
import messageConfig from '@src/config/messageConfig';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext, ReplyDecision } from '@src/events/types';
import { withTimeout } from '@common/withTimeout';
import { PipelineDebuggerService } from '../server/services/PipelineDebuggerService';

const debug = Debug('app:pipeline:enrich');

/** Default timeout (ms) for memory retrieval. */
const MEMORY_TIMEOUT_MS = 5_000;

/** Default timeout (ms) for the history-summarization LLM call. */
const HISTORY_SUMMARY_TIMEOUT_MS = 15_000;

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

/**
 * Summarizes a slice of conversation history via the bot's LLM provider.
 *
 * Production wiring uses `HistorySummarizerAdapter`, which delegates to
 * {@link ConversationSummaryService}.
 */
export interface HistorySummarizer {
  summarizeHistory(
    history: IMessage[],
    botConfig: Record<string, unknown>,
    options?: { maxWords?: number }
  ): Promise<string | null>;
}

/**
 * Resolved configuration for history summarization, sourced from message
 * config by default (see {@link defaultHistorySummaryConfig}).
 */
export interface HistorySummaryConfig {
  /** Master switch — summarization is skipped entirely when false. */
  enabled: boolean;
  /** Summarize only when the history is strictly longer than this. */
  threshold: number;
  /** Number of most-recent turns kept verbatim (never summarized). */
  keepRecent: number;
  /** Target maximum word count for the generated summary. */
  maxWords: number;
}

/**
 * Default config provider: reads the `MESSAGE_HISTORY_SUMMARY_*` settings.
 *
 * Summarization is **off by default** and additionally skipped under
 * `NODE_ENV=test` unless explicitly enabled via the
 * `MESSAGE_HISTORY_SUMMARY_ENABLED=true` environment variable, so tests never
 * issue surprise LLM calls.
 */
export function defaultHistorySummaryConfig(): HistorySummaryConfig {
  const explicitlyEnabled = process.env.MESSAGE_HISTORY_SUMMARY_ENABLED === 'true';
  const enabled =
    process.env.NODE_ENV === 'test'
      ? explicitlyEnabled
      : Boolean(messageConfig.get('MESSAGE_HISTORY_SUMMARY_ENABLED'));

  return {
    enabled,
    threshold: Math.max(1, Number(messageConfig.get('MESSAGE_HISTORY_SUMMARY_THRESHOLD')) || 20),
    keepRecent: Math.max(1, Number(messageConfig.get('MESSAGE_HISTORY_SUMMARY_KEEP_RECENT')) || 10),
    maxWords: Math.max(10, Number(messageConfig.get('MESSAGE_HISTORY_SUMMARY_MAX_WORDS')) || 150),
  };
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
    private promptBuilder: PromptBuilder,
    private historySummarizer?: HistorySummarizer,
    private historySummaryConfig: () => HistorySummaryConfig = defaultHistorySummaryConfig
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
    // --- Pipeline Debugger Breakpoint Check ---
    try {
      const debuggerService = container.resolve(PipelineDebuggerService);
      if (debuggerService.shouldPause('accepted')) {
        debug(`[Debugger] Pausing pipeline for bot ${ctx.botName} at stage 'accepted'`);
        ctx = await debuggerService.pause('accepted', ctx);
        debug(`[Debugger] Resuming pipeline for bot ${ctx.botName}`);
      }
    } catch {
      // Ignore DI errors
    }

    const startTime = Date.now();
    let memories: string[] = [];

    // 1. Retrieve memories (with timeout and error handling)
    try {
      const messageText = ctx.message.getText();
      memories = await this.retrieveWithTimeout(ctx.botName, messageText, 5);
    } catch (err) {
      debug('Memory retrieval failed, using empty memories: %O', err);
      memories = [];
    }

    const memoryTime = Date.now();

    // 2. Summarize older history turns (config-gated, failure-tolerant).
    //    On any failure the full history passes through unchanged — exactly
    //    the pre-summarization behavior.
    const { history, historySummary, summarizedTurns } = await this.maybeSummarizeHistory(ctx);

    // 3. Build system prompt
    try {
      let systemPrompt = this.promptBuilder.buildSystemPrompt(ctx.botConfig, memories, ctx.botName);

      if (historySummary) {
        systemPrompt = `Summary of earlier conversation:\n${historySummary}\n\n${systemPrompt}`;
      }

      // Capture metadata
      ctx.metadata.enrich = {
        memoryCount: memories.length,
        systemPromptLength: systemPrompt.length,
        retrievalDurationMs: memoryTime - startTime,
        totalDurationMs: Date.now() - startTime,
        historySummarized: historySummary !== null,
        summarizedTurns,
        retainedTurns: history.length,
      };

      // 4. Emit enriched context
      await this.bus.emitAsync('message:enriched', { ...ctx, history, memories, systemPrompt });
      debug(
        'Message enriched: bot=%s memories=%d historySummarized=%s',
        ctx.botName,
        memories.length,
        historySummary !== null
      );
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
   * Compress older history turns into an LLM-generated summary when the
   * history exceeds the configured threshold.
   *
   * The most recent `keepRecent` turns are always kept verbatim; everything
   * older is summarized via the injected {@link HistorySummarizer}. Any
   * failure (summarizer error, timeout, empty summary) falls back to the
   * original, unmodified history.
   */
  private async maybeSummarizeHistory(
    ctx: MessageContext
  ): Promise<{ history: IMessage[]; historySummary: string | null; summarizedTurns: number }> {
    const fullHistory = Array.isArray(ctx.history) ? ctx.history : [];
    const passthrough = { history: fullHistory, historySummary: null, summarizedTurns: 0 };

    if (!this.historySummarizer) {
      return passthrough;
    }

    const config = this.historySummaryConfig();
    if (!config.enabled || fullHistory.length <= config.threshold) {
      return passthrough;
    }

    const keepRecent = Math.max(1, config.keepRecent);
    const olderTurns = fullHistory.slice(0, fullHistory.length - keepRecent);
    if (olderTurns.length === 0) {
      return passthrough;
    }

    try {
      const summary = await withTimeout(
        () =>
          this.historySummarizer!.summarizeHistory(olderTurns, ctx.botConfig, {
            maxWords: config.maxWords,
          }),
        HISTORY_SUMMARY_TIMEOUT_MS,
        'History summarization'
      );

      if (!summary || summary.trim().length === 0) {
        debug('History summarizer returned empty summary; keeping full history');
        return passthrough;
      }

      debug(
        'Summarized %d older history turns (keeping %d recent) for bot=%s',
        olderTurns.length,
        keepRecent,
        ctx.botName
      );
      return {
        history: fullHistory.slice(fullHistory.length - keepRecent),
        historySummary: summary.trim(),
        summarizedTurns: olderTurns.length,
      };
    } catch (err) {
      debug('History summarization failed, falling back to full history: %O', err);
      return passthrough;
    }
  }

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
