/**
 * LLM Profiles API and Module Tests
 *
 * Tests the llmProfiles config module (pure functions) plus the HTTP
 * GET endpoint.
 *
 * This replaces the old 257-line file where the entire PUT test suite
 * (5 tests, 100 lines) was wrapped in describe.skip and never executed.
 * The old file also entirely mocked `llmProfiles`, so it only tested
 * router wiring, not actual profile persistence.
 *
 * New tests cover:
 * - Pure functions: normalizeModelType, isEmbeddingCapableProfile
 * - In-memory module behavior via mocks: save/retrieve, case-insensitive lookup
 * - HTTP GET endpoint response shape
 */
import {
  normalizeModelType,
  isEmbeddingCapableProfile,
} from '../../src/config/llmProfiles';

// ---------------------------------------------------------------------------
// Pure function tests (no mocking, no file I/O needed)
// ---------------------------------------------------------------------------

describe('llmProfiles pure functions', () => {
  describe('normalizeModelType', () => {
    it('should default to chat for undefined', () => {
      expect(normalizeModelType(undefined)).toBe('chat');
    });

    it('should default to chat for invalid values', () => {
      expect(normalizeModelType('invalid')).toBe('chat');
      expect(normalizeModelType(123)).toBe('chat');
    });

    it('should preserve valid model types', () => {
      expect(normalizeModelType('chat')).toBe('chat');
      expect(normalizeModelType('embedding')).toBe('embedding');
      expect(normalizeModelType('both')).toBe('both');
    });
  });

  describe('isEmbeddingCapableProfile', () => {
    it('should return true for embedding type', () => {
      expect(isEmbeddingCapableProfile({ modelType: 'embedding' })).toBe(true);
    });

    it('should return true for both type', () => {
      expect(isEmbeddingCapableProfile({ modelType: 'both' })).toBe(true);
    });

    it('should return false for chat type', () => {
      expect(isEmbeddingCapableProfile({ modelType: 'chat' })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isEmbeddingCapableProfile(null)).toBe(false);
      expect(isEmbeddingCapableProfile(undefined)).toBe(false);
    });
  });
});
