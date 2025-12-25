import React, { useEffect, useMemo, useState } from 'react';
import {
  useApplyHotReloadChangeMutation,
  useGetConfigQuery,
  useGetStatusQuery,
} from '../../store/slices/apiSlice';
import type { Bot, StatusResponse } from '../../services/api';
import { useProviders } from '../../hooks/useProviders';
import { usePersonas } from '../../hooks/usePersonas';
import { getMCPServers } from '../../services/agentService';
import AgentConfigCard from './AgentConfigCard';
import type { BotUIState, GuardInputState, GuardState } from './types';
import type { ProviderInfo } from '../../services/providerService';
import { LoadingSpinner } from '../DaisyUI';

interface AgentConfiguratorProps {
  title?: string;
}

interface ProviderProfile {
  key: string;
  name?: string;
  description?: string;
  provider: string;
  config?: Record<string, unknown>;
}

const fallbackMessageProviders: ProviderInfo[] = [
  {
    key: 'discord',
    label: 'Discord',
    docsUrl: 'https://discord.com/developers/applications',
    helpText: 'Create a Discord bot and copy the Bot Token from the Developer Portal.',
  },
  {
    key: 'slack',
    label: 'Slack',
    docsUrl: 'https://api.slack.com/apps',
    helpText: 'Create a Slack app, enable Socket Mode, and generate the bot token.',
  },
  {
    key: 'mattermost',
    label: 'Mattermost',
    docsUrl: 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/',
    helpText: 'Create a bot account in Mattermost and generate a personal access token.',
  },
  {
    key: 'webhook',
    label: 'Webhook',
    helpText: 'Send outgoing messages via generic webhooks.',
  },
];

const fallbackLlmProviders: ProviderInfo[] = [
  {
    key: 'openai',
    label: 'OpenAI',
    docsUrl: 'https://platform.openai.com/account/api-keys',
    helpText: 'Generate an API key from the OpenAI portal and paste it into the Open-Hivemind configuration.',
  },
  {
    key: 'flowise',
    label: 'Flowise',
    docsUrl: 'https://docs.flowiseai.com/',
    helpText: 'Use the REST endpoint and API key from your Flowise deployment.',
  },
  {
    key: 'openwebui',
    label: 'OpenWebUI',
    docsUrl: 'https://docs.openwebui.com/',
    helpText: 'Enable API access in OpenWebUI and copy the token from the admin interface.',
  },
  {
    key: 'perplexity',
    label: 'Perplexity',
    docsUrl: 'https://www.perplexity.ai/developer',
    helpText: 'Request API access from Perplexity and supply the issued API key.',
  },
  {
    key: 'replicate',
    label: 'Replicate',
    docsUrl: 'https://replicate.com/account',
    helpText: 'Copy the Replicate API token from your account settings.',
  },
  {
    key: 'n8n',
    label: 'n8n',
    docsUrl: 'https://docs.n8n.io/',
    helpText: 'Provide the n8n webhook URL that triggers your workflow.',
  },
  {
    key: 'openswarm',
    label: 'OpenSwarm',
    docsUrl: 'https://openswarm.ai/',
    helpText: 'Provide the OpenSwarm base URL and API key configured for your swarm deployment.',
  },
];

const guardOptions: Array<{ value: GuardState['type']; label: string }> = [
  { value: 'owner', label: 'Forum Owner Only' },
  { value: 'custom', label: 'Custom Allowed Users' },
];

