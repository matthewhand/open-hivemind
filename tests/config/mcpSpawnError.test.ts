import 'reflect-metadata';
import { EventEmitter } from 'events';
import { ServerLifecycle } from '@src/config/mcp/serverLifecycle';
import { ToolRegistry } from '@src/config/mcp/toolRegistry';
import type { MCPProviderConfig } from '@src/types/mcp';

// Mock child_process.spawn so we can simulate a spawn failure (e.g. ENOENT)
// without actually launching a process.
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';

const mockedSpawn = spawn as unknown as jest.Mock;

/**
 * Build a fake ChildProcess that emits an 'error' event on the next tick,
 * mimicking what Node does when a spawn fails (the command does not exist).
 */
function createErroringChildProcess(error: Error): EventEmitter {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: jest.Mock;
    killed: boolean;
    pid?: number;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = jest.fn();
  child.killed = false;
  child.pid = undefined;

  // Emit asynchronously so listeners registered after spawn() returns still fire.
  setImmediate(() => {
    child.emit('error', error);
  });

  return child;
}

const baseProvider: MCPProviderConfig = {
  id: 'mcp-test',
  name: 'Missing Command Provider',
  type: 'desktop',
  command: 'this-command-does-not-exist',
  args: '',
  env: {},
  enabled: true,
  timeout: 5,
};

describe('MCP spawn error handling', () => {
  beforeEach(() => {
    mockedSpawn.mockReset();
  });

  describe('ServerLifecycle.startProvider', () => {
    it('rejects and marks the provider as errored when spawn emits an error event', async () => {
      const spawnError = Object.assign(new Error('spawn this-command-does-not-exist ENOENT'), {
        code: 'ENOENT',
      });
      mockedSpawn.mockReturnValue(createErroringChildProcess(spawnError));

      const lifecycle = new ServerLifecycle();
      const providers = new Map<string, MCPProviderConfig>([[baseProvider.id, baseProvider]]);
      const emitter = new EventEmitter();
      const errorEvents: any[] = [];
      emitter.on('provider_error', (evt) => errorEvents.push(evt));

      lifecycle.initialize(providers, emitter);

      await expect(lifecycle.startProvider(baseProvider.id)).rejects.toThrow(/ENOENT/);

      const status = lifecycle.getStatus(baseProvider.id);
      expect(status?.status).toBe('error');
      expect(lifecycle.hasProcess(baseProvider.id)).toBe(false);
      expect(errorEvents).toHaveLength(1);
    });
  });

  describe('ToolRegistry.executeProviderTest', () => {
    it('resolves with success=false when spawn emits an error event', async () => {
      const spawnError = new Error('spawn this-command-does-not-exist ENOENT');
      mockedSpawn.mockReturnValue(createErroringChildProcess(spawnError));

      const registry = new ToolRegistry();
      const parseArgs = (args: string | string[]): string[] =>
        Array.isArray(args) ? args : [];

      const result = await registry.executeProviderTest(baseProvider, parseArgs);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });
  });
});
