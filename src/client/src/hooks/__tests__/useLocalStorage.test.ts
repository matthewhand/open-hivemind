import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('returns initial value when no stored value exists', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('testKey');
  });

  test('returns stored value when it exists', () => {
    const storedValue = 'stored value';
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue));

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe(storedValue);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('testKey');
  });

  test('handles JSON parsing errors gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
  });

  test('updates value and stores in localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('new value'));
  });

  test('handles function updates', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(1));
  });

  test('handles complex objects', () => {
    const initialObject = { name: 'test', count: 0 };
    const updatedObject = { name: 'test', count: 1 };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(initialObject));

    const { result } = renderHook(() => useLocalStorage('objectKey', initialObject));

    act(() => {
      result.current[1](updatedObject);
    });

    expect(result.current[0]).toEqual(updatedObject);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('objectKey', JSON.stringify(updatedObject));
  });

  test('handles localStorage errors during setItem', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('new value');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error saving to localStorage:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('handles localStorage errors during getItem', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('Storage access denied');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
    expect(consoleSpy).toHaveBeenCalledWith('Error reading from localStorage:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});