const AgentConfigurator: React.FC<AgentConfiguratorProps> = ({ title = 'Agent Configuration' }) => {
  const {
    data: configData,
    isLoading: configLoading,
    isFetching: configFetching,
    error: configError,
    refetch: refetchConfig,
  } = useGetConfigQuery();

  const {
    data: statusData,
    isLoading: statusLoading,
    isFetching: statusFetching,
    error: statusError,
    refetch: refetchStatus,
  } = useGetStatusQuery(undefined, { pollingInterval: 15000 });

  const [applyHotReloadChange] = useApplyHotReloadChangeMutation();
  const [selectionState, setSelectionState] = useState<Record<string, BotUIState>>({});
  const [guardInputState, setGuardInputState] = useState<GuardInputState>({});
  const [pendingBots, setPendingBots] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [availableMcpServers, setAvailableMcpServers] = useState<string[]>([]);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [responseProfileOptions, setResponseProfileOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [guardrailProfileOptions, setGuardrailProfileOptions] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [guardrailProfileMap, setGuardrailProfileMap] = useState<Record<string, GuardState>>({});
  const [llmProfiles, setLlmProfiles] = useState<ProviderProfile[]>([]);
  const [mcpServerProfileOptions, setMcpServerProfileOptions] = useState<Array<{ value: string; label: string }>>([]);

  const { personas, loading: personasLoading } = usePersonas();
  const {
    llmProviders,
    messengerProviders,
    loading: providersLoading,
    error: providersError,
  } = useProviders();

  useEffect(() => {
    const fetchMcpServers = async () => {
      try {
        const servers = await getMCPServers();
        setAvailableMcpServers(servers);
        setMcpError(null);
      } catch {
        setMcpError('Failed to load MCP servers');
      }
    };

    fetchMcpServers();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchResponseProfiles = async () => {
      try {
        const response = await fetch('/api/config/response-profiles');
        if (!response.ok) {return;}
        const data = await response.json();
        const profiles = Array.isArray(data?.profiles) ? data.profiles : [];

        const options = profiles
          .filter((p: any) => p.enabled !== false)
          .map((profile: any) => ({
            value: String(profile.key || ''),
            label: profile.name || profile.key,
          }))
          .filter((option: any) => option.value.length > 0)
          .sort((a: any, b: any) => a.label.localeCompare(b.label));

        if (isMounted) {
          setResponseProfileOptions(options);
        }
      } catch {
        // If unavailable, leave options empty and rely on env/defaults
      }
    };

    fetchResponseProfiles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchGuardrailProfiles = async () => {
      try {
        const response = await fetch('/api/config/guardrails');
        if (!response.ok) {return;}
        const data = await response.json();
        const profiles = Array.isArray(data?.profiles) ? data.profiles : [];

        const options = profiles
          .map((profile: any) => ({
            value: String(profile.key || ''),
            label: profile.name || profile.key,
            description: profile.description,
          }))
          .filter(option => option.value.length > 0)
          .sort((a, b) => a.label.localeCompare(b.label));

        const map: Record<string, GuardState> = {};
        for (const profile of profiles) {
          if (!profile?.key || !profile?.mcpGuard) {continue;}
          const guard = profile.mcpGuard;
          map[String(profile.key)] = {
            enabled: Boolean(guard.enabled),
            type: guard.type === 'custom' ? 'custom' : 'owner',
            allowedUserIds: Array.isArray(guard.allowedUserIds)
              ? guard.allowedUserIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
              : [],
          };
        }

        if (isMounted) {
          setGuardrailProfileOptions(options);
          setGuardrailProfileMap(map);
        }
      } catch {
        // ignore guardrail profile load errors
      }
    };

    fetchGuardrailProfiles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchLlmProfiles = async () => {
      try {
        const response = await fetch('/api/config/llm-profiles');
        if (!response.ok) {return;}
        const data = await response.json();
        const profiles = data?.profiles;
        if (!profiles || typeof profiles !== 'object') {return;}
        const llmProfilesList = Array.isArray(profiles.llm) ? profiles.llm : [];
        if (isMounted) {
          setLlmProfiles(llmProfilesList);
        }
      } catch {
        // ignore profile load errors
      }
    };

    fetchLlmProfiles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchMcpServerProfiles = async () => {
      try {
        const response = await fetch('/api/config/mcp-server-profiles');
        if (!response.ok) {return;}
        const data = await response.json();
        const profiles = Array.isArray(data?.profiles) ? data.profiles : [];

        const options = profiles
          .map((profile: any) => ({
            value: String(profile.key || ''),
            label: profile.name || profile.key,
          }))
          .filter((option: any) => option.value.length > 0)
          .sort((a: any, b: any) => a.label.localeCompare(b.label));

        if (isMounted) {
          setMcpServerProfileOptions(options);
        }
      } catch {
        // ignore profile load errors
      }
    };

    fetchMcpServerProfiles();
    return () => {
      isMounted = false;
    };
  }, []);

  const bots = useMemo(() => configData?.bots ?? [], [configData]);

  useEffect(() => {
    if (!bots.length) {
      setSelectionState({});
      setGuardInputState({});
      return;
    }

    const nextState: Record<string, BotUIState> = {};
    const nextGuardInputs: GuardInputState = {};

    bots.forEach(bot => {
      const guard: GuardState = normalizeGuard(bot.mcpGuard);
      nextState[bot.name] = {
        messageProvider: bot.messageProvider || '',
        llmProvider: bot.llmProvider || '',
        llmProfile: (bot as any).llmProfile || '',
        responseProfile: bot.responseProfile || '',
        mcpGuardProfile: (bot as any).mcpGuardProfile || '',
        mcpServerProfile: (bot as any).mcpServerProfile || '',
        persona: bot.persona || '',
        systemInstruction: bot.systemInstruction || '',
        mcpServers: normalizeMcpServers(bot.mcpServers),
        mcpGuard: guard,
      };
      nextGuardInputs[bot.name] = guard.allowedUserIds.join(', ');
    });

    setSelectionState(prev => (deepEqual(prev, nextState) ? prev : nextState));
    setGuardInputState(prev => (deepEqual(prev, nextGuardInputs) ? prev : nextGuardInputs));
  }, [bots]);

  const statusByName = useMemo(() => {
    const map = new Map<string, StatusResponse['bots'][number]>();
    statusData?.bots.forEach(botStatus => {
      map.set(botStatus.name, botStatus);
    });
    return map;
  }, [statusData]);

  const messageProviderInfoList = messengerProviders.length ? messengerProviders : fallbackMessageProviders;
  const llmProviderInfoList = llmProviders.length ? llmProviders : fallbackLlmProviders;

  const messageProviderOptions = useMemo(() => messageProviderInfoList.map(toOptionLabel), [messageProviderInfoList]);
  const llmProviderOptions = useMemo(() => llmProviderInfoList.map(toOptionLabel), [llmProviderInfoList]);

  const messageProviderInfoMap = useMemo(
    () => Object.fromEntries(messageProviderInfoList.map(info => [info.key, info])),
    [messageProviderInfoList],
  );

  const llmProviderInfoMap = useMemo(
    () => Object.fromEntries(llmProviderInfoList.map(info => [info.key, info])),
    [llmProviderInfoList],
  );

  const isLoading = configLoading || statusLoading;
  const isFetching = configFetching || statusFetching;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <LoadingSpinner />
        <p className="text-base-content/70">Loading agent configuration…</p>
      </div>
    );
  }

  if (configError) {
    return <div className="alert alert-error">Failed to load configuration</div>;
  }

  function handleSelectionChange<K extends keyof BotUIState>(
    bot: Bot,
    field: K,
    value: BotUIState[K],
    commitImmediately = true,
  ) {
    setSelectionState(prev => {
      const current = prev[bot.name];
      const nextState = {
        ...prev,
        [bot.name]: {
          ...current,
          [field]: value,
        },
      } as typeof prev;

      if (field === 'llmProvider' && current?.llmProvider !== value) {
        nextState[bot.name].llmProfile = '';
      }

      return nextState;
    });

    if (commitImmediately) {
      const payload: Partial<BotUIState> = { [field]: value } as Partial<BotUIState>;
      if (field === 'llmProvider' && selectionState[bot.name]?.llmProvider !== value) {
        payload.llmProfile = '';
      }
      commitChanges(bot.name, payload);
    }
  }

  const handleSystemInstructionBlur = (bot: Bot) => {
    const current = selectionState[bot.name];
    if (!current) {return;}
    commitChanges(bot.name, { systemInstruction: current.systemInstruction });
  };

  const handleGuardToggle = (bot: Bot, enabled: boolean) => {
    const current = selectionState[bot.name];
    if (!current) {return;}
    if (current.mcpGuardProfile) {return;}
    const updatedGuard = { ...current.mcpGuard, enabled };
    handleSelectionChange(bot, 'mcpGuard', updatedGuard, false);
    commitChanges(bot.name, { mcpGuard: updatedGuard });
  };

  const handleGuardTypeChange = (bot: Bot, type: GuardState['type']) => {
    const current = selectionState[bot.name];
    if (!current) {return;}
    if (current.mcpGuardProfile) {return;}
    const updatedGuard = { ...current.mcpGuard, type };
    handleSelectionChange(bot, 'mcpGuard', updatedGuard, false);
    commitChanges(bot.name, { mcpGuard: updatedGuard });
  };

  const handleGuardUsersChange = (bot: Bot, value: string) => {
    const list = value
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);

    const current = selectionState[bot.name];
    if (!current) {return;}
    if (current.mcpGuardProfile) {return;}
    const updatedGuard = { ...current.mcpGuard, allowedUserIds: list };
    setGuardInputState(prev => ({ ...prev, [bot.name]: value }));
    handleSelectionChange(bot, 'mcpGuard', updatedGuard, false);
  };

  const handleGuardUsersBlur = (bot: Bot) => {
    const current = selectionState[bot.name];
    if (!current) {return;}
    if (current.mcpGuardProfile) {return;}
    commitChanges(bot.name, { mcpGuard: current.mcpGuard });
  };

  const handleGuardrailProfileChange = (bot: Bot, profileKey: string) => {
    const current = selectionState[bot.name];
    if (!current) {return;}

    const nextProfile = profileKey.trim();
    const profileGuard = guardrailProfileMap[nextProfile];

    setSelectionState(prev => ({
      ...prev,
      [bot.name]: {
        ...prev[bot.name],
        mcpGuardProfile: nextProfile,
        mcpGuard: profileGuard ? { ...profileGuard } : prev[bot.name].mcpGuard,
      },
    }));

    if (profileGuard) {
      setGuardInputState(prev => ({
        ...prev,
        [bot.name]: profileGuard.allowedUserIds.join(', '),
      }));
    }

    commitChanges(bot.name, { mcpGuardProfile: nextProfile });
  };

  const commitChanges = async (botName: string, changes: Partial<BotUIState>) => {
    if (!changes || Object.keys(changes).length === 0) {
      return;
    }

    setPendingBots(prev => ({ ...prev, [botName]: true }));
    setFeedback(null);

    try {
      const payload: Record<string, unknown> = {};

      if (changes.messageProvider !== undefined) {
        payload.messageProvider = changes.messageProvider;
      }
      if (changes.llmProvider !== undefined) {
        payload.llmProvider = changes.llmProvider;
      }
      if (changes.llmProfile !== undefined) {
        payload.llmProfile = changes.llmProfile;
      }
      if (changes.responseProfile !== undefined) {
        payload.responseProfile = changes.responseProfile;
      }
      if (changes.mcpGuardProfile !== undefined) {
        payload.mcpGuardProfile = changes.mcpGuardProfile;
      }
      if (changes.mcpServerProfile !== undefined) {
        payload.mcpServerProfile = changes.mcpServerProfile;
      }
      if (changes.persona !== undefined) {
        payload.persona = changes.persona;
      }
      if (changes.systemInstruction !== undefined) {
        payload.systemInstruction = changes.systemInstruction;
      }
      if (changes.mcpServers !== undefined) {
        payload.mcpServers = changes.mcpServers;
      }
      if (changes.mcpGuard !== undefined) {
        payload.mcpGuard = changes.mcpGuard;
      }

      if (Object.keys(payload).length === 0) {
        setPendingBots(prev => {
          const next = { ...prev };
          delete next[botName];
          return next;
        });
        return;
      }

      await applyHotReloadChange({
        type: 'update',
        botName,
        changes: payload,
      }).unwrap();

      setFeedback({
        type: 'success',
        message: `Updated ${botName} configuration successfully`,
      });

      await Promise.allSettled([refetchConfig(), refetchStatus()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update bot configuration';
      setFeedback({ type: 'error', message });
    } finally {
      setPendingBots(prev => {
        const next = { ...prev };
        delete next[botName];
        return next;
      });
    }
  };

  const handleRefresh = async () => {
    setFeedback(null);
    await Promise.allSettled([refetchConfig(), refetchStatus()]);
  };

  const openApiSpec = (format: 'json' | 'yaml') => {
    window.open(`/webui/api/openapi?format=${format}`, '_blank', 'noopener');
  };

  return (
    <div>
      <div className="hero bg-base-200 py-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">{title}</h1>
            <p className="py-6">
              Configure messaging, LLM providers, personas, and MCP tooling for each agent. Fields defined via environment variables are locked and displayed for reference.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-end items-center gap-2 mb-4">
          <button className={`btn btn-outline ${isFetching ? 'loading' : ''}`} onClick={handleRefresh} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh status'}
          </button>
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn">API Spec</label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a onClick={() => openApiSpec('json')}>Download JSON</a></li>
              <li><a onClick={() => openApiSpec('yaml')}>Download YAML</a></li>
            </ul>
          </div>
        </div>

        {feedback && (
          <div className={`alert alert-${feedback.type} shadow-lg mb-4`}>
            <div>
              <span>{feedback.message}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setFeedback(null)}>✕</button>
            </div>
          </div>
        )}

        {providersError && (
          <div className="alert alert-warning shadow-lg mb-4">
            <div>
              <span>{providersError}</span>
            </div>
          </div>
        )}

        {mcpError && (
          <div className="alert alert-warning shadow-lg mb-4">
            <div>
              <span>{mcpError}</span>
            </div>
          </div>
        )}

        {statusError && (
          <div className="alert alert-warning shadow-lg mb-4">
            <div>
              <span>Unable to load live status updates right now. Try refreshing in a moment.</span>
            </div>
          </div>
        )}

        {bots.length === 0 ? (
          <div className="alert alert-info">No agents detected. Create a bot configuration to get started.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bots.map(bot => {
              const uiState = selectionState[bot.name];
              const status = statusByName.get(bot.name);
              const metadata = bot.metadata || {};
              const llmProfileOptions = buildProviderProfileOptions(llmProfiles, uiState?.llmProvider, uiState?.llmProfile);

              return (
                <AgentConfigCard
                  key={bot.name}
                  bot={bot}
                  metadata={metadata}
                  uiState={uiState}
                  status={status}
                  pending={Boolean(pendingBots[bot.name])}
                  personaOptions={buildPersonaOptions(personas)}
                  responseProfileOptions={responseProfileOptions}
                  guardrailProfileOptions={guardrailProfileOptions}
                  llmProfileOptions={llmProfileOptions}
                  mcpServerProfileOptions={mcpServerProfileOptions}
                  messageProviderOptions={messageProviderOptions}
                  llmProviderOptions={llmProviderOptions}
                  messageProviderInfo={messageProviderInfoMap}
                  llmProviderInfo={llmProviderInfoMap}
                  providersLoading={providersLoading}
                  personasLoading={personasLoading}
                  availableMcpServers={availableMcpServers}
                  guardOptions={guardOptions}
                  guardInput={guardInputState[bot.name] || ''}
                  onGuardrailProfileChange={handleGuardrailProfileChange}
                  onSelectionChange={handleSelectionChange}
                  onSystemInstructionBlur={handleSystemInstructionBlur}
                  onGuardToggle={handleGuardToggle}
                  onGuardTypeChange={handleGuardTypeChange}
                  onGuardUsersChange={handleGuardUsersChange}
                  onGuardUsersBlur={handleGuardUsersBlur}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const toOptionLabel = (info: ProviderInfo): { value: string; label: string } => ({
  value: info.key,
  label: info.label
    ? info.label
    : info.key
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' '),
});

const formatProfileLabel = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {return '';}
  return trimmed
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const buildProviderProfileOptions = (
  profiles: ProviderProfile[],
  provider?: string,
  selected?: string,
): Array<{ value: string; label: string }> => {
  const normalizedProvider = provider?.trim();
  const filtered = normalizedProvider
    ? profiles.filter(profile => profile.provider === normalizedProvider)
    : profiles;
  const options = filtered
    .filter(profile => profile.key)
    .map(profile => ({
      value: profile.key,
      label: profile.name || formatProfileLabel(profile.key),
    }));

  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({
      value: selected,
      label: formatProfileLabel(selected),
    });
  }

  return options;
};

const buildPersonaOptions = (personas: Array<{ key?: string; id?: string; name: string }> | undefined) => {
  if (!personas || personas.length === 0) {
    return [] as Array<{ value: string; label: string }>;
  }
  return personas
    .map(persona => ({
      value: persona.key || persona.id || '',
      label: persona.name,
    }))
    .filter(option => option.value);
};

const normalizeGuard = (guard: unknown): GuardState => {
  if (!guard || typeof guard !== 'object') {
    return { enabled: false, type: 'owner', allowedUserIds: [] };
  }

  const guardObject = guard as Record<string, unknown>;
  const rawAllowed = guardObject.allowedUserIds as unknown;
  let allowedUserIds: string[] = [];

  if (Array.isArray(rawAllowed)) {
    allowedUserIds = rawAllowed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  } else if (typeof rawAllowed === 'string') {
    allowedUserIds = rawAllowed
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
  }

  const guardType = typeof guardObject.type === 'string' ? guardObject.type : undefined;

  return {
    enabled: Boolean(guardObject.enabled),
    type: guardType === 'custom' ? 'custom' : 'owner',
    allowedUserIds,
  };
};

function normalizeMcpServers(servers: unknown): string[] {
  if (!servers) {return [];}
  if (Array.isArray(servers)) {
    return servers
      .map(server => {
        if (typeof server === 'string') {return server;}
        if (server && typeof (server as { name?: unknown }).name === 'string') {
          return String((server as { name: unknown }).name);
        }
        return undefined;
      })
      .filter((value): value is string => Boolean(value));
  }
  return [];
}

function deepEqual<T>(a: T, b: T): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export default AgentConfigurator;
