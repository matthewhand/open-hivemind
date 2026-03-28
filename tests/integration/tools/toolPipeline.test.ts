/**
 * Integration test: tool profiles + registry pipeline.
 *
 * Tests the full pipeline of tool profile configuration combined
 * with the ProviderRegistry, simulating how the application wires
 * tool providers and installers together.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProviderRegistry } from '../../../src/registries/ProviderRegistry';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-pipeline-'));
  process.env.NODE_CONFIG_DIR = tmpDir;
  jest.resetModules();

  // Reset the singleton registry state
  const registry = ProviderRegistry.getInstance();
  (registry as any).providers = new Map();
  (registry as any).installers = new Map();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.NODE_CONFIG_DIR;
});

function makeToolInstaller(id: string) {
  return {
    id,
    label: `Installer-${id}`,
    checkPrerequisites: jest.fn().mockResolvedValue(true),
    checkInstalled: jest.fn().mockResolvedValue(false),
    install: jest.fn().mockResolvedValue({ success: true, message: `${id} installed` }),
    start: jest.fn().mockResolvedValue({ success: true, message: `${id} started` }),
  } as any;
}

function makeProvider(id: string, type: 'messenger' | 'llm' = 'llm') {
  return {
    id,
    label: `Provider-${id}`,
    type,
    getSchema: jest.fn().mockReturnValue({}),
    getConfig: jest.fn().mockReturnValue({}),
    getSensitiveKeys: jest.fn().mockReturnValue([]),
  } as any;
}

describe('Tool pipeline integration', () => {
  it('tool profiles + registry work together for provider discovery', () => {
    // Step 1: Save tool profiles
    const { saveToolProfiles } = require('../../../src/config/toolProfiles');
    saveToolProfiles({
      tool: [
        { key: 'mcp-calculator', name: 'Calculator', provider: 'mcp', config: { serverUrl: 'http://localhost:3001' } },
        { key: 'mcp-weather', name: 'Weather', provider: 'mcp', config: { serverUrl: 'http://localhost:3002' } },
      ],
    });

    // Step 2: Register corresponding providers
    const registry = ProviderRegistry.getInstance();
    registry.register(makeProvider('openai'));
    registry.registerInstaller(makeToolInstaller('mcp-calculator'));
    registry.registerInstaller(makeToolInstaller('mcp-weather'));

    // Step 3: Verify we can look up profiles and installers
    jest.resetModules();
    const { getToolProfileByKey } = require('../../../src/config/toolProfiles');

    const calcProfile = getToolProfileByKey('mcp-calculator');
    expect(calcProfile).toBeDefined();
    expect(calcProfile.config.serverUrl).toBe('http://localhost:3001');

    const calcInstaller = registry.getInstaller('mcp-calculator');
    expect(calcInstaller).toBeDefined();
    expect(calcInstaller!.id).toBe('mcp-calculator');

    // Step 4: Verify we can install
    expect(registry.getAllInstallers()).toHaveLength(2);
  });

  it('registry isolates providers from installers', () => {
    const registry = ProviderRegistry.getInstance();

    registry.register(makeProvider('openai'));
    registry.registerInstaller(makeToolInstaller('openswarm'));

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAllInstallers()).toHaveLength(1);

    // They don't cross-contaminate
    expect(registry.get('openswarm')).toBeUndefined();
    expect(registry.getInstaller('openai')).toBeUndefined();
  });

  it('round-trips tool profiles through save, corrupt, and recovery', () => {
    const mod = require('../../../src/config/toolProfiles');

    // Save valid profile
    mod.saveToolProfiles({
      tool: [{ key: 'valid', name: 'Valid', provider: 'mcp', config: {} }],
    });

    // Corrupt the file
    fs.writeFileSync(path.join(tmpDir, 'tool-profiles.json'), 'CORRUPT');

    // Reload — should get defaults
    jest.resetModules();
    const { loadToolProfiles } = require('../../../src/config/toolProfiles');
    expect(loadToolProfiles()).toEqual({ tool: [] });
  });

  it('end-to-end: register installer, check prereqs, install, start', async () => {
    const registry = ProviderRegistry.getInstance();
    const installer = makeToolInstaller('test-tool');
    registry.registerInstaller(installer);

    const found = registry.getInstaller('test-tool')!;
    expect(found).toBeDefined();

    const prereqs = await found.checkPrerequisites();
    expect(prereqs).toBe(true);

    const installed = await found.checkInstalled();
    expect(installed).toBe(false);

    const installResult = await found.install();
    expect(installResult.success).toBe(true);

    const startResult = await found.start({ port: 8080 });
    expect(startResult.success).toBe(true);
  });

  it('getLLMProviders and getMessageProviders filter correctly with mixed registrations', () => {
    const registry = ProviderRegistry.getInstance();

    registry.register(makeProvider('openai', 'llm'));
    registry.register(makeProvider('slack', 'messenger'));
    registry.register(makeProvider('letta', 'llm'));
    registry.register(makeProvider('discord', 'messenger'));

    expect(registry.getLLMProviders()).toHaveLength(2);
    expect(registry.getMessageProviders()).toHaveLength(2);
    expect(registry.getAll()).toHaveLength(4);

    const llmIds = registry.getLLMProviders().map((p: any) => p.id);
    expect(llmIds).toContain('openai');
    expect(llmIds).toContain('letta');
  });
});
