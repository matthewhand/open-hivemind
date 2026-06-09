/**
 * Unit tests for {@link getTaskLlm} provider-construction coverage.
 *
 * Focus: task-based routing must be able to construct providers for ALL
 * wired LLM provider types, not just the hardcoded `openai`/`flowise`/
 * `openwebui` fast paths. Previously the switch statements in
 * `createProviderFromInstance` / `createProviderFromProfile` returned `null`
 * for types like `letta` and `openswarm`, silently falling back to the
 * default provider. These now resolve through the shared plugin loader.
 */

import type { ILlmProvider } from '@hivemind/shared-types';
import { getTaskLlm } from '@src/llm/taskLlmRouter';

// --- Mocks for collaborators ----------------------------------------------

const mockLoadPlugin = jest.fn();
const mockInstantiateLlmProvider = jest.fn();

jest.mock('@src/plugins/PluginLoader', () => ({
  loadPlugin: (...args: unknown[]) => mockLoadPlugin(...args),
  instantiateLlmProvider: (...args: unknown[]) => mockInstantiateLlmProvider(...args),
}));

const mockGetAllProviders = jest.fn();
jest.mock('@src/config/ProviderConfigManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getAllProviders: (...args: unknown[]) => mockGetAllProviders(...args),
    }),
  },
}));

const mockGetGeneralSettings = jest.fn();
jest.mock('@src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: () => ({
      getGeneralSettings: (...args: unknown[]) => mockGetGeneralSettings(...args),
    }),
  },
}));

const mockGetLlmProfileByKey = jest.fn();
jest.mock('@src/config/llmProfiles', () => ({
  getLlmProfileByKey: (...args: unknown[]) => mockGetLlmProfileByKey(...args),
}));

const mockGetLlmProvider = jest.fn();
jest.mock('@llm/getLlmProvider', () => ({
  getLlmProvider: (...args: unknown[]) => mockGetLlmProvider(...args),
}));

// Task overrides are read via convict, which snapshots env at construction.
// Drive them directly through this mutable store instead.
const taskOverrides: Record<string, string> = {};
jest.mock('@config/llmTaskConfig', () => ({
  __esModule: true,
  default: {
    get: (key: string) => taskOverrides[key] ?? '',
  },
}));

// Avoid pulling MetricsCollector singleton side-effects into the test.
jest.mock('@src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: () => ({ recordLlmTokenUsage: jest.fn() }),
  },
}));

// Mock the OpenWebUI package provider so the router's `openwebui` singleton
// can be exercised without network/config side-effects.
const mockOwuiGenerateCompletion = jest.fn();
const mockOwuiSupportsCompletion = jest.fn();
jest.mock('@integrations/openwebui/openWebUIProvider', () => ({
  openWebUIProvider: {
    name: 'openwebui',
    supportsChatCompletion: () => true,
    supportsCompletion: (...args: unknown[]) => mockOwuiSupportsCompletion(...args),
    generateChatCompletion: jest.fn(),
    generateCompletion: (...args: unknown[]) => mockOwuiGenerateCompletion(...args),
  },
}));

jest.mock('@integrations/openwebui/runInference', () => ({
  generateChatCompletion: jest.fn().mockResolvedValue({ text: 'chat-ok' }),
}));

function makeProvider(name: string): ILlmProvider {
  return {
    name,
    supportsChatCompletion: () => true,
    supportsCompletion: () => false,
    generateChatCompletion: jest.fn().mockResolvedValue('ok'),
    generateCompletion: jest.fn().mockResolvedValue('ok'),
  } as unknown as ILlmProvider;
}

