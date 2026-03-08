import Debug from 'debug';
import ProviderConfigManager, { type ProviderInstance } from '@src/config/ProviderConfigManager';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import llmTaskConfig from '@config/llmTaskConfig';
import { FlowiseProvider } from '@integrations/flowise/flowiseProvider';
import * as openWebUIImport from '@integrations/openwebui/runInference';
import { getLlmProvider } from '@llm/getLlmProvider';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:taskLlmRouter');

export type LlmTask = 'semantic' | 'summary' | 'followup' | 'idle';

export interface TaskLlmSelection {
  provider: ILlmProvider;
  metadata: Record<string, any>;
  source: 'default' | 'override';
}

function normalizeRef(v: string): string {
  return String(v || '')
    .trim()
    .toLowerCase();
}

function readOverride(task: LlmTask): { providerRef: string; modelRef: string } {
  // Primary (new) env vars via convict
  const keyProvider = `LLM_TASK_${task.toUpperCase()}_PROVIDER` as const;
  const keyModel = `LLM_TASK_${task.toUpperCase()}_MODEL` as const;

  const providerRef = String((llmTaskConfig.get as any)(keyProvider) || '').trim();
  const modelRef = String((llmTaskConfig.get as any)(keyModel) || '').trim();

  // Back-compat aliases (if someone uses older naming conventions)
  const aliasProvider = String(process.env[`LLM_${task.toUpperCase()}_PROVIDER`] || '').trim();
  const aliasModel = String(process.env[`LLM_${task.toUpperCase()}_MODEL`] || '').trim();

  return {
    providerRef: providerRef || aliasProvider,
    modelRef: modelRef || aliasModel,
  };
}

function withTokenCounting(provider: ILlmProvider, instanceId: string): ILlmProvider {
  const metrics = MetricsCollector.getInstance();
  return {
    name: provider.name,
    supportsChatCompletion: provider.supportsChatCompletion,
    supportsCompletion: provider.supportsCompletion,
    generateChatCompletion: async (
      userMessage: string,
      historyMessages: IMessage[],
      metadata?: Record<string, any>
    ) => {
      const response = await provider.generateChatCompletion(
        userMessage,
        historyMessages,
        metadata
      );
      if (response) {
        metrics.recordLlmTokenUsage(response.length);
      }
      return response;
    },
    generateCompletion: async (userMessage: string) => {
      const response = await provider.generateCompletion(userMessage);
      if (response) {
        metrics.recordLlmTokenUsage(response.length);
      }
      return response;
    },
  };
}

const openWebUI: ILlmProvider = {
  name: 'openwebui',
  supportsChatCompletion: () => true,
  supportsCompletion: () => false,
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ) => {
    if (openWebUIImport.generateChatCompletion.length === 3) {
      const result = await openWebUIImport.generateChatCompletion(
        userMessage,
        historyMessages,
        metadata
      );
      return result.text || '';
    } else {
      const result = await (openWebUIImport as any).generateChatCompletion(
        userMessage,
        historyMessages
      );
      return result.text || '';
    }
  },
  generateCompletion: async () => {
    throw new Error('Non-chat completion not supported by OpenWebUI');
  },
};

function createProviderFromInstance(
  instance: ProviderInstance,
  modelOverride?: string
): ILlmProvider | null {
  try {
    const type = String(instance.type || '').toLowerCase();
    const baseConfig = instance.config || {};
    const cfg = modelOverride ? { ...baseConfig, model: modelOverride } : baseConfig;

    let provider: ILlmProvider | undefined;
    switch (type) {
      case 'openai':
        const { OpenAiProvider } = require('@hivemind/provider-openai');
        provider = new OpenAiProvider(cfg);
        break;
      case 'flowise':
        provider = new FlowiseProvider(cfg);
        break;
      case 'openwebui':
        provider = openWebUI;
        break;
      default:
        return null;
    }

    return withTokenCounting(provider, instance.id);
  } catch (e) {
    debug(
      `Failed to create provider for instance ${instance.id}: ${e instanceof Error ? e.message : String(e)}`
    );
    return null;
  }
}

function pickProviderInstance(
  ref: string,
  candidates: ProviderInstance[]
): ProviderInstance | null {
  const wanted = normalizeRef(ref);
  if (!wanted) {
    return null;
  }

  // Prefer exact id match.
  const byId = candidates.find((p) => normalizeRef(p.id) === wanted);
  if (byId) {
    return byId;
  }

  // Then by name (case-insensitive).
  const byName = candidates.find((p) => normalizeRef(p.name) === wanted);
  if (byName) {
    return byName;
  }

  // Then by type (first enabled provider of that type).
  const byType = candidates.find((p) => normalizeRef(p.type) === wanted);
  if (byType) {
    return byType;
  }

  return null;
}

export function getTaskLlm(
  task: LlmTask,
  opts?: { fallbackProviders?: ILlmProvider[]; baseMetadata?: Record<string, any> }
): TaskLlmSelection {
  const overrides = readOverride(task);
  const providerRef = overrides.providerRef;
  const modelRef = overrides.modelRef;

  const baseMetadata = opts?.baseMetadata || {};
  const metadata: Record<string, any> = { ...baseMetadata };
  if (modelRef) {
    metadata.modelOverride = modelRef;
  }

  const fallbackProviders =
    opts?.fallbackProviders && opts.fallbackProviders.length > 0
      ? opts.fallbackProviders
      : getLlmProvider();

  if (!fallbackProviders || fallbackProviders.length === 0) {
    throw new Error('No LLM providers available for task routing');
  }

  if (!providerRef) {
    return {
      provider: fallbackProviders[0],
      metadata,
      source: modelRef ? 'override' : 'default',
    };
  }

  const providerManager = ProviderConfigManager.getInstance();
  const enabled = providerManager.getAllProviders('llm').filter((p) => p.enabled);
  const picked = pickProviderInstance(providerRef, enabled);

  if (!picked) {
    debug(
      `Task ${task}: provider override "${providerRef}" not found; falling back to default providers`
    );
    return { provider: fallbackProviders[0], metadata, source: 'default' };
  }

  const instanceProvider = createProviderFromInstance(picked, modelRef);
  if (!instanceProvider) {
    debug(
      `Task ${task}: provider instance "${picked.id}" failed to initialize; falling back to default providers`
    );
    return { provider: fallbackProviders[0], metadata, source: 'default' };
  }

  debug(
    `Task ${task}: using override provider=${picked.name} (type=${picked.type}, id=${picked.id}) model=${modelRef || '(default)'}`
  );
  return { provider: instanceProvider, metadata, source: 'override' };
}
