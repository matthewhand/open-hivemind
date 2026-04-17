/**
 * Tests that custom circuit breaker settings from the provider config
 * are applied correctly to both Mem0Provider and Mem4aiProvider.
 *
 * Verifies the injectable circuit breaker configuration feature by
 * using a low failureThreshold and confirming the circuit opens after
 * that many failures (not the default of 5).
 */

import * as sharedTypes from '@hivemind/shared-types';
import { Mem0Provider } from '../../../packages/memory-mem0/src/Mem0Provider';
import {
  CircuitBreakerError as Mem4aiCircuitBreakerError,
  resetAllCircuitBreakers as resetAllMem4aiCircuitBreakers,
} from '../../../packages/memory-mem4ai/src/CircuitBreaker';
import { Mem4aiProvider } from '../../../packages/memory-mem4ai/src/Mem4aiProvider';
import { CircuitBreakerError, resetAllCircuitBreakers } from '../../../src/common/CircuitBreaker';

// Mock isSafeUrl so injected test URLs don't trigger SSRF guard failures
jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return {
    ...actual,
    isSafeUrl: jest.fn().mockResolvedValue({ safe: true }),
  };
});

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
  resetAllCircuitBreakers();
  resetAllMem4aiCircuitBreakers();
  fetchMock = jest.fn();
  global.fetch = fetchMock;

  // Ensure isSafeUrl mock is set up correctly for every test
  (sharedTypes.isSafeUrl as jest.Mock).mockResolvedValue({ safe: true });
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
      maxRetries: 0, // Disable internal retries for accurate counting
      circuitBreaker: {
        name: 'mem0-custom',
        failureThreshold: 2,
        resetTimeoutMs: 60_000,
        halfOpenMaxAttempts: 1,
      },
    });

    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // First failure
    await expect(provider.search('q')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second failure - this should trip the circuit breaker
    await expect(provider.search('q')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Third call should be rejected by the circuit breaker itself (fetch NOT called)
    await expect(provider.search('q')).rejects.toThrow(CircuitBreakerError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses default thresholds when circuitBreaker config is omitted', async () => {
    const provider = new Mem0Provider({
      apiKey: 'key',
      baseUrl: 'https://mem0.test/v1',
      userId: 'u1',
      maxRetries: 0, // Disable internal retries for accurate counting
    });

    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // 5 failures will trip the default threshold of 5
    for (let i = 1; i <= 5; i++) {
      await expect(provider.search('q')).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(i);
    }

    // 6th call should be rejected by CB (fetch NOT called)
    await expect(provider.search('q')).rejects.toThrow(CircuitBreakerError);
    expect(fetchMock).toHaveBeenCalledTimes(5);
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
      maxRetries: 0, // Disable internal retries for accurate counting
      circuitBreaker: {
        name: 'mem4ai-custom',
        failureThreshold: 2,
        resetTimeoutMs: 60_000,
        halfOpenMaxAttempts: 1,
      },
    });

    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // First failure
    await expect(provider.search('q')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second failure — should trip the breaker
    await expect(provider.search('q')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Third call should be rejected by the circuit breaker itself
    await expect(provider.search('q')).rejects.toThrow(Mem4aiCircuitBreakerError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses default thresholds when circuitBreaker config is omitted', async () => {
    const provider = new Mem4aiProvider({
      apiKey: 'key',
      apiUrl: 'https://mem4ai.test/v1',
      userId: 'u1',
      maxRetries: 0, // Disable internal retries for accurate counting
    });

    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));

    // 5 failures will trip the default threshold of 5
    for (let i = 1; i <= 5; i++) {
      await expect(provider.search('q')).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(i);
    }

    // 6th call should be rejected by CB
    await expect(provider.search('q')).rejects.toThrow(Mem4aiCircuitBreakerError);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
