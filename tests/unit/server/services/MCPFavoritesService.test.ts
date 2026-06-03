import fs from 'fs';
import os from 'os';
import path from 'path';
import { MCPFavoritesService } from '../../../../src/server/services/MCPFavoritesService';

/**
 * Tests for MCPFavoritesService — the server-side store that persists the MCP
 * Tools page registry preferences (favorites, recently-used, usage counts) so
 * they survive across devices/sessions instead of living only in localStorage.
 *
 * Each test uses an isolated temp file via `createForTesting` so the shared
 * singleton and the real `data/` directory are never touched.
 */
describe('MCPFavoritesService', () => {
  let tmpDir: string;
  let dataFile: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcp-fav-'));
    dataFile = path.join(tmpDir, 'mcp-favorites.json');
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('starts empty and creates the backing file', async () => {
    const service = MCPFavoritesService.createForTesting(dataFile);
    await service.ready();

    const data = service.getAll();
    expect(data.favorites).toEqual([]);
    expect(data.recentlyUsed).toEqual([]);
    expect(data.usageCounts).toEqual({});
    expect(fs.existsSync(dataFile)).toBe(true);
  });

  it('persists a partial update and leaves omitted fields unchanged', async () => {
    const service = MCPFavoritesService.createForTesting(dataFile);
    await service.ready();

    await service.setAll({ favorites: ['srv-toolA'], usageCounts: { 'srv-toolA': 3 } });
    // Update only recentlyUsed — favorites/usageCounts must remain.
    const result = await service.setAll({
      recentlyUsed: [{ toolId: 'srv-toolA', timestamp: '2026-01-01T00:00:00.000Z' }],
    });

    expect(result.favorites).toEqual(['srv-toolA']);
    expect(result.usageCounts).toEqual({ 'srv-toolA': 3 });
    expect(result.recentlyUsed).toHaveLength(1);
  });

  it('de-duplicates favorites', async () => {
    const service = MCPFavoritesService.createForTesting(dataFile);
    await service.ready();

    const result = await service.setAll({ favorites: ['a', 'b', 'a'] });
    expect(result.favorites).toEqual(['a', 'b']);
  });

  it('toggles a favorite on and off', async () => {
    const service = MCPFavoritesService.createForTesting(dataFile);
    await service.ready();

    expect(await service.toggleFavorite('srv-toolX')).toEqual(['srv-toolX']);
    expect(await service.toggleFavorite('srv-toolX')).toEqual([]);
  });

  it('reloads persisted data from disk into a fresh instance', async () => {
    const writer = MCPFavoritesService.createForTesting(dataFile);
    await writer.ready();
    await writer.setAll({
      favorites: ['srv-toolA'],
      usageCounts: { 'srv-toolA': 7 },
      recentlyUsed: [{ toolId: 'srv-toolA', timestamp: '2026-01-01T00:00:00.000Z' }],
    });

    // Simulate a new process / device picking up the same backing file.
    const reader = MCPFavoritesService.createForTesting(dataFile);
    await reader.ready();
    const data = reader.getAll();

    expect(data.favorites).toEqual(['srv-toolA']);
    expect(data.usageCounts).toEqual({ 'srv-toolA': 7 });
    expect(data.recentlyUsed[0].toolId).toBe('srv-toolA');
  });

  it('caps recently-used entries at the configured maximum', async () => {
    const service = MCPFavoritesService.createForTesting(dataFile);
    await service.ready();

    const many = Array.from({ length: 25 }, (_v, i) => ({
      toolId: `srv-tool${i}`,
      timestamp: '2026-01-01T00:00:00.000Z',
    }));
    const result = await service.setAll({ recentlyUsed: many });

    expect(result.recentlyUsed).toHaveLength(10);
    expect(result.recentlyUsed[0].toolId).toBe('srv-tool0');
  });

  it('tolerates a corrupt backing file by starting fresh', async () => {
    await fs.promises.writeFile(dataFile, '{ not valid json', 'utf8');
    const service = MCPFavoritesService.createForTesting(dataFile);
    await service.ready();

    expect(service.getAll().favorites).toEqual([]);
  });
});
