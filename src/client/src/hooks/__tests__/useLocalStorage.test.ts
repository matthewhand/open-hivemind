import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useLocalStorage', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should return initial value when localStorage is empty', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
        expect(result.current[0]).toBe('initialValue');
    });

    it('should return stored value from localStorage', () => {
        localStorageMock.getItem.mockReturnValueOnce(JSON.stringify('storedValue'));
        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
        expect(result.current[0]).toBe('storedValue');
    });

    it('should update value and persist to localStorage', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

        act(() => {
            result.current[1]('newValue');
        });

        expect(result.current[0]).toBe('newValue');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('newValue'));
    });

    it('should support function updates', () => {
        const { result } = renderHook(() => useLocalStorage('counter', 0));

        act(() => {
            result.current[1]((prev) => prev + 1);
        });

        expect(result.current[0]).toBe(1);
    });

    it('should handle object values', () => {
        const initialObject = { name: 'test', count: 0 };
        const { result } = renderHook(() => useLocalStorage('objectKey', initialObject));

        act(() => {
            result.current[1]({ name: 'updated', count: 5 });
        });

        expect(result.current[0]).toEqual({ name: 'updated', count: 5 });
    });

    it('should handle array values', () => {
        const { result } = renderHook(() => useLocalStorage<string[]>('arrayKey', []));

        act(() => {
            result.current[1](['item1', 'item2']);
        });

        expect(result.current[0]).toEqual(['item1', 'item2']);
    });

    it('should return initial value on parse error', () => {
        localStorageMock.getItem.mockReturnValueOnce('invalid-json');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const { result } = renderHook(() => useLocalStorage('testKey', 'fallback'));

        expect(result.current[0]).toBe('fallback');
        consoleSpy.mockRestore();
    });
});
