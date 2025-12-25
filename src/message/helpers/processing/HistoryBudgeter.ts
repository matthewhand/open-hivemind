import Debug from 'debug';

const debug = Debug('app:HistoryBudgeter');

export interface HistoryBudgetResult<TMessage> {
  trimmed: TMessage[];
  meta: {
    inputBudgetTokens: number;
    estimatedPromptTokens: number;
    estimatedSystemPromptTokens: number;
    estimatedHistoryTokens: number;
    estimatedTotalTokens: number;
    trimmedCount: number;
  };
}

// Rough approximation: ~4 characters per token.
export function estimateTokensFromText(text: string): number {
  return Math.ceil(String(text || '').length / 4);
}

/**
 * Keeps the most recent messages while staying within an input token budget.
 * History is expected to be oldest-first (A -> B -> C). Returned array is also oldest-first.
 */
export function trimHistoryToTokenBudget<TMessage extends { getText?: () => string; content?: string }>(
  historyOldestFirst: TMessage[],
  params: {
    inputBudgetTokens: number;
    promptText: string;
    systemPromptText?: string;
    perMessageOverheadTokens?: number;
    minKeepMessages?: number;
  },
): HistoryBudgetResult<TMessage> {
  const budget = Math.max(0, Number(params.inputBudgetTokens) || 0);
  const perMsgOverhead = Math.max(0, Number(params.perMessageOverheadTokens ?? 6));
  const minKeep = Math.max(0, Number(params.minKeepMessages ?? 0));

  const promptTokens = estimateTokensFromText(params.promptText);
  const systemTokens = estimateTokensFromText(params.systemPromptText || '');
  const nonHistoryTokens = promptTokens + systemTokens;

  // If budget is too small, return the last N messages as a best-effort.
  if (budget <= nonHistoryTokens) {
    const fallback = minKeep > 0 ? historyOldestFirst.slice(-minKeep) : [];
    return {
      trimmed: fallback,
      meta: {
        inputBudgetTokens: budget,
        estimatedPromptTokens: promptTokens,
        estimatedSystemPromptTokens: systemTokens,
        estimatedHistoryTokens: 0,
        estimatedTotalTokens: nonHistoryTokens,
        trimmedCount: Math.max(0, historyOldestFirst.length - fallback.length),
      },
    };
  }

  const remainingForHistory = budget - nonHistoryTokens;

  const kept: TMessage[] = [];
  let historyTokens = 0;

  // Keep most recent messages (iterate backwards) until we hit budget.
  for (let i = historyOldestFirst.length - 1; i >= 0; i--) {
    const msg = historyOldestFirst[i];
    const text = typeof msg.getText === 'function' ? msg.getText() : String((msg as any).content || '');
    const cost = estimateTokensFromText(text) + perMsgOverhead;

    // Always keep at least minKeep messages (even if slightly over budget).
    if (kept.length < minKeep) {
      kept.push(msg);
      historyTokens += cost;
      continue;
    }

    if (historyTokens + cost > remainingForHistory) {break;}
    kept.push(msg);
    historyTokens += cost;
  }

  kept.reverse(); // back to oldest-first

  const total = nonHistoryTokens + historyTokens;
  const trimmedCount = Math.max(0, historyOldestFirst.length - kept.length);
  debug(`Trimmed history: kept=${kept.length}/${historyOldestFirst.length} totalTokens~${total}/${budget}`);

  return {
    trimmed: kept,
    meta: {
      inputBudgetTokens: budget,
      estimatedPromptTokens: promptTokens,
      estimatedSystemPromptTokens: systemTokens,
      estimatedHistoryTokens: historyTokens,
      estimatedTotalTokens: total,
      trimmedCount,
    },
  };
}

