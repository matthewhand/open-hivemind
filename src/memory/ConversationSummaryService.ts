import Debug from 'debug';
import { DatabaseManager } from '@src/database/DatabaseManager';
import type { ConversationSummary, MessageRecord } from '@src/database/types';
import { summarizeText } from '@llm/tasks/summarizeText';

const debug = Debug('app:ConversationSummaryService');

/**
 * Options controlling how a conversation is summarized.
 */
export interface SummarizeConversationOptions {
  /** Maximum number of recent messages to pull from the channel history. */
  maxMessages?: number;
  /** Target maximum word count for the generated summary. */
  maxWords?: number;
  /** Optional token cap forwarded to the underlying summary LLM task. */
  maxTokensOverride?: number;
}

/**
 * Result of a successful summarization, mirroring what was persisted.
 */
export interface SummarizeConversationResult {
  /** Primary key (or undefined when persistence is skipped/unavailable). */
  id?: number | string;
  /** The stored ConversationSummary record. */
  summary: ConversationSummary;
}

const DEFAULT_MAX_MESSAGES = 50;
const DEFAULT_MAX_WORDS = 120;

/**
 * Minimal surface of {@link DatabaseManager} required by this service.
 * Declared explicitly so the service can be unit-tested with a lightweight fake.
 */
export interface ConversationSummaryStore {
  getMessages(channelId: string, limit?: number, offset?: number): Promise<MessageRecord[]>;
  storeConversationSummary(summary: ConversationSummary): Promise<number | string>;
}

/** Injectable summarizer signature (defaults to the shared llm util). */
export type Summarizer = (
  text: string,
  opts?: { maxWords?: number; maxTokensOverride?: number }
) => Promise<string>;

export interface ConversationSummaryServiceDeps {
  store?: ConversationSummaryStore;
  summarizer?: Summarizer;
}

/**
 * A single conversation turn supplied by the pipeline (already in memory —
 * no database read involved). Rendered as `author: text` in the transcript.
 */
export interface ConversationTurn {
  /** Display name (or id) of the speaker; omitted turns render as just text. */
  author?: string;
  /** The message text. */
  text: string;
}

/**
 * Produces and persists summaries of a channel's conversation history.
 *
 * This wires together three previously-disconnected pieces:
 *  - reading messages ({@link DatabaseManager.getMessages}),
 *  - summarizing text ({@link summarizeText}), and
 *  - persisting to the `conversation_summaries` table
 *    ({@link DatabaseManager.storeConversationSummary}).
 */
export class ConversationSummaryService {
  private readonly store: ConversationSummaryStore;
  private readonly summarizer: Summarizer;

  constructor(deps: ConversationSummaryServiceDeps = {}) {
    this.store = deps.store ?? DatabaseManager.getInstance();
    this.summarizer = deps.summarizer ?? summarizeText;
  }

  /**
   * Summarizes the most recent messages in a channel and stores the result.
   *
   * Returns `null` when there are no messages to summarize. Messages are read
   * newest-first and rendered oldest-first so the summary reads chronologically.
   */
  async summarizeChannel(
    channelId: string,
    options: SummarizeConversationOptions = {}
  ): Promise<SummarizeConversationResult | null> {
    const maxMessages = Math.max(1, Number(options.maxMessages ?? DEFAULT_MAX_MESSAGES));

    const recent = await this.store.getMessages(channelId, maxMessages);
    if (!recent || recent.length === 0) {
      debug(`No messages found for channel ${channelId}; nothing to summarize`);
      return null;
    }

    // getMessages returns newest-first; render oldest-first for readability.
    const chronological = [...recent].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const transcript = chronological
      .map((m) => `${m.authorName || m.authorId}: ${m.content}`)
      .join('\n');

    const summaryText = await this.summarizer(transcript, {
      maxWords: options.maxWords ?? DEFAULT_MAX_WORDS,
      maxTokensOverride: options.maxTokensOverride,
    });

    const first = chronological[0];
    const last = chronological[chronological.length - 1];

    const summary: ConversationSummary = {
      channelId,
      summary: summaryText,
      messageCount: chronological.length,
      startTimestamp: first.timestamp,
      endTimestamp: last.timestamp,
      // The transcript can span multiple providers; record the dominant one.
      provider: last.provider || first.provider || 'unknown',
    };

    const id = await this.store.storeConversationSummary(summary);
    debug(
      `Stored conversation summary for channel ${channelId} (${summary.messageCount} messages, id=${id})`
    );

    return { id, summary };
  }

  /**
   * Summarizes an in-memory list of conversation turns (oldest first).
   *
   * Used by the pipeline's Enrich stage to compress older history turns into
   * a short summary instead of dropping them outright. Unlike
   * {@link summarizeChannel} this neither reads from nor writes to the
   * database — the turns are already in memory and the result is transient
   * prompt context.
   *
   * Returns `null` when there is nothing to summarize or the summarizer
   * produced an empty string. Summarizer errors propagate to the caller,
   * which is expected to fall back to unsummarized history.
   */
  async summarizeTurns(
    turns: ConversationTurn[],
    options: { maxWords?: number; maxTokensOverride?: number } = {}
  ): Promise<string | null> {
    const meaningful = turns.filter((t) => t.text && t.text.trim().length > 0);
    if (meaningful.length === 0) {
      debug('No non-empty turns supplied; nothing to summarize');
      return null;
    }

    const transcript = meaningful
      .map((t) => (t.author ? `${t.author}: ${t.text}` : t.text))
      .join('\n');

    const summaryText = await this.summarizer(transcript, {
      maxWords: options.maxWords ?? DEFAULT_MAX_WORDS,
      maxTokensOverride: options.maxTokensOverride,
    });

    const trimmed = (summaryText ?? '').trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

/**
 * Convenience wrapper around {@link ConversationSummaryService} using the
 * default real dependencies (DatabaseManager + summarizeText util).
 */
export async function summarizeConversation(
  channelId: string,
  options?: SummarizeConversationOptions
): Promise<SummarizeConversationResult | null> {
  return new ConversationSummaryService().summarizeChannel(channelId, options);
}
