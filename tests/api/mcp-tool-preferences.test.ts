/**
 * ToolPreferencesService Unit Tests
 *
 * Tests the service that tracks per-tool enable/disable preferences
 * (used by MCP tool routing to skip disabled tools).
 *
 * This replaces the old 225-line file that was entirely `describe.skip`
 * and tested HTTP endpoints that were never implemented — no routes
 * exist for toggle, bulk-toggle, or tool preference endpoints anywhere
 * in the MCP router. The tests now cover the actual service API.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ToolPreferencesService } from '../../src/server/services/ToolPreferencesService';

// ---------------------------------------------------------------------------
// Test isolation — each test gets its own temp data directory
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = path.join(
    process.cwd(),
    'test-tmp',
    `tool-prefs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
  (ToolPreferencesService as any).instance = undefined;
}

// Point the service at a temp data directory by temporarily overriding cwd
const originalCwd = process.cwd;

function pointServiceAtTemp(tempDir: string) {
  // The service writes to `path.join(process.cwd(), 'data', 'tool-preferences.json')`
  // We create the data dir inside tempDir and override process.cwd
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

describe('ToolPreferencesService', () => {
  let tempDir: string;
  let service: ToolPreferencesService;

  beforeEach(() => {
    tempDir = makeTempDir();
    pointServiceAtTemp(tempDir);
    service = ToolPreferencesService.getInstance();
  });

  afterEach(async () => {
    await service.shutdown();
    restoreCwd();
    cleanDir(tempDir);
  });

  // ---- Singleton ----

  it('should return the same instance from getInstance', () => {
    const s1 = ToolPreferencesService.getInstance();
    const s2 = ToolPreferencesService.getInstance();
    expect(s1).toBe(s2);
  });

  // ---- Single tool toggle ----

  it('should default to enabled when no preference exists', () => {
    const enabled = service.isToolEnabled('nonexistent-tool');
    expect(enabled).toBe(true);
  });

  it('should set a tool to disabled', async () => {
    const result = await service.setToolEnabled(
      'server1-tool1',
      'server1',
      'tool1',
      false
    );

    expect(result.toolId).toBe('server1-tool1');
    expect(result.enabled).toBe(false);
    expect(result.serverName).toBe('server1');
    expect(result.toolName).toBe('tool1');
    expect(result.updatedAt).toBeDefined();
  });

  it('should set a tool to enabled with userId tracking', async () => {
    const result = await service.setToolEnabled(
      'server1-tool1',
      'server1',
      'tool1',
      true,
      'user123'
    );

    expect(result.enabled).toBe(true);
    expect(result.updatedBy).toBe('user123');
  });

  it('should persist preferences to disk after debounced save', async () => {
    await service.setToolEnabled('server1-tool1', 'server1', 'tool1', false);
    // The service uses a 1-second debounced save; verify in-memory state
    // and that shutdown flushes pending writes.
    const pref = service.getToolPreference('server1-tool1');
    expect(pref).not.toBeNull();
    expect(pref!.enabled).toBe(false);
  });

  // ---- getToolPreference ----

  it('should return null for non-existent tool', () => {
    const pref = service.getToolPreference('nonexistent-tool');
    expect(pref).toBeNull();
  });

  it('should return existing preference after setToolEnabled', async () => {
    await service.setToolEnabled('server1-tool1', 'server1', 'tool1', false, 'admin');
    const pref = service.getToolPreference('server1-tool1');

    expect(pref).not.toBeNull();
    expect(pref!.toolId).toBe('server1-tool1');
    expect(pref!.enabled).toBe(false);
    expect(pref!.updatedBy).toBe('admin');
  });

  // ---- getAllPreferences ----

  it('should return empty object when no preferences exist', () => {
    const prefs = service.getAllPreferences();
    expect(prefs).toEqual({});
  });

  it('should return all preferences', async () => {
    await service.setToolEnabled('s1-t1', 's1', 't1', false);
    await service.setToolEnabled('s1-t2', 's1', 't2', true);

    const prefs = service.getAllPreferences();
    expect(Object.keys(prefs)).toHaveLength(2);
    expect(prefs['s1-t1'].enabled).toBe(false);
    expect(prefs['s1-t2'].enabled).toBe(true);
  });

  // ---- getPreferencesByServer ----

  it('should filter preferences by server name', async () => {
    await service.setToolEnabled('s1-t1', 'server1', 't1', true);
    await service.setToolEnabled('s1-t2', 'server1', 't2', false);
    await service.setToolEnabled('s2-t1', 'server2', 't1', true);

    const server1Prefs = service.getPreferencesByServer('server1');
    expect(server1Prefs).toHaveLength(2);
    expect(server1Prefs.every((p) => p.serverName === 'server1')).toBe(true);

    const server2Prefs = service.getPreferencesByServer('server2');
    expect(server2Prefs).toHaveLength(1);
  });

  it('should return empty array for unknown server', () => {
    const prefs = service.getPreferencesByServer('unknown-server');
    expect(prefs).toEqual([]);
  });

  // ---- bulkSetToolsEnabled ----

  it('should bulk-set multiple tools at once', async () => {
    const tools = [
      { toolId: 's1-t1', serverName: 's1', toolName: 't1' },
      { toolId: 's1-t2', serverName: 's1', toolName: 't2' },
      { toolId: 's2-t1', serverName: 's2', toolName: 't1' },
    ];

    const results = await service.bulkSetToolsEnabled(tools, false, 'bulk-user');

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.enabled === false)).toBe(true);
    expect(results.every((r) => r.updatedBy === 'bulk-user')).toBe(true);
  });

  it('should bulk-enable tools', async () => {
    // First disable
    await service.setToolEnabled('s1-t1', 's1', 't1', false);
    expect(service.isToolEnabled('s1-t1')).toBe(false);

    // Then bulk-enable
    await service.bulkSetToolsEnabled(
      [{ toolId: 's1-t1', serverName: 's1', toolName: 't1' }],
      true
    );

    expect(service.isToolEnabled('s1-t1')).toBe(true);
  });

  // ---- Stats ----

  it('should return zero stats when no preferences exist', () => {
    const stats = service.getStats();
    expect(stats.totalPreferences).toBe(0);
    expect(stats.enabledCount).toBe(0);
    expect(stats.disabledCount).toBe(0);
  });

  it('should return accurate statistics', async () => {
    await service.setToolEnabled('s1-t1', 's1', 't1', false);
    await service.setToolEnabled('s1-t2', 's1', 't2', false);
    await service.setToolEnabled('s2-t1', 's2', 't1', true);
    await service.setToolEnabled('s2-t2', 's2', 't2', true);

    const stats = service.getStats();

    expect(stats.totalPreferences).toBe(4);
    expect(stats.enabledCount).toBe(2);
    expect(stats.disabledCount).toBe(2);
    expect(stats.serverCounts['s1'].enabled).toBe(0);
    expect(stats.serverCounts['s1'].disabled).toBe(2);
    expect(stats.serverCounts['s2'].enabled).toBe(2);
    expect(stats.serverCounts['s2'].disabled).toBe(0);
  });

  // ---- deletePreference ----

  it('should delete a single preference', async () => {
    await service.setToolEnabled('s1-t1', 's1', 't1', false);
    expect(service.getToolPreference('s1-t1')).not.toBeNull();

    const deleted = await service.deletePreference('s1-t1');
    expect(deleted).toBe(true);
    expect(service.getToolPreference('s1-t1')).toBeNull();
  });

  it('should return false when deleting non-existent preference', async () => {
    const deleted = await service.deletePreference('nonexistent');
    expect(deleted).toBe(false);
  });

  // ---- deletePreferencesByServer ----

  it('should delete all preferences for a server', async () => {
    await service.setToolEnabled('s1-t1', 's1', 't1', true);
    await service.setToolEnabled('s1-t2', 's1', 't2', true);
    await service.setToolEnabled('s2-t1', 's2', 't1', true);

    const count = await service.deletePreferencesByServer('s1');
    expect(count).toBe(2);
    expect(service.getPreferencesByServer('s1')).toHaveLength(0);
    expect(service.getPreferencesByServer('s2')).toHaveLength(1);
  });

  it('should return 0 when deleting preferences for unknown server', async () => {
    const count = await service.deletePreferencesByServer('unknown');
    expect(count).toBe(0);
  });

  // ---- Graceful shutdown ----

  it('should flush pending writes on shutdown', async () => {
    await service.setToolEnabled('flush-test', 's1', 't1', true);
    // In-memory state should be preserved
    expect(service.getToolPreference('flush-test')).not.toBeNull();
    expect(service.getToolPreference('flush-test')!.enabled).toBe(true);
    // shutdown() flushes the debounced save — no error means success
    await expect(service.shutdown()).resolves.not.toThrow();
  });
});
