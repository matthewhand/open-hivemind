/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from '../DaisyUI/Alert';
import Badge from '../DaisyUI/Badge';
import Card from '../DaisyUI/Card';
import {
  Bot,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  MessageSquare as ChatIcon,
  Cpu as CpuIcon,
  Brain as BrainIcon,
  ToggleLeft as ToggleOffIcon,
  ToggleRight as ToggleOnIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  Clock as ClockIcon,
  Reply as ReplyIcon,
  Coffee as CoffeeIcon,
  Monitor as MonitorIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { LLMProviderType } from '../../types/bot';
import { LLM_PROVIDER_CONFIGS } from '../../types/bot';

type LlmModelType = 'chat' | 'embedding' | 'both';

const normalizeModelType = (value: unknown): LlmModelType => {
  if (value === 'embedding' || value === 'both') return value;
  return 'chat';
};

const isChatCapable = (profile: any): boolean => {
  const t = normalizeModelType(profile?.modelType);
  return t === 'chat' || t === 'both';
};

const isEmbeddingCapable = (profile: any): boolean => {
  const t = normalizeModelType(profile?.modelType);
  return t === 'embedding' || t === 'both';
};

const SettingsLLM: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [webuiIntelligenceProvider, setWebuiIntelligenceProvider] = useState<string>('');
  const [defaultChatbotProfile, setDefaultChatbotProfile] = useState<string>('');
  const [defaultEmbeddingProvider, setDefaultEmbeddingProvider] = useState<string>('');
  const [perUseCaseEnabled, setPerUseCaseEnabled] = useState<boolean>(false);
  const [taskProfiles, setTaskProfiles] = useState<Record<string, string>>({
    LLM_TASK_SEMANTIC_PROVIDER: '',
    LLM_TASK_SUMMARY_PROVIDER: '',
    LLM_TASK_FOLLOWUP_PROVIDER: '',
    LLM_TASK_IDLE_PROVIDER: '',
    LLM_TASK_WEBUI_PROVIDER: '',
  });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesResult, statusResult, globalResult] = await Promise.allSettled([
        apiService.get('/api/config/llm-profiles'),
        apiService.get('/api/config/llm-status'),
        apiService.get('/api/config/global'),
      ]);
      const profilesRes = profilesResult.status === 'fulfilled' ? profilesResult.value : {};
      const statusRes = statusResult.status === 'fulfilled' ? statusResult.value : {};
      const globalRes = globalResult.status === 'fulfilled' ? globalResult.value : {};

      setProfiles((profilesRes as any).llm || (profilesRes as any).profiles?.llm || []);
      setDefaultStatus(statusRes);

      const gs = (globalRes as any)._userSettings?.values || {};
      const llmValues = (globalRes as any).llm?.values || {};
      setWebuiIntelligenceProvider(gs.webuiIntelligenceProvider || '');
      setDefaultChatbotProfile(gs.defaultChatbotProfile || '');
      setDefaultEmbeddingProvider(llmValues.DEFAULT_EMBEDDING_PROVIDER || gs.defaultEmbeddingProfile || '');
      setPerUseCaseEnabled(!!gs.perUseCaseEnabled);

      // Load per-use-case task profile assignments from llm config
      setTaskProfiles((prev) => ({
        ...prev,
        LLM_TASK_SEMANTIC_PROVIDER: llmValues.LLM_TASK_SEMANTIC_PROVIDER || '',
        LLM_TASK_SUMMARY_PROVIDER: llmValues.LLM_TASK_SUMMARY_PROVIDER || '',
        LLM_TASK_FOLLOWUP_PROVIDER: llmValues.LLM_TASK_FOLLOWUP_PROVIDER || '',
        LLM_TASK_IDLE_PROVIDER: llmValues.LLM_TASK_IDLE_PROVIDER || '',
        LLM_TASK_WEBUI_PROVIDER: llmValues.LLM_TASK_WEBUI_PROVIDER || gs.webuiIntelligenceProvider || '',
      }));
    } catch (err: any) {
      console.error('Failed to load LLM settings:', err);
      setAlert({ type: 'warning', message: 'Could not load LLM settings. Using defaults.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveGlobal = async (patch: Record<string, any>) => {
    await apiService.put('/api/config/global', patch);
  };

  const saveLlmConfig = async (patch: Record<string, any>) => {
    await apiService.put('/api/config/global', {
      configName: 'llm',
      updates: patch,
    });
  };

  const getProviderIcon = (type: string) => {
    const config = LLM_PROVIDER_CONFIGS[type as LLMProviderType];
    return config?.icon || <BrainIcon className="w-5 h-5" />;
  };

  const chatProfiles = useMemo(() => profiles.filter(isChatCapable), [profiles]);
  const embeddingProfiles = useMemo(() => profiles.filter(isEmbeddingCapable), [profiles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg" aria-hidden="true"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Bot className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">LLM Configuration</h5>
          <p className="text-sm text-base-content/70">
            Configure default providers, profiles, and per-use-case assignments for your AI features.
          </p>
        </div>
      </div>

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : alert.type === 'warning' ? 'warning' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Use-case assignment cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. System Default (env-var fallback) */}
        <Card className={`bg-base-100 shadow-sm border ${defaultStatus?.configured ? 'border-success/20' : 'border-warning/20'}`}>
          <div className="card-body p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold flex items-center gap-2">
                <ConfigIcon className="w-4 h-4" /> System Default
              </h3>
              {defaultStatus?.configured
                ? <Badge variant="success" size="small">Active</Badge>
                : <Badge variant="warning" size="small">Not Set</Badge>}
            </div>
            <p className="text-xs opacity-60 mb-3">
              Fallback loaded from environment variables. Used when no profile is assigned.
            </p>
            {defaultStatus?.providers?.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-base-200/50 rounded text-sm">
                {getProviderIcon(p.type)}
                <span className="font-medium">{p.name}</span>
                <Badge variant="neutral" size="small" className="ml-auto">Read-Only</Badge>
              </div>
            ))}
            {(!defaultStatus?.providers?.length) && (
              <div className="alert alert-warning text-xs p-2">
                <WarningIcon className="w-4 h-4" />
                <span>No default provider in .env. Bots without a profile will fail.</span>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Default Chatbot LLM Profile */}
        <Card className="bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <ChatIcon className="w-4 h-4 text-primary" /> Default Chatbot Profile
            </h3>
            <p className="text-xs opacity-60 mb-3">
              Profile used for all bot chat responses when per-use-case mode is off.
            </p>
            <div className="form-control w-full">
              <select
                className="select select-bordered select-sm w-full"
                value={defaultChatbotProfile}
                onChange={async (e) => {
                  setDefaultChatbotProfile(e.target.value);
                  await saveGlobal({ defaultChatbotProfile: e.target.value }).catch(() => {});
                }}
                disabled={loading} aria-busy={loading}
              >
                <option value="">Use System Default</option>
                {chatProfiles.map((p) => (
                  <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* 3. WebUI Intelligence */}
        <Card className="bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <ZapIcon className="w-4 h-4 text-warning" /> WebUI Intelligence
            </h3>
            <p className="text-xs opacity-60 mb-3">
              Powers AI assistance features inside the WebUI (e.g. generating bot names).
            </p>
            <div className="form-control w-full">
              <select
                className="select select-bordered select-sm w-full"
                value={webuiIntelligenceProvider}
                onChange={async (e) => {
                  setWebuiIntelligenceProvider(e.target.value);
                  await saveGlobal({ webuiIntelligenceProvider: e.target.value }).catch(() => {});
                }}
                disabled={loading} aria-busy={loading}
              >
                <option value="">None (Disabled)</option>
                {chatProfiles.map((p) => (
                  <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* 4. Default Embedding Provider */}
        <Card className="bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <CpuIcon className="w-4 h-4 text-secondary" /> Default Embedding Provider
            </h3>
            <p className="text-xs opacity-60 mb-3">
              Embedding-capable provider/profile used by memory and semantic search features.
            </p>
            <div className="form-control w-full">
              <select
                className="select select-bordered select-sm w-full"
                value={defaultEmbeddingProvider}
                onChange={async (e) => {
                  setDefaultEmbeddingProvider(e.target.value);
                  await saveLlmConfig({ DEFAULT_EMBEDDING_PROVIDER: e.target.value }).catch(() => {});
                }}
                disabled={loading} aria-busy={loading}
              >
                <option value="">None Selected</option>
                {embeddingProfiles.map((p) => (
                  <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-use-case toggle */}
      <Card className="bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-5 flex flex-row items-center justify-between">
          <div>
            <h3 className="font-bold flex items-center gap-2">
              {perUseCaseEnabled
                ? <ToggleOnIcon className="w-5 h-5 text-primary" />
                : <ToggleOffIcon className="w-5 h-5 opacity-40" />}
              Per-Use-Case LLM Profiles
            </h3>
            <p className="text-xs opacity-60 mt-0.5">
              When enabled, assign different profiles to summarisation, moderation, and other tasks independently.
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={perUseCaseEnabled}
            onChange={async (e) => {
              setPerUseCaseEnabled(e.target.checked);
              await saveGlobal({ perUseCaseEnabled: e.target.checked }).catch(() => {});
            }}
          />
        </div>
      </Card>

      {/* Per-use-case task profile assignments */}
      {perUseCaseEnabled && (
        <Card className="bg-base-100 shadow-sm border border-primary/20">
          <div className="card-body p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <BrainIcon className="w-4 h-4 text-primary" /> Task Profile Assignments
            </h3>
            <p className="text-xs opacity-60 mb-4">
              Assign a specific LLM profile to each task type. Leave as &quot;Use Default&quot; to fall back to the default chatbot profile.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: 'LLM_TASK_SEMANTIC_PROVIDER', label: 'Semantic Relevance', icon: <SearchIcon className="w-4 h-4 text-info" />, description: 'Determines if a message is relevant to a bot\'s topic' },
                { key: 'LLM_TASK_SUMMARY_PROVIDER', label: 'Summarization', icon: <ClockIcon className="w-4 h-4 text-success" />, description: 'Generates conversation summaries and log prose' },
                { key: 'LLM_TASK_FOLLOWUP_PROVIDER', label: 'Follow-up', icon: <ReplyIcon className="w-4 h-4 text-warning" />, description: 'Generates follow-up questions and continuations' },
                { key: 'LLM_TASK_IDLE_PROVIDER', label: 'Idle Response', icon: <CoffeeIcon className="w-4 h-4 text-secondary" />, description: 'Handles idle/scheduled responses when no user input' },
                { key: 'LLM_TASK_WEBUI_PROVIDER', label: 'WebUI Intelligence', icon: <MonitorIcon className="w-4 h-4 text-accent" />, description: 'Powers AI-assisted features within the web interface' },
              ] as const).map(({ key, label, icon, description }) => (
                <div key={key} className="flex items-start gap-3 p-3 bg-base-200/40 rounded-lg border border-base-200">
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <label className="font-medium text-sm">{label}</label>
                    <p className="text-[11px] opacity-50 mb-2">{description}</p>
                    <select
                      className="select select-bordered select-sm w-full"
                      value={taskProfiles[key] || ''}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setTaskProfiles((prev) => ({ ...prev, [key]: value }));
                        if (key === 'LLM_TASK_WEBUI_PROVIDER') {
                          await saveGlobal({ webuiIntelligenceProvider: value }).catch(() => {});
                        } else {
                          await saveLlmConfig({ [key]: value }).catch(() => {});
                        }
                      }}
                      disabled={loading}
                      aria-busy={loading}
                    >
                      <option value="">Use Default</option>
                      {chatProfiles.map((p) => (
                        <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Link to full LLM Providers page for creating / editing profiles */}
      <div className="flex justify-between items-center text-sm pt-2">
        <span className="text-base-content/70">Need to create or manage custom LLM profiles?</span>
        <Link to="/admin/providers/llm" className="btn btn-sm btn-ghost gap-2 text-primary">
          <LinkIcon className="w-4 h-4" />
          Go to LLM Providers
        </Link>
      </div>
    </div>
  );
};

export default SettingsLLM;
