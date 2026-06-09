import fs from 'fs';
import os from 'os';
import path from 'path';
import { MCPToolHistoryService } from '../../../../src/server/services/MCPToolHistoryService';

/**
 * Tests for MCPToolHistoryService — the file-backed store behind
 * POST/GET /api/mcp/tools/history (MCP Tools page "Execution History" modal).
 *
 * Each test uses an isolated temp file via `createForTesting` so the shared
 * singleton and the real `data/` directory are never touched.
 */
describe('MCPToolHistoryService', () => {
  let tmpDir: string;
  let dataFile: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcp-hist-'));
    dataFile = path.join(tmpDir, 'mcp-tool-history.json');
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('starts empty and creates the backing file', async () => {
    const service = MCPToolHistoryService.createForTesting(dataFile);
    await service.ready();

    expect(service.list()).toEqual([]);
    expect(fs.existsSync(dataFile)).toBe(true);
  });

  it('stores a record, defaulting missing optional fields', async () => {
    const service = MCPToolHistoryService.createForTesting(dataFile);
    await service.ready();

    const record = await service.add({ serverName: 'srv', toolName: 'echo', arguments: { q: 1 } });

    expect(record.id).toEqual(expect.any(String));
    expect(record.id.length).toBeGreaterThan(0);
    expect(record.status).toBe('success');
    expect(record.duration).toBe(0);
    expect(Date.parse(record.executedAt)).not.toBeNaN();
    expect(service.list()).toHaveLength(1);
  });

  it('preserves explicit fields from the client payload', async () => {
    const service = MCPToolHistoryService.createForTesting(dataFile);
    await service.ready();

    const record = await service.add({
      id: 'fixed-id',
      serverName: 'srv',
      toolName: 'echo',
      arguments: { q: 'hello' },
      result: { ok: true },
      status: 'error',
      error: 'boom',
      executedAt: '2026-01-01T00:00:00.000Z',
      duration: 42,
    });

    expect(record).toMatchObject({
      id: 'fixed-id',
      status: 'error',
      error: 'boom',
      executedAt: '2026-01-01T00:00:00.000Z',
      duration: 42,
    });
  });

  it('returns newest records first and respects the list limit', async () => {
    const service = MCPToolHistoryService.createForTesting(dataFile);
    await service.ready();

    await service.add({ serverName: 'srv', toolName: 'first' });
    await service.add({ serverName: 'srv', toolName: 'second' });
    await service.add({ serverName: 'srv', toolName: 'third' });

    const limited = service.list(2);
    expect(limited).toHaveLength(2);
    expect(limited[0].toolName).toBe('third');
    expect(limited[1].toolName).toBe('second');
  });

  it('caps stored history at the configured maximum', async () => {
    const service = MCPToolHistoryService.createForTesting(dataFile);
    await service.ready();

    for (let i = 0; i < 205; i++) {
      await service.add({ serverName: 'srv', toolName: `tool-${i}` });
    }

    const all = service.list(1000);
    expect(all).toHaveLength(200);
    expect(all[0].toolName).toBe('tool-204');
  });

  it('reloads persisted records from disk into a fresh instance', async () => {
    const writer = MCPToolHistoryService.createForTesting(dataFile);
    await writer.ready();
    await writer.add({ serverName: 'srv', toolName: 'echo', arguments: { q: 1 } });

    const reader = MCPToolHistoryService.createForTesting(dataFile);
    await reader.ready();

    const records = reader.list();
    expect(records).toHaveLength(1);
    expect(records[0].toolName).toBe('echo');
  });

  it('tolerates a corrupt backing file by starting fresh', async () => {
    await fs.promises.writeFile(dataFile, '{ not valid json', 'utf8');
    const service = MCPToolHistoryService.createForTesting(dataFile);
    await service.ready();

    expect(service.list()).toEqual([]);
  });
});
