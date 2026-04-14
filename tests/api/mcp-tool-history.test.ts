/**
 * Tool Execution History Service Tests
 *
 * Tests the ToolExecutionHistoryService that tracks MCP tool execution
 * history (used by the tool history page in the frontend).
 *
 * This replaces the old 282-line file that was entirely `describe.skip`
 * and tested HTTP endpoints that DON'T EXIST in the MCP router. No
 * /api/mcp/tools/history or /api/mcp/tools/stats routes exist.
 */
import fs from 'fs';
import path from 'path';
import { ToolExecutionHistoryService } from '../../src/server/services/ToolExecutionHistoryService';

// ---------------------------------------------------------------------------
// Test isolation — each test gets its own temp data file
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = path.join(
    process.cwd(),
    'test-tmp',
    `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function resetSingleton() {
  (ToolExecutionHistoryService as any).instance = undefined;
}

const originalCwd = process.cwd;

function pointServiceAtTemp(tempDir: string) {
  fs.mkdirSync(path.join(tempDir, 'data'), { recursive: true });
  process.cwd = () => tempDir;
  resetSingleton();
}

function restoreCwd() {
  process.cwd = originalCwd;
  resetSingleton();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ToolExecutionHistoryService', () => {
  let tempDir: string;
  let service: ToolExecutionHistoryService;

  beforeEach(() => {
    tempDir = makeTempDir();
    pointServiceAtTemp(tempDir);
    service = ToolExecutionHistoryService.getInstance();
  });

  afterEach(() => {
    restoreCwd();
    cleanDir(tempDir);
  });

  function entry(id: string, overrides: Record<string, any> = {}) {
    return {
      id,
      serverName: overrides.serverName || 's',
      toolName: overrides.toolName || 't',
      arguments: {},
      result: {},
      status: 'success' as const,
      executedAt: new Date().toISOString(),
      duration: 10,
      ...overrides,
    };
  }

  // ---- Singleton ----

  it('should return the same instance from getInstance', () => {
    const s1 = ToolExecutionHistoryService.getInstance();
    const s2 = ToolExecutionHistoryService.getInstance();
    expect(s1).toBe(s2);
  });

  // ---- Logging executions ----

  it('should log a successful tool execution', async () => {
    await service.logExecution(entry('exec-1', { toolName: 'get_forecast', serverName: 'weather' }));

    const history = await service.getExecutions();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('exec-1');
    expect(history[0].status).toBe('success');
  });

  it('should log a failed tool execution', async () => {
    await service.logExecution(entry('exec-2', {
      status: 'error' as const,
      error: 'Connection refused',
      duration: 5000,
    }));

    const history = await service.getExecutions();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('error');
    expect(history[0].error).toBe('Connection refused');
  });

  it('should append entries without overwriting existing ones', async () => {
    await service.logExecution(entry('a'));
    await service.logExecution(entry('b'));

    const history = await service.getExecutions();
    expect(history).toHaveLength(2);
  });

  // ---- Retrieval ----

  it('should return empty history when no executions logged', async () => {
    expect(await service.getExecutions()).toEqual([]);
  });

  it('should return history sorted newest first', async () => {
    await service.logExecution(entry('old', { executedAt: '2024-01-01T00:00:00Z' }));
    await service.logExecution(entry('new', { executedAt: '2024-12-01T00:00:00Z' }));

    const history = await service.getExecutions();
    expect(history[0].id).toBe('new');
    expect(history[1].id).toBe('old');
  });

  it('should filter executions by serverName', async () => {
    await service.logExecution(entry('a', { serverName: 'weather' }));
    await service.logExecution(entry('b', { serverName: 'db' }));
    await service.logExecution(entry('c', { serverName: 'weather' }));

    const filtered = await service.getExecutions({ serverName: 'weather' });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.serverName === 'weather')).toBe(true);
  });

  it('should filter executions by toolName', async () => {
    await service.logExecution(entry('a', { toolName: 'forecast' }));
    await service.logExecution(entry('b', { toolName: 'radar' }));

    const filtered = await service.getExecutions({ toolName: 'radar' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].toolName).toBe('radar');
  });

  it('should filter executions by status', async () => {
    await service.logExecution(entry('ok', { status: 'success' }));
    await service.logExecution(entry('fail', { status: 'error' as const, error: 'err' }));
    await service.logExecution(entry('ok2', { status: 'success' }));

    const errors = await service.getExecutions({ status: 'error' });
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe('fail');

    const successes = await service.getExecutions({ status: 'success' });
    expect(successes).toHaveLength(2);
  });

  it('should support pagination with limit', async () => {
    for (let i = 0; i < 5; i++) {
      await service.logExecution(entry(`e${i}`));
    }

    const limited = await service.getExecutions({ limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it('should support pagination with offset', async () => {
    for (let i = 0; i < 5; i++) {
      await service.logExecution(entry(`e${i}`));
    }

    const paged = await service.getExecutions({ limit: 2, offset: 2 });
    expect(paged).toHaveLength(2);
    // Entries are ordered newest-first (e4, e3, e2, e1, e0), so offset 2 gives e2, e1
    expect(paged).toHaveLength(2);
  });

  it('should retrieve a single entry by ID', async () => {
    await service.logExecution(entry('target', { arguments: { key: 'value' }, result: { out: 'ok' } }));

    const execEntry = await service.getExecutionById('target');
    expect(execEntry).not.toBeNull();
    expect(execEntry!.id).toBe('target');
  });

  it('should return null for non-existent ID', async () => {
    expect(await service.getExecutionById('nonexistent')).toBeNull();
  });

  // ---- Stats ----

  it('should return zero stats when no history exists', async () => {
    const stats = await service.getStats();
    expect(stats.totalExecutions).toBe(0);
    expect(stats.successfulExecutions).toBe(0);
    expect(stats.failedExecutions).toBe(0);
    expect(stats.averageDuration).toBe(0);
  });

  it('should return accurate statistics', async () => {
    await service.logExecution(entry('s1', { serverName: 'srv-a', toolName: 't1', duration: 100 }));
    await service.logExecution(entry('s2', { serverName: 'srv-a', toolName: 't2', duration: 200 }));
    await service.logExecution(entry('f1', { serverName: 'srv-b', toolName: 't1', status: 'error' as const, error: 'err', duration: 50 }));

    const stats = await service.getStats();

    expect(stats.totalExecutions).toBe(3);
    expect(stats.successfulExecutions).toBe(2);
    expect(stats.failedExecutions).toBe(1);
    expect(stats.averageDuration).toBeCloseTo(116.67, 1);
  });

  it('should track tool usage counts', async () => {
    await service.logExecution(entry('a', { serverName: 's', toolName: 'forecast' }));
    await service.logExecution(entry('b', { serverName: 's', toolName: 'forecast' }));
    await service.logExecution(entry('c', { serverName: 's', toolName: 'radar' }));

    const stats = await service.getStats();
    expect(stats.toolUsage['s/forecast']).toBe(2);
    expect(stats.toolUsage['s/radar']).toBe(1);
  });

  // ---- Persistence ----

  it('should persist entries to disk', async () => {
    await service.logExecution(entry('persist-test'));
    // Write happens asynchronously; wait a tick
    await new Promise((r) => setTimeout(r, 100));

    const historyFile = path.join(tempDir, 'data', 'tool-execution-history.jsonl');
    expect(fs.existsSync(historyFile)).toBe(true);

    const content = fs.readFileSync(historyFile, 'utf-8');
    expect(content).toContain('persist-test');
  });

  it('should load existing history from disk on initialization', async () => {
    // Write a history entry manually
    const historyFile = path.join(tempDir, 'data', 'tool-execution-history.jsonl');
    fs.writeFileSync(historyFile, JSON.stringify({
      id: 'preloaded',
      serverName: 'pre-s',
      toolName: 'pre-t',
      arguments: {},
      result: {},
      status: 'success',
      executedAt: '2024-01-01T00:00:00Z',
      duration: 42,
    }) + '\n');

    resetSingleton();
    const freshService = ToolExecutionHistoryService.getInstance();

    // Give it a moment to read the file
    await new Promise((r) => setTimeout(r, 100));

    const history = await freshService.getExecutions();
    expect(history.some((e) => e.id === 'preloaded')).toBe(true);
  });

  // ---- Retention policy ----

  it('should enforce max records retention policy', async () => {
    // MAX_RECORDS is 1000
    for (let i = 0; i < 1005; i++) {
      await service.logExecution(entry(`e${i}`));
    }

    const history = await service.getExecutions();
    expect(history.length).toBeLessThanOrEqual(1000);
  });
});
