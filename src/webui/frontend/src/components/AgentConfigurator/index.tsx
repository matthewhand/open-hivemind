import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Refresh as RefreshIcon } from '@mui/icons-material';
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

interface AgentConfiguratorProps {
  title?: string;
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
  const [apiMenuAnchor, setApiMenuAnchor] = useState<null | HTMLElement>(null);

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
    [messageProviderInfoList]
  );

  const llmProviderInfoMap = useMemo(
    () => Object.fromEntries(llmProviderInfoList.map(info => [info.key, info])),
    [llmProviderInfoList]
  );

  const isLoading = configLoading || statusLoading;
  const isFetching = configFetching || statusFetching;

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={240}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading agent configuration…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (configError) {
    return <Alert severity="error">Failed to load configuration</Alert>;
  }

  function handleSelectionChange<K extends keyof BotUIState>(
    bot: Bot,
    field: K,
    value: BotUIState[K],
    commitImmediately = true,
  ) {
    setSelectionState(prev => ({
      ...prev,
      [bot.name]: {
        ...prev[bot.name],
        [field]: value,
      },
    }));

    if (commitImmediately) {
      commitChanges(bot.name, { [field]: value });
    }
  }

  const handleSystemInstructionBlur = (bot: Bot) => {
    const current = selectionState[bot.name];
    if (!current) return;
    commitChanges(bot.name, { systemInstruction: current.systemInstruction });
  };

  const handleGuardToggle = (bot: Bot, enabled: boolean) => {
    const current = selectionState[bot.name];
    if (!current) return;
    const updatedGuard = { ...current.mcpGuard, enabled };
    handleSelectionChange(bot, 'mcpGuard', updatedGuard, false);
    commitChanges(bot.name, { mcpGuard: updatedGuard });
  };

  const handleGuardTypeChange = (bot: Bot, type: GuardState['type']) => {
    const current = selectionState[bot.name];
    if (!current) return;
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
    if (!current) return;
    const updatedGuard = { ...current.mcpGuard, allowedUserIds: list };
    setGuardInputState(prev => ({ ...prev, [bot.name]: value }));
    handleSelectionChange(bot, 'mcpGuard', updatedGuard, false);
  };

  const handleGuardUsersBlur = (bot: Bot) => {
    const current = selectionState[bot.name];
    if (!current) return;
    commitChanges(bot.name, { mcpGuard: current.mcpGuard });
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
    setApiMenuAnchor(null);
    window.open(`/webui/api/openapi?format=${format}`, '_blank', 'noopener');
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" component="h2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure messaging, LLM providers, personas, and MCP tooling for each agent. Fields defined via environment variables are locked and displayed for reference.
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={isFetching ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh status'}
          </Button>
          <Button
            variant="text"
            sx={{ ml: 1 }}
            onClick={(event) => setApiMenuAnchor(event.currentTarget)}
          >
            API Spec
          </Button>
          <Menu
            anchorEl={apiMenuAnchor}
            open={Boolean(apiMenuAnchor)}
            onClose={() => setApiMenuAnchor(null)}
          >
            <MenuItem onClick={() => openApiSpec('json')}>Download JSON</MenuItem>
            <MenuItem onClick={() => openApiSpec('yaml')}>Download YAML</MenuItem>
          </Menu>
        </Box>
      </Stack>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {providersError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {providersError}
        </Alert>
      )}

      {mcpError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {mcpError}
        </Alert>
      )}

      {statusError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Unable to load live status updates right now. Try refreshing in a moment.
        </Alert>
      )}

      {bots.length === 0 ? (
        <Alert severity="info">No agents detected. Create a bot configuration to get started.</Alert>
      ) : (
        <Grid container spacing={3}>
          {bots.map(bot => {
            const uiState = selectionState[bot.name];
            const status = statusByName.get(bot.name);
            const metadata = bot.metadata || {};

            return (
              <Grid item xs={12} lg={6} key={bot.name}>
                <AgentConfigCard
                  bot={bot}
                  metadata={metadata}
                  uiState={uiState}
                  status={status}
                  pending={Boolean(pendingBots[bot.name])}
                  personaOptions={buildPersonaOptions(personas)}
                  messageProviderOptions={messageProviderOptions}
                  llmProviderOptions={llmProviderOptions}
                  messageProviderInfo={messageProviderInfoMap}
                  llmProviderInfo={llmProviderInfoMap}
                  providersLoading={providersLoading}
                  personasLoading={personasLoading}
                  availableMcpServers={availableMcpServers}
                  guardOptions={guardOptions}
                  guardInput={guardInputState[bot.name] || ''}
                  onSelectionChange={handleSelectionChange}
                  onSystemInstructionBlur={handleSystemInstructionBlur}
                  onGuardToggle={handleGuardToggle}
                  onGuardTypeChange={handleGuardTypeChange}
                  onGuardUsersChange={handleGuardUsersChange}
                  onGuardUsersBlur={handleGuardUsersBlur}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
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

const buildPersonaOptions = (personas: Array<{ key: string; name: string }> | undefined) => {
  if (!personas || personas.length === 0) {
    return [] as Array<{ value: string; label: string }>;
  }
  return personas.map(persona => ({ value: persona.key, label: persona.name }));
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
  if (!servers) return [];
  if (Array.isArray(servers)) {
    return servers
      .map(server => {
        if (typeof server === 'string') return server;
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
