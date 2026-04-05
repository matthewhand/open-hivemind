/**
 * Tests that custom circuit breaker settings from the provider config
 * are applied correctly to both Mem0Provider and Mem4aiProvider.
 *
 * Verifies the injectable circuit breaker configuration feature by
 * using a low failureThreshold and confirming the circuit opens after
 * that many failures (not the default of 5).
 */

import { Mem0Provider } from '../../../packages/memory-mem0/src/Mem0Provider';
import { Mem4aiProvider } from '../../../packages/memory-mem4ai/src/Mem4aiProvider';
import {
  CircuitBreakerError as CommonCircuitBreakerError,
  clearCircuitBreakerRegistry as clearCommonRegistry,
} from '../../../src/common/CircuitBreaker';
import {
  CircuitBreakerError as Mem4aiCircuitBreakerError,
  clearCircuitBreakerRegistry as clearMem4aiRegistry,
} from '../../../packages/memory-mem4ai/src/CircuitBreaker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResponse(status: number, body = ''): Response {
  return {
    ok: false,
    status,
    statusText: String(status),
    headers: new Headers(),
    json: jest.fn().mockRejectedValue(new Error('not json')),
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

let fetchMock: jest.Mock;

beforeEach(() => {
  clearCommonRegistry();
  clearMem4aiRegistry();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Mem0Provider
// ---------------------------------------------------------------------------

describe('Mem0Provider injectable circuit breaker config', () => {
  it('opens the circuit after custom failureThreshold (2) instead of default (5)', async () => {
    const provider = new Mem0Provider({
      apiKey: 'key',
      baseUrl: 'https://mem0.test/v1',
      userId: 'u1',
      maxRetries: 0,
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeoutMs: 60_000,
        halfOpenMaxAttempts: 1,
      },
    });

    // Two 500 errors should trip the breaker (threshold = 2)
    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // First failure
    await expect(provider.search('q')).rejects.toThrow();
    // Second failure — should trip the breaker
    await expect(provider.search('q')).rejects.toThrow();

    // Third call should be rejected by the circuit breaker itself
    await expect(provider.search('q')).rejects.toThrow(CommonCircuitBreakerError);
  });

  it('uses default thresholds when circuitBreaker config is omitted', async () => {
    const provider = new Mem0Provider({
      apiKey: 'key',
      baseUrl: 'https://mem0.test/v1',
      userId: 'u1',
      maxRetries: 0,
    });

    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // 4 failures should NOT trip the default threshold of 5
    for (let i = 0; i < 4; i++) {
      await expect(provider.search('q')).rejects.toThrow();
    }

    // 5th call should still go through to fetch (not be rejected by CB)
    // because the circuit opens *after* the 5th failure, not before it
    fetchMock.mockClear();
    await expect(provider.search('q')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Mem4aiProvider
// ---------------------------------------------------------------------------

describe('Mem4aiProvider injectable circuit breaker config', () => {
  it('opens the circuit after custom failureThreshold (2) instead of default (5)', async () => {
    const provider = new Mem4aiProvider({
      apiKey: 'key',
      apiUrl: 'https://mem4ai.test/v1',
      userId: 'u1',
      maxRetries: 0,
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeoutMs: 60_000,
        halfOpenMaxAttempts: 1,
      },
    });

    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // First failure
    await expect(provider.search('q')).rejects.toThrow();
    // Second failure — should trip the breaker
    await expect(provider.search('q')).rejects.toThrow();

    // Third call should be rejected by the circuit breaker itself
    await expect(provider.search('q')).rejects.toThrow(Mem4aiCircuitBreakerError);
  });

  it('uses default thresholds when circuitBreaker config is omitted', async () => {
    const provider = new Mem4aiProvider({
      apiKey: 'key',
      apiUrl: 'https://mem4ai.test/v1',
      userId: 'u1',
      maxRetries: 0,
    });

    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // 4 failures should NOT trip the default threshold of 5
    for (let i = 0; i < 4; i++) {
      await expect(provider.search('q')).rejects.toThrow();
    }

    // 5th call should still go through to fetch (not be rejected by CB)
    // because the circuit opens *after* the 5th failure, not before it
    fetchMock.mockClear();
    await expect(provider.search('q')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalled();
  });
});
