/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
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
  });

  it('should return initial state with no data', () => {
    const { result } = renderHook(() => useRealTimeValidation(null));

    expect(result.current).toEqual({
      isValid: true,
      errors: [],
      warnings: [],
      isValidating: false,
    });
  });

  it('should not call API when disabled', () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;

    renderHook(() => useRealTimeValidation({ name: 'test' }, { enabled: false }));

    expect(mockPost).not.toHaveBeenCalled();
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

    const { result, rerender } = renderHook(
      ({ data }) => useRealTimeValidation(data, { debounceMs: 0 }),
      { initialProps: { data: { name: '' } } }
    );

    // Trigger validation by changing data
    await act(async () => {
      rerender({ data: { name: 'x' } });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.isValid).toBe(false);
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

    const { rerender } = renderHook(
      ({ data }) => useRealTimeValidation(data, { debounceMs: 0, profileId: 'strict' }),
      { initialProps: { data: { name: 'test' } } }
    );

    await act(async () => {
      rerender({ data: { name: 'test2' } });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/validate/bot-config',
      { configData: { name: 'test2' }, profileId: 'strict' },
      expect.any(Object)
    );
  });

  it('should handle validation errors gracefully', async () => {
    const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    mockPost.mockRejectedValue(new Error('Network error'));

    const { result, rerender } = renderHook(
      ({ data }) => useRealTimeValidation(data, { debounceMs: 0 }),
      { initialProps: { data: { name: 'test' } } }
    );

    await act(async () => {
      rerender({ data: { name: 'test2' } });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should not crash
    expect(consoleError).toHaveBeenCalled();
    expect(result.current.isValid).toBe(true); // Should remain stable on error

    consoleError.mockRestore();
  });
});
