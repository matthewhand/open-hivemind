/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useRealTimeValidation } from '../../../src/client/src/hooks/useRealTimeValidation';
import { apiService } from '../../../src/client/src/services/api';

// Mock the apiService
jest.mock('../../../src/client/src/services/api', () => ({
  apiService: {
    post: jest.fn(),
  },
}));

describe('useRealTimeValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial state with no validation', () => {
    const { result } = renderHook(() => useRealTimeValidation(null));

    expect(result.current).toEqual({
      isValid: true,
      errors: [],
      warnings: [],
      isValidating: false,
    });
  });

  it('should debounce validation calls', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    mockPost.mockResolvedValue({
      success: true,
      result: {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100,
      },
    });

    const { result, rerender } = renderHook(
      ({ data }) => useRealTimeValidation(data, { debounceMs: 500 }),
      { initialProps: { data: { name: 'test' } } }
    );

    // Initial state should be validating
    expect(result.current.isValidating).toBe(false);

    // Change data multiple times rapidly
    rerender({ data: { name: 'test1' } });
    rerender({ data: { name: 'test2' } });
    rerender({ data: { name: 'test3' } });

    // Should not call API yet
    expect(mockPost).not.toHaveBeenCalled();

    // Fast-forward past debounce time
    jest.advanceTimersByTime(500);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    // Should only call API once after debounce
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/validate/bot-config',
      { configData: { name: 'test3' }, profileId: 'standard' },
      expect.any(Object)
    );
  });

  it('should set isValidating to true during validation', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;

    mockPost.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            result: {
              isValid: true,
              errors: [],
              warnings: [],
              score: 100,
            },
          });
        }, 50);
      }) as any;
    });

    const { result } = renderHook(() =>
      useRealTimeValidation({ name: 'test' }, { debounceMs: 100 })
    );

    // Fast-forward past debounce
    jest.advanceTimersByTime(100);

    // Should be validating
    await waitFor(() => {
      expect(result.current.isValidating).toBe(true);
    }, { timeout: 1000 });

    // Fast-forward validation time
    jest.advanceTimersByTime(50);

    // Should no longer be validating
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    }, { timeout: 1000 });
  });

  it('should return validation errors', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    const mockErrors = [
      {
        id: 'err-1',
        ruleId: 'required-name',
        message: 'Bot name is required',
        field: 'name',
        value: '',
        category: 'required' as const,
      },
    ];

    mockPost.mockResolvedValue({
      success: true,
      result: {
        isValid: false,
        errors: mockErrors,
        warnings: [],
        score: 0,
      },
    });

    const { result } = renderHook(() =>
      useRealTimeValidation({ name: '' }, { debounceMs: 100 })
    );

    // Fast-forward past debounce
    jest.advanceTimersByTime(100);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toEqual(mockErrors);
  });

  it('should return validation warnings', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    const mockWarnings = [
      {
        id: 'warn-1',
        ruleId: 'security-no-hardcoded-secrets',
        message: 'Potential hardcoded secret detected',
        field: 'config',
        value: '***REDACTED***',
        category: 'security' as const,
      },
    ];

    mockPost.mockResolvedValue({
      success: true,
      result: {
        isValid: true,
        errors: [],
        warnings: mockWarnings,
        score: 70,
      },
    });

    const { result } = renderHook(() =>
      useRealTimeValidation({ apiKey: 'sk-12345' }, { debounceMs: 100 })
    );

    // Fast-forward past debounce
    jest.advanceTimersByTime(100);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.warnings).toEqual(mockWarnings);
  });

  it('should cancel previous validation on data change', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    mockPost.mockResolvedValue({
      success: true,
      result: {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100,
      },
    });

    const { rerender } = renderHook(
      ({ data }) => useRealTimeValidation(data, { debounceMs: 100 }),
      { initialProps: { data: { name: 'test1' } } }
    );

    // Fast-forward halfway through debounce
    jest.advanceTimersByTime(50);

    // Change data before debounce completes
    rerender({ data: { name: 'test2' } });

    // Fast-forward the rest
    jest.advanceTimersByTime(100);

    // Wait for validation
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    // Should only validate the latest data
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/validate/bot-config',
      { configData: { name: 'test2' }, profileId: 'standard' },
      expect.any(Object)
    );
  });

  it('should handle validation errors gracefully', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    mockPost.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useRealTimeValidation({ name: 'test' }, { debounceMs: 100 })
    );

    // Fast-forward past debounce
    jest.advanceTimersByTime(100);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    // Should not crash, but log error
    expect(consoleError).toHaveBeenCalledWith('Validation error:', expect.any(Error));

    // State should remain stable (not showing validation errors)
    expect(result.current.isValid).toBe(true);

    consoleError.mockRestore();
  });

  it('should respect enabled option', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    mockPost.mockResolvedValue({
      success: true,
      result: {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100,
      },
    });

    const { result } = renderHook(() =>
      useRealTimeValidation({ name: 'test' }, { debounceMs: 100, enabled: false })
    );

    // Fast-forward past debounce
    jest.advanceTimersByTime(100);

    // Wait a bit
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    // Should not call API when disabled
    expect(mockPost).not.toHaveBeenCalled();

    // Should show as valid by default
    expect(result.current.isValid).toBe(true);
  });

  it('should use custom profile ID', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    mockPost.mockResolvedValue({
      success: true,
      result: {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100,
      },
    });

    renderHook(() =>
      useRealTimeValidation({ name: 'test' }, { debounceMs: 100, profileId: 'strict' })
    );

    // Fast-forward past debounce
    jest.advanceTimersByTime(100);

    // Wait for validation
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    // Should use custom profile
    expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/validate/bot-config',
      { configData: { name: 'test' }, profileId: 'strict' },
      expect.any(Object)
    );
  });
});
