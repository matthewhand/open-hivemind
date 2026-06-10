/**
 * Adapter that wires {@link ConversationSummaryService} into the pipeline's
 * Enrich stage as a {@link HistorySummarizer}.
 *
 * On each call it resolves the **bot's own LLM provider** (via
 * `getLlmProviderForBot`) and uses it to summarize the supplied slice of
 * conversation history. Nothing is persisted — the summary is transient
 * prompt context assembled by EnrichStage.
 *
 * @module pipeline/adapters/HistorySummarizerAdapter
 */

import type { IMessage } from '@hivemind/shared-types';
import { getLlmProviderForBot } from '@src/llm/getLlmProvider';
import {
  ConversationSummaryService,
  type ConversationTurn,
  type Summarizer,
} from '@src/memory/ConversationSummaryService';
import type { HistorySummarizer } from '@src/pipeline/EnrichStage';

/** Token cap forwarded to the summary LLM call. */
const SUMMARY_MAX_TOKENS = 300;

/**
 * Adapts `ConversationSummaryService.summarizeTurns()` to the pipeline's
 * {@link HistorySummarizer} interface, using the per-message bot config to
 * resolve the LLM provider that produces the summary.
 */
export class HistorySummarizerAdapter implements HistorySummarizer {
  async summarizeHistory(
    history: IMessage[],
    botConfig: Record<string, unknown>,
    options?: { maxWords?: number }
  ): Promise<string | null> {
    const summarizer: Summarizer = async (text, opts) => {
      const provider = await getLlmProviderForBot(botConfig);
      const maxWords = Math.max(10, Number(opts?.maxWords ?? 150));
      const prompt =
        `Summarize the following conversation in <= ${maxWords} words. ` +
        `Preserve key facts, decisions, participant names, and unresolved questions.\n\n` +
        `CONVERSATION:\n${text}`;
      return provider.generateChatCompletion(prompt, [], {
        maxTokensOverride: opts?.maxTokensOverride ?? SUMMARY_MAX_TOKENS,
      });
    };

    const turns: ConversationTurn[] = history.map((message) => ({
      author: getAuthor(message),
      text: getText(message),
    }));

    const service = new ConversationSummaryService({ summarizer });
    return service.summarizeTurns(turns, { maxWords: options?.maxWords });
  }
}

function getText(message: IMessage): string {
  try {
    return typeof message.getText === 'function'
      ? message.getText()
      : String((message as { content?: unknown }).content ?? '');
  } catch {
    return '';
  }
}

function getAuthor(message: IMessage): string | undefined {
  try {
    if (typeof message.getAuthorName === 'function') {
      const name = message.getAuthorName();
      if (name) return name;
    }
    if (typeof message.getAuthorId === 'function') {
      const id = message.getAuthorId();
      if (id) return id;
    }
  } catch {
    // Fall through — turns without an author render as bare text.
  }
  return undefined;
}
