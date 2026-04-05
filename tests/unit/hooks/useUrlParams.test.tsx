/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { useUrlParams } from '../../../src/client/src/hooks/useUrlParams';

// Mock useSearchParams
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: jest.fn(),
  };
});

describe('useUrlParams', () => {
  const mockSetSearchParams = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createMockSearchParams = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return {
      get: (key: string) => searchParams.get(key),
      toString: () => searchParams.toString(),
    };
  };

  it('should return default values when URL params are missing', () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      createMockSearchParams({}),
      mockSetSearchParams,
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => useUrlParams({
        search: { type: 'string', default: '' },
        page: { type: 'number', default: 1 },
      }),
      { wrapper },
    );

    expect(result.current.values.search).toBe('');
    expect(result.current.values.page).toBe(1);
  });

  it('should parse string values from URL', () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      createMockSearchParams({ search: 'test' }),
      mockSetSearchParams,
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => useUrlParams({
        search: { type: 'string', default: '' },
      }),
      { wrapper },
    );

    expect(result.current.values.search).toBe('test');
  });

  it('should parse number values from URL', () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      createMockSearchParams({ page: '5' }),
      mockSetSearchParams,
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => useUrlParams({
        page: { type: 'number', default: 1 },
      }),
      { wrapper },
    );

    expect(result.current.values.page).toBe(5);
  });

  it('should parse string array values from URL', () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      createMockSearchParams({ tags: 'a,b,c' }),
      mockSetSearchParams,
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => useUrlParams({
        tags: { type: 'string[]', default: [] },
      }),
      { wrapper },
    );

    expect(result.current.values.tags).toEqual(['a', 'b', 'c']);
  });

  it('should debounce URL updates when configured', () => {
    (useSearchParams as jest.Mock).mockReturnValue([
      createMockSearchParams({}),
      mockSetSearchParams,
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => useUrlParams({
        search: { type: 'string', default: '', debounce: 300 },
      }),
      { wrapper },
    );

    act(() => {
      result.current.setValue('search', 'test');
    });

    // Should not have called setSearchParams yet
    expect(mockSetSearchParams).not.toHaveBeenCalled();

    // Advance timers past debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSetSearchParams).toHaveBeenCalled();
  });
});
