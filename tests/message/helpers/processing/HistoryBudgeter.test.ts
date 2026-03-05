import { trimHistoryToTokenBudget } from '../../../../src/message/helpers/processing/HistoryBudgeter';

describe('HistoryBudgeter', () => {
  const mk = (t: string) => ({ getText: () => t });

  test('keeps most recent messages under budget', () => {
    // 4 chars/token estimate => 40 chars ~= 10 tokens
    const history = [
      mk('old message A '.repeat(10)),
      mk('old message B '.repeat(10)),
      mk('recent message C '.repeat(10)),
      mk('recent message D '.repeat(10)),
    ];

    const res = trimHistoryToTokenBudget(history, {
      inputBudgetTokens: 80,
      promptText: 'user prompt',
      systemPromptText: 'system',
      perMessageOverheadTokens: 0,
    });

    // Expect it to keep the most recent tail of the array
    expect(res.trimmed.length).toBeGreaterThan(0);
    expect(res.trimmed[res.trimmed.length - 1].getText()).toContain('recent message D');
  });

  test('respects minKeepMessages even if budget is tight', () => {
    const history = [mk('a'.repeat(200)), mk('b'.repeat(200)), mk('c'.repeat(200))];
    const res = trimHistoryToTokenBudget(history, {
      inputBudgetTokens: 5, // absurdly small
      promptText: 'x'.repeat(200),
      systemPromptText: 'y'.repeat(200),
      minKeepMessages: 2,
    });
    expect(res.trimmed).toHaveLength(2);
    expect(res.meta.trimmedCount).toBe(1);
  });
});
