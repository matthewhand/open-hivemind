import AdaptiveHistoryTuner from '../../../../src/message/helpers/processing/AdaptiveHistoryTuner';

describe('AdaptiveHistoryTuner', () => {
  beforeEach(() => {
    AdaptiveHistoryTuner.getInstance().reset();
  });

  test('decreases desired limit when trimming occurs', () => {
    const tuner = AdaptiveHistoryTuner.getInstance();
    const key = 'chan:bot';
    const base = 10;
    const first = tuner.getDesiredLimit(key, base);
    tuner.recordResult(key, {
      requestedLimit: first,
      receivedCount: first,
      keptCount: Math.max(0, first - 4),
      estimatedTotalTokens: 950,
      inputBudgetTokens: 1000
    });
    const next = tuner.getDesiredLimit(key, base);
    expect(next).toBeLessThanOrEqual(first);
  });

  test('increases desired limit when saturating and far under budget', () => {
    const tuner = AdaptiveHistoryTuner.getInstance();
    const key = 'chan:bot';
    const base = 10;
    const first = tuner.getDesiredLimit(key, base);
    tuner.recordResult(key, {
      requestedLimit: first,
      receivedCount: first, // saturating
      keptCount: first,
      estimatedTotalTokens: 200,
      inputBudgetTokens: 1000
    });
    const next = tuner.getDesiredLimit(key, base);
    expect(next).toBeGreaterThanOrEqual(first);
  });
});

