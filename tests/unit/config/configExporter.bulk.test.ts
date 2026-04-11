/**
 * Regression tests for the N+1 → bulk-lookup optimisation in ConfigExporter.
 *
 * Introduced in commit 7c1cef58 (⚡ Bolt: Replace N+1 queries with bulk lookup).
 * These tests ensure the optimisation is never inadvertently reverted: the
 * exporter MUST call getBotConfigurationsBulk exactly once regardless of how
 * many bot IDs are in the export set, and must NEVER fall back to per-bot
 * getConfiguration() calls.
 */

import { ConfigExporter } from '../../../src/server/services/config/ConfigExporter';

const makeDbManager = (botCount: number) => {
  const configs = Array.from({ length: botCount }, (_, i) => ({
    id: i + 1,
    name: `bot-${i + 1}`,
    type: 'discord',
    config: {},
  }));

  return {
    getBotConfigurationsBulk: jest.fn().mockResolvedValue(configs),
    // Per-bot method — must NOT be called in the bulk path
    getConfiguration: jest.fn().mockResolvedValue(configs[0]),
    getBotConfigurationVersionsBulk: jest.fn().mockResolvedValue(new Map()),
    getConfigurationVersions: jest.fn().mockResolvedValue([]),
  };
};

const makeTemplateSvc = () => ({ getAllTemplates: jest.fn().mockResolvedValue([]) });
const makeVersionSvc = () => ({ getVersions: jest.fn().mockResolvedValue([]) });

const makeExporter = (dbMgr: ReturnType<typeof makeDbManager>) =>
  // Private constructor — use cast to bypass TypeScript enforcement in tests
  new (ConfigExporter as any)(dbMgr, makeTemplateSvc(), makeVersionSvc(), '/tmp/test-exports') as ConfigExporter;

describe('ConfigExporter — bulk lookup optimisation', () => {
  let exporter: ConfigExporter;
  let dbManager: ReturnType<typeof makeDbManager>;

  const BOT_IDS = Array.from({ length: 50 }, (_, i) => i + 1);

  beforeEach(() => {
    dbManager = makeDbManager(BOT_IDS.length);
    exporter = makeExporter(dbManager);
  });

  it('calls getBotConfigurationsBulk exactly once for any number of bot IDs', async () => {
    await exporter.exportConfigurations(BOT_IDS, { format: 'json' });

    expect(dbManager.getBotConfigurationsBulk).toHaveBeenCalledTimes(1);
    expect(dbManager.getBotConfigurationsBulk).toHaveBeenCalledWith(BOT_IDS);
  });

  it('never calls the per-bot getConfiguration method (N+1 guard)', async () => {
    await exporter.exportConfigurations(BOT_IDS, { format: 'json' });

    expect(dbManager.getConfiguration).not.toHaveBeenCalled();
  });

  it('passes all IDs in a single call regardless of bot count', async () => {
    // Use 50 bots (below the MAX_EXPORT_CONFIGS limit)
    const moderateBotIds = Array.from({ length: 50 }, (_, i) => i + 1);
    const localDbManager = makeDbManager(moderateBotIds.length);
    const localExporter = makeExporter(localDbManager);

    await localExporter.exportConfigurations(moderateBotIds, { format: 'json' });

    // Single bulk call, not batched per-bot
    expect(localDbManager.getBotConfigurationsBulk).toHaveBeenCalledTimes(1);
  });
});
