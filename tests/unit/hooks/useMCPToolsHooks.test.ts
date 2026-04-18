/**
 * MCP Tools Page Hook Tests
 *
 * Tests useToolHistory and useToolExecution — the React hooks that power
 * the MCP Tools page (tool execution, history tracking, and result handling).
 *
 * useToolRegistry is tested separately because it pulls in the heavy
 * useUrlParams + useLocalStorage dependency chain that causes OOM in jsdom.
 *
 * This replaces the old 171-line file where ALL 10 tests were in
 * describe.skip blocks due to OOM issues. The new tests use minimal
 * mocks and focus on the hooks that can load reliably.
 *
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useToolExecution } from '../../../src/client/src/pages/MCPToolsPage/hooks/useToolExecution';
import { useToolHistory } from '../../../src/client/src/pages/MCPToolsPage/hooks/useToolHistory';
import { apiService } from '../../../src/client/src/services/api';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid',
  },
});

jest.mock('../../../src/client/src/services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApi = apiService as jest.Mocked<typeof apiService>;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// useToolHistory
// ---------------------------------------------------------------------------

describe('useToolHistory', () => {
  it('initialises with empty history and showHistory=false', () => {
    const { result } = renderHook(() => useToolHistory({ setAlert: jest.fn() }));
    expect(result.current.showHistory).toBe(false);
    expect(result.current.executionHistory).toEqual([]);
    expect(result.current.loadingHistory).toBe(false);
  });

  it('fetchHistory populates executionHistory on success', async () => {
    const mockHistory = [{ id: '1', toolName: 'test', status: 'success' }];
    mockApi.get.mockResolvedValueOnce({ data: mockHistory });

    const { result } = renderHook(() => useToolHistory({ setAlert: jest.fn() }));

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(result.current.executionHistory).toEqual(mockHistory);
    expect(result.current.loadingHistory).toBe(false);
  });

  it('fetchHistory calls setAlert on error', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network error'));
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

// ---------------------------------------------------------------------------
// useToolExecution
// ---------------------------------------------------------------------------

describe('useToolExecution', () => {
  const mockProps = {
    setAlert: jest.fn(),
    setUsageCounts: jest.fn(),
    setRecentlyUsed: jest.fn(),
  };

  const mockTool = {
    id: 'tool-1',
    name: 'test-tool',
    serverName: 'server-1',
    description: 'A test tool',
    inputSchema: {},
  } as any;

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
    mockApi.post.mockResolvedValueOnce({ result: 'ok' }); // execution
    mockApi.post.mockResolvedValueOnce({ success: true }); // history

    const { result } = renderHook(() => useToolExecution(mockProps));

    await act(async () => {
      await result.current.handleExecuteTool(mockTool, { param: 'value' });
    });

    expect(result.current.selectedResult?.isError).toBe(false);
    expect(result.current.showResultModal).toBe(true);
    expect(result.current.recentResults).toHaveLength(1);
    // Should have been called twice: once for execution, once for history
    expect(mockApi.post).toHaveBeenCalledTimes(2);
  });

  it('handleExecuteTool on failure sets error result', async () => {
    mockApi.post.mockRejectedValue(new Error('tool failed'));

    const { result } = renderHook(() => useToolExecution(mockProps));

    await act(async () => {
      await result.current.handleExecuteTool(mockTool, {});
    });

    expect(result.current.selectedResult?.isError).toBe(true);
    expect(result.current.showResultModal).toBe(true);
  });

  it('handleExecuteTool posts to the correct API endpoint', async () => {
    mockApi.post.mockResolvedValue({ result: 'ok' });

    const { result } = renderHook(() => useToolExecution(mockProps));

    await act(async () => {
      await result.current.handleExecuteTool(mockTool, { param: 'value' });
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/mcp/servers/server-1/call-tool',
      expect.objectContaining({ toolName: 'test-tool' })
    );
  });

  it('handleExecuteTool resets selectedTool after execution completes', async () => {
    mockApi.post.mockResolvedValue({ result: 'done' });

    const { result } = renderHook(() => useToolExecution(mockProps));

    await act(async () => {
      await result.current.handleExecuteTool(mockTool, {});
    });

    expect(result.current.selectedTool).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(mockApi.post).toHaveBeenCalledTimes(2);
  });

  it('handleExecuteTool limits recentResults to 20 entries', async () => {
    mockApi.post.mockResolvedValue({ result: 'ok' }); // handles both calls

    const { result } = renderHook(() => useToolExecution(mockProps));

    // Execute 25 tools
    for (let i = 0; i < 25; i++) {
      await act(async () => {
        await result.current.handleExecuteTool({ ...mockTool, id: `tool-${i}` }, {});
      });
    }

    expect(result.current.recentResults).toHaveLength(20);
  });
});