describe('taskLlmRouter provider-construction coverage', () => {
  const fallback = makeProvider('fallback');

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any task overrides + back-compat alias env vars.
    for (const k of Object.keys(taskOverrides)) {
      delete taskOverrides[k];
    }
    for (const t of ['SEMANTIC', 'SUMMARY', 'FOLLOWUP', 'IDLE']) {
      delete process.env[`LLM_${t}_PROVIDER`];
      delete process.env[`LLM_${t}_MODEL`];
    }
    mockGetLlmProvider.mockResolvedValue([fallback]);
    mockGetGeneralSettings.mockReturnValue({ perUseCaseEnabled: false, taskProfiles: {} });
  });

  it.each(['letta', 'openswarm'])(
    'constructs a provider-instance override of previously-uncovered type "%s" via the plugin loader',
    async (type) => {
      const pluginProvider = makeProvider(type);
      const fakeMod = { create: jest.fn() };
      mockLoadPlugin.mockResolvedValue(fakeMod);
      mockInstantiateLlmProvider.mockReturnValue(pluginProvider);

      mockGetAllProviders.mockReturnValue([
        { id: 'inst-1', name: type, type, enabled: true, config: { apiKey: 'x' } },
      ]);

      taskOverrides.LLM_TASK_SEMANTIC_PROVIDER = type;

      const result = await getTaskLlm('semantic');

      // Routed via plugin loader for the right package, not the default fallback.
      expect(mockLoadPlugin).toHaveBeenCalledWith(`llm-${type}`);
      expect(mockInstantiateLlmProvider).toHaveBeenCalledWith(fakeMod, { apiKey: 'x' });
      expect(result.source).toBe('override');
      expect(result.provider.name).toBe(type);
    }
  );

  it('constructs a per-use-case profile of a previously-uncovered type via the plugin loader', async () => {
    const pluginProvider = makeProvider('letta');
    const fakeMod = { create: jest.fn() };
    mockLoadPlugin.mockResolvedValue(fakeMod);
    mockInstantiateLlmProvider.mockReturnValue(pluginProvider);

    mockGetGeneralSettings.mockReturnValue({
      perUseCaseEnabled: true,
      taskProfiles: { summary: 'my-letta-profile' },
    });
    mockGetLlmProfileByKey.mockReturnValue({
      key: 'my-letta-profile',
      provider: 'letta',
      config: { baseUrl: 'http://letta' },
    });

    const result = await getTaskLlm('summary');

    expect(mockLoadPlugin).toHaveBeenCalledWith('llm-letta');
    expect(mockInstantiateLlmProvider).toHaveBeenCalledWith(fakeMod, { baseUrl: 'http://letta' });
    expect(result.source).toBe('override');
    expect(result.provider.name).toBe('letta');
  });

  describe('openwebui non-chat completion', () => {
    beforeEach(() => {
      mockOwuiSupportsCompletion.mockReturnValue(true);
      mockGetAllProviders.mockReturnValue([
        { id: 'owui-1', name: 'openwebui', type: 'openwebui', enabled: true, config: {} },
      ]);
      taskOverrides.LLM_TASK_SUMMARY_PROVIDER = 'openwebui';
    });

    it('delegates generateCompletion to the package provider /completions path instead of throwing', async () => {
      mockOwuiGenerateCompletion.mockResolvedValue('completion-ok');

      const result = await getTaskLlm('summary');
      expect(result.source).toBe('override');

      await expect(result.provider.generateCompletion('summarize this')).resolves.toBe(
        'completion-ok'
      );
      expect(mockOwuiGenerateCompletion).toHaveBeenCalledWith('summarize this');
    });

    it('reports completion support from the package provider', async () => {
      const result = await getTaskLlm('summary');
      expect(result.provider.supportsCompletion()).toBe(true);
      expect(mockOwuiSupportsCompletion).toHaveBeenCalled();
    });

    it('propagates package-provider completion failures', async () => {
      mockOwuiGenerateCompletion.mockRejectedValue(new Error('Non-chat completion failed: boom'));

      const result = await getTaskLlm('summary');
      await expect(result.provider.generateCompletion('x')).rejects.toThrow(
        'Non-chat completion failed: boom'
      );
    });
  });

  it('falls back to the default provider when the plugin loader cannot resolve an unknown type', async () => {
    mockLoadPlugin.mockRejectedValue(new Error('Cannot find module llm-nonsense'));
    mockGetAllProviders.mockReturnValue([
      { id: 'inst-x', name: 'nonsense', type: 'nonsense', enabled: true, config: {} },
    ]);

    taskOverrides.LLM_TASK_SEMANTIC_PROVIDER = 'nonsense';

    const result = await getTaskLlm('semantic');

    expect(result.source).toBe('default');
    expect(result.provider).toBe(fallback);
  });
});
