/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Logger from '../utils/logger';
import Card from '../components/DaisyUI/Card';
import Badge from '../components/DaisyUI/Badge';
import {
  Brain as BrainIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  MessageSquare as ChatIcon,
  Cpu as CpuIcon,
  ToggleLeft as ToggleOffIcon,
  ToggleRight as ToggleOnIcon,
} from 'lucide-react';
import type { LLMProviderType } from '../types/bot';
import { LLM_PROVIDER_CONFIGS } from '../types/bot';
import { apiService } from '../services/api';
import { useProviderManagement, type ProfileItem } from '../hooks/useProviderManagement';
import ProviderManagementPage from '../components/ProviderManagement/ProviderManagementPage';

type LlmModelType = 'chat' | 'embedding' | 'both';

const normalizeModelType = (value: unknown): LlmModelType => {
  if (value === 'embedding' || value === 'both') {
    return value;
  }
  return 'chat';
};

const isChatCapable = (profile: any): boolean => {
  const modelType = normalizeModelType(profile?.modelType);
  return modelType === 'chat' || modelType === 'both';
};

const isEmbeddingCapable = (profile: any): boolean => {
  const modelType = normalizeModelType(profile?.modelType);
  return modelType === 'embedding' || modelType === 'both';
};

const LLMProvidersPage: React.FC = () => {
  const {
    profiles,
    loading: hookLoading,
    error,
    setError,
    fetchProfiles: fetchHookProfiles,
    handleAddProfile,
    handleEditProfile,
    handleDeleteProfile,
    handleProviderSubmit,
    modalState,
    closeModal,
  } = useProviderManagement({
    providerType: 'llm',
    profilesPath: '/api/config/llm-profiles',
    onBeforeSave: (payload) => ({
      ...payload,
      modelType: payload.modelType || 'chat',
    }),
  });

  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [libraryStatus, setLibraryStatus] = useState<Record<string, { installed: boolean; package: string }>>({});
  const [webuiIntelligenceProvider, setWebuiIntelligenceProvider] = useState<string>('');
  const [defaultChatbotProfile, setDefaultChatbotProfile] = useState<string>('');
  const [defaultEmbeddingProvider, setDefaultEmbeddingProvider] = useState<string>('');
  const [perUseCaseEnabled, setPerUseCaseEnabled] = useState<boolean>(false);
  const [extraLoading, setExtraLoading] = useState(false);

  const fetchExtraData = useCallback(async () => {
    try {
      setExtraLoading(true);
      const [statusResult, globalResult] = await Promise.allSettled([
        apiService.get('/api/config/llm-status'),
        apiService.get('/api/config/global'),
      ]);
      const statusRes = statusResult.status === 'fulfilled' ? statusResult.value : {};
      const globalRes = globalResult.status === 'fulfilled' ? globalResult.value : {};

      setDefaultStatus(statusRes);
      const gs = (globalRes as any)._userSettings?.values || {};
      const llmValues = (globalRes as any).llm?.values || {};

      setWebuiIntelligenceProvider(gs.webuiIntelligenceProvider || '');
      setDefaultChatbotProfile(gs.defaultChatbotProfile || '');
      setDefaultEmbeddingProvider(llmValues.DEFAULT_EMBEDDING_PROVIDER || gs.defaultEmbeddingProfile || '');
      setPerUseCaseEnabled(!!gs.perUseCaseEnabled);
      if ((statusRes as any).libraryStatus) setLibraryStatus((statusRes as any).libraryStatus);
    } catch (err: any) {
      Logger.error('Failed to load extra LLM data', err);
    } finally {
      setExtraLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchHookProfiles(), fetchExtraData()]);
  }, [fetchHookProfiles, fetchExtraData]);

  useEffect(() => {
    fetchExtraData();
  }, [fetchExtraData]);

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
    const config = (LLM_PROVIDER_CONFIGS as any)[type];
    return config?.icon || <BrainIcon className="w-5 h-5" />;
  };

  const renderLibraryCheck = (type: string) => {
    const status = libraryStatus[type];
    if (!status?.installed) return status ? (
      <div className="tooltip tooltip-bottom" data-tip={`Missing: ${status.package}`}>
        <Badge variant="error" size="small" className="gap-1 cursor-help">
          <XIcon className="w-3 h-3" /> Lib Missing
        </Badge>
      </div>
    ) : null;
    return null;
  };

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map(p => p.provider));
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  const chatProfiles = useMemo(() => profiles.filter(isChatCapable), [profiles]);
  const embeddingProfiles = useMemo(() => profiles.filter(isEmbeddingCapable), [profiles]);

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: <BrainIcon className="w-8 h-8" />, color: 'primary' as const },
    { id: 'types', title: 'Provider Types', value: providerTypes.length, icon: <CpuIcon className="w-8 h-8" />, color: 'secondary' as const },
    { id: 'default', title: 'System Default', value: defaultStatus?.configured ? 'Active' : 'Missing', icon: defaultStatus?.configured ? <CheckIcon className="w-8 h-8" /> : <WarningIcon className="w-8 h-8" />, color: defaultStatus?.configured ? 'success' as const : 'warning' as const },
  ];

  const loading = hookLoading || extraLoading;

  return (
    <ProviderManagementPage
      title="LLM Providers"
      description="Configure AI provider profiles and assign them to specific use cases."
      icon={BrainIcon}
      providerType="llm"
      profiles={profiles}
      loading={loading}
      error={error}
      setError={setError}
      fetchProfiles={refreshAll}
      handleAddProfile={handleAddProfile}
      handleEditProfile={handleEditProfile}
      handleDeleteProfile={handleDeleteProfile}
      handleProviderSubmit={handleProviderSubmit}
      modalState={modalState}
      closeModal={closeModal}
      stats={stats}
      getProviderIcon={getProviderIcon}
      renderExtraBadges={(profile: ProfileItem) => (
        <>
          <Badge
            variant={
              normalizeModelType(profile.modelType) === 'embedding'
                ? 'warning'
                : normalizeModelType(profile.modelType) === 'both'
                  ? 'success'
                  : 'neutral'
            }
            size="small"
          >
            {normalizeModelType(profile.modelType)}
          </Badge>
          {renderLibraryCheck(profile.provider)}
          {profile.key === defaultChatbotProfile && (
            <Badge variant="primary" size="small">Default Chatbot</Badge>
          )}
          {profile.key === webuiIntelligenceProvider && (
            <Badge variant="warning" size="small">WebUI AI</Badge>
          )}
          {profile.key === defaultEmbeddingProvider && (
            <Badge variant="secondary" size="small">Default Embedding</Badge>
          )}
        </>
      )}
    >
      {/* ── Use-case assignment cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
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
                  await saveGlobal({ defaultChatbotProfile: e.target.value }).catch(() => { });
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
                  await saveGlobal({ webuiIntelligenceProvider: e.target.value }).catch(() => { });
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

        <Card className="bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <CpuIcon className="w-4 h-4 text-secondary" /> Default Embedding Provider
            </h3>
            <p className="text-xs opacity-60 mb-3">
              Embedding-capable provider used by memory and semantic search features.
            </p>
            <div className="form-control w-full">
              <select
                className="select select-bordered select-sm w-full"
                value={defaultEmbeddingProvider}
                onChange={async (e) => {
                  setDefaultEmbeddingProvider(e.target.value);
                  await saveLlmConfig({ DEFAULT_EMBEDDING_PROVIDER: e.target.value }).catch(() => { });
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

      {/* ── Per-use-case toggle ── */}
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
              await saveGlobal({ perUseCaseEnabled: e.target.checked }).catch(() => { });
            }}
          />
        </div>
      </Card>
    </ProviderManagementPage>
  );
};

export default LLMProvidersPage;
