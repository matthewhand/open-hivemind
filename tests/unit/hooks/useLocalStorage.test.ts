/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../../src/client/src/hooks/useLocalStorage';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should return initial value when no stored value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should return stored value when present', () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('stored');
  });

  it('should update value and persist to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '"updated"');
  });

  it('should support functional updates', () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(0));
    const { result } = renderHook(() => useLocalStorage('count', 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('count', '1');
  });

  it('should handle complex objects', () => {
    const initialObj = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('obj-key', initialObj));

    act(() => {
      result.current[1]({ name: 'updated', count: 1 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 1 });
  });

  it('should return initial value when localStorage is corrupted', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('Storage error');
    });
    const { result } = renderHook(() => useLocalStorage('corrupt-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('should handle null stored values', () => {
    mockLocalStorage.getItem.mockReturnValue('null');
    const { result } = renderHook(() => useLocalStorage('null-key', 'default'));
    expect(result.current[0]).toBeNull();
  });
});
