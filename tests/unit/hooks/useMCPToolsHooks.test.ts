/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react';

jest.mock('../../../../../src/client/src/services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../../../src/client/src/hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn((key: string, initial: any) => [initial, jest.fn()]),
}));

jest.mock('../../../../../src/client/src/hooks/useUrlParams', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    values: { search: '', category: 'all', server: 'all', view: 'all', sortBy: 'name' },
    setValue: jest.fn(),
  })),
}));

import { apiService } from '../../../../../src/client/src/services/api';
import { useToolHistory } from '../../../../../src/client/src/pages/MCPToolsPage/hooks/useToolHistory';
import { useToolExecution } from '../../../../../src/client/src/pages/MCPToolsPage/hooks/useToolExecution';
import { useToolRegistry } from '../../../../../src/client/src/pages/MCPToolsPage/hooks/useToolRegistry';

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useToolHistory', () => {
  it('initialises with empty history and showHistory=false', () => {
    const { result } = renderHook(() => useToolHistory({ setAlert: jest.fn() }));
    expect(result.current.showHistory).toBe(false);
    expect(result.current.executionHistory).toEqual([]);
    expect(result.current.loadingHistory).toBe(false);
  });

  it('fetchHistory populates executionHistory on success', async () => {
    const mockHistory = [{ id: '1', toolName: 'test', status: 'success' }];
    (apiService.get as jest.Mock).mockResolvedValueOnce({ data: mockHistory });

    const { result } = renderHook(() => useToolHistory({ setAlert: jest.fn() }));

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(result.current.executionHistory).toEqual(mockHistory);
    expect(result.current.loadingHistory).toBe(false);
  });

  it('fetchHistory calls setAlert on error', async () => {
    (apiService.get as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    const setAlert = jest.fn();

    const { result } = renderHook(() => useToolHistory({ setAlert }));

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(setAlert).toHaveBeenCalledWith({ type: 'error', message: 'Failed to load history' });
  });

  it('setShowHistory toggles the history panel', () => {
    const { result } = renderHook(() => useToolHistory({ setAlert: jest.fn() }));

    act(() => {
      result.current.setShowHistory(true);
    });

    expect(result.current.showHistory).toBe(true);
  });
});

describe('useToolExecution', () => {
  const mockProps = {
    setAlert: jest.fn(),
    setUsageCounts: jest.fn(),
    setRecentlyUsed: jest.fn(),
  };

  const mockTool: any = {
    id: 'tool-1',
    name: 'test-tool',
    serverName: 'server-1',
    description: 'A test tool',
    inputSchema: {},
  };

  it('initialises with no selected tool and not running', () => {
    const { result } = renderHook(() => useToolExecution(mockProps));
    expect(result.current.selectedTool).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.recentResults).toEqual([]);
  });

  it('handleRunTool sets selectedTool and initialArgs', () => {
    const { result } = renderHook(() => useToolExecution(mockProps));
    const args = { param: 'value' };

    act(() => {
      result.current.handleRunTool(mockTool, args);
    });

    expect(result.current.selectedTool).toEqual(mockTool);
    expect(result.current.initialArgs).toEqual(args);
  });

  it('handleExecuteTool on success sets result and shows modal', async () => {
    (apiService.post as jest.Mock).mockResolvedValue({ result: 'ok' });

    const { result } = renderHook(() => useToolExecution(mockProps));

    await act(async () => {
      await result.current.handleExecuteTool(mockTool, { param: 'value' });
    });

    expect(result.current.selectedResult?.isError).toBe(false);
    expect(result.current.showResultModal).toBe(true);
    expect(result.current.recentResults).toHaveLength(1);
  });

  it('handleExecuteTool on failure sets error result', async () => {
    (apiService.post as jest.Mock).mockRejectedValue(new Error('tool failed'));

    const { result } = renderHook(() => useToolExecution(mockProps));

    await act(async () => {
      await result.current.handleExecuteTool(mockTool, {});
    });

    expect(result.current.selectedResult?.isError).toBe(true);
    expect(result.current.showResultModal).toBe(true);
  });
});

describe('useToolRegistry', () => {
  it('initialises with empty tools and loading=true', () => {
    (apiService.get as jest.Mock).mockResolvedValue({ servers: [] });
    const { result } = renderHook(() => useToolRegistry({ setAlert: jest.fn() }));
    expect(result.current.tools).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('handleToggleFavorite adds and removes favorites', () => {
    (apiService.get as jest.Mock).mockResolvedValue({ servers: [] });
    const setFavoritesMock = jest.fn();
    const { useLocalStorage } = require('../../../../../src/client/src/hooks/useLocalStorage');
    useLocalStorage.mockImplementation((key: string, initial: any) => {
      if (key === 'mcp-tools-favorites') return [[], setFavoritesMock];
      return [initial, jest.fn()];
    });

    const { result } = renderHook(() => useToolRegistry({ setAlert: jest.fn() }));

    act(() => {
      result.current.handleToggleFavorite('tool-1');
    });

    expect(setFavoritesMock).toHaveBeenCalled();
  });
});
