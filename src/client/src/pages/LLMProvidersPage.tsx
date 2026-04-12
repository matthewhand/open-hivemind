/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '../hooks/useModal';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import Tabs from '../components/DaisyUI/Tabs';
import Toggle from '../components/DaisyUI/Toggle';
import { Alert } from '../components/DaisyUI/Alert';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import ConfigKeyValueCard from '../components/DaisyUI/ConfigKeyValueCard';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import SearchFilterBar from '../components/SearchFilterBar';
import { MarketplaceGrid } from '../components/Marketplace';
import LlmTestChat from '../components/LlmTestChat';
import {
  Brain as BrainIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  MessageSquare as ChatIcon,
  Cpu as CpuIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
  Search,
  RefreshCw,
  ToggleLeft as ToggleOffIcon,
  ToggleRight as ToggleOnIcon,
  Search as SearchIcon,
  Clock as ClockIcon,
  Reply as ReplyIcon,
  Coffee as CoffeeIcon,
  Monitor as MonitorIcon,
  Store as StoreIcon,
} from 'lucide-react';
import type { LLMProviderType } from '../types/bot';
import { LLM_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../services/api';
import useUrlParams from '../hooks/useUrlParams';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBulkSelection } from '../hooks/useBulkSelection';
import BulkActionBar from '../components/BulkActionBar';
import Checkbox from '../components/DaisyUI/Checkbox';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useSavedStamp } from '../contexts/SavedStampContext';
import Select from '../components/DaisyUI/Select';

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

// ---------------------------------------------------------------------------
// Profiles Tab Content
// ---------------------------------------------------------------------------

const ProfilesTab: React.FC<{
  profiles: any[];
  filteredProfiles: any[];
  providerTypes: { label: string; value: string }[];
  stats: any[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filterType: string;
  defaultChatbotProfile: string;
  webuiIntelligenceProvider: string;
  defaultEmbeddingProvider: string;
  libraryStatus: Record<string, { installed: boolean; package: string }>;
  expandedProfile: string | null;
  onSearchChange: (q: string) => void;
  onFilterChange: (f: string) => void;
  onClearError: () => void;
  onRefresh: () => void;
  onAddProfile: () => void;
  onEditProfile: (profile: any) => void;
  onDeleteProfile: (key: string) => void;
  onToggleExpand: (key: string) => void;
  onTestProfile?: (key: string, provider: string) => void;
}> = ({
  profiles,
  filteredProfiles,
  providerTypes,
  stats,
  loading,
  error,
  searchQuery,
  filterType,
  defaultChatbotProfile,
  webuiIntelligenceProvider,
  defaultEmbeddingProvider,
  libraryStatus,
  expandedProfile,
  onSearchChange,
  onFilterChange,
  onClearError,
  onRefresh,
  onAddProfile,
  onEditProfile,
  onDeleteProfile,
  onToggleExpand,
  onTestProfile,
}) => {
  const getProviderIcon = (type: string) => {
    const config = (LLM_PROVIDER_CONFIGS as any)[type as any];
    return config?.icon || <BrainIcon className="w-5 h-5" />;
  };

  const renderLibraryCheck = (type: string) => {
    const status = libraryStatus[type];
    if (!status?.installed)
      return status ? (
        <div className="tooltip tooltip-bottom" data-tip={`Missing: ${status.package}`}>
          <Badge variant="error" size="small" className="gap-1 cursor-help">
            <XIcon className="w-3 h-3" /> Lib Missing
          </Badge>
        </div>
      ) : null;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onRefresh} disabled={loading} aria-busy={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" onClick={onAddProfile}>
            <AddIcon className="w-4 h-4 mr-2" /> Create Profile
          </Button>
        </div>
      </div>

      <StatsCards stats={stats} isLoading={loading} />

      {error && (
        <Alert status="error" icon={<XIcon />} message={error} onClose={onClearError} />
      )}

      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search profiles..."
        filters={[
          {
            key: 'type',
            value: filterType,
            onChange: onFilterChange,
            options: [{ label: 'All Types', value: 'all' }, ...providerTypes],
            className: 'w-48',
          },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={BrainIcon}
          title="No Profiles Created"
          description="Create a custom profile to override system defaults for specific bots."
          actionLabel="Create Profile"
          actionIcon={AddIcon}
          onAction={onAddProfile}
          variant="noData"
        />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching profiles"
          description="Try adjusting your search or filters."
          actionLabel="Clear Filters"
          onAction={() => {
            onSearchChange('');
            onFilterChange('all');
          }}
          variant="noResults"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card
              key={profile.key}
              className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md"
            >
              <div className="card-body p-0">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => onToggleExpand(profile.key)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      {getProviderIcon(profile.provider)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {profile.name}
                        <span className="text-xs font-normal opacity-50 px-2 py-0.5 bg-base-200 rounded-full font-mono">
                          {profile.key}
                        </span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="small" style="outline">
                          {profile.provider}
                        </Badge>
                        <Badge
                          variant={
                            normalizeModelType(profile.modelType) === 'embedding'
                              ? 'warning'
                              : normalizeModelType(profile.modelType) === 'both'
                                ? 'info'
                                : 'neutral'
                          }
                          size="small"
                        >
                          {normalizeModelType(profile.modelType)}
                        </Badge>
                        {renderLibraryCheck(profile.provider)}
                        {profile.key === defaultChatbotProfile && (
                          <Badge variant="primary" size="small">
                            Default Chatbot
                          </Badge>
                        )}
                        {profile.key === webuiIntelligenceProvider && (
                          <Badge variant="warning" size="small">
                            WebUI AI
                          </Badge>
                        )}
                        {profile.key === defaultEmbeddingProvider && (
                          <Badge variant="secondary" size="small">
                            Default Embedding
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {onTestProfile && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-success hover:bg-success/10"
                        aria-label={`Test ${profile.name} provider`}
                        onClick={() => onTestProfile(profile.key, profile.provider)}
                      >
                        <ChatIcon className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" aria-label={`Edit ${profile.name} profile`} onClick={() => onEditProfile(profile)}>
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:bg-error/10"
                      aria-label={`Delete ${profile.name} profile`}
                      onClick={() => onDeleteProfile(profile.key)}
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={expandedProfile === profile.key ? 'Collapse details' : 'Expand details'}
                      onClick={() => onToggleExpand(profile.key)}
                    >
                      {expandedProfile === profile.key ? (
                        <CollapseIcon className="w-4 h-4" />
                      ) : (
                        <ExpandIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {expandedProfile === profile.key && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-base-200/50 rounded-xl p-4 border border-base-200">
                      <h4 className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2">
                        <ConfigIcon className="w-3 h-3" /> Configuration
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(profile.config || {}).map(([k, v]) => (
                          <div
                            key={k}
                            className="bg-base-100 p-2 rounded border border-base-200/50 flex flex-col"
                          >
                            <span className="font-mono text-[10px] opacity-50 uppercase tracking-wider mb-1">
                              {k}
                            </span>
                            <span className="font-medium text-sm truncate" title={String(v)}>
                              {String(k).toLowerCase().includes('key') ||
                              String(k).toLowerCase().includes('token') ||
                              String(k).toLowerCase().includes('password')
                                ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
                                : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Settings Tab Content
// ---------------------------------------------------------------------------

const SettingsTab: React.FC<{
  profiles: any[];
  defaultStatus: any;
  loading: boolean;
  defaultChatbotProfile: string;
  defaultEmbeddingProvider: string;
  webuiIntelligenceProvider: string;
  perUseCaseEnabled: boolean;
  taskProfiles: Record<string, string>;
  chatProfiles: any[];
  embeddingProfiles: any[];
  onDefaultChatbotChange: (val: string) => void;
  onDefaultEmbeddingChange: (val: string) => void;
  onWebuiIntelligenceChange: (val: string) => void;
  onPerUseCaseChange: (val: boolean) => void;
  onTaskProfileChange: (key: string, val: string) => void;
}> = ({
  defaultStatus,
  loading,
  defaultChatbotProfile,
  defaultEmbeddingProvider,
  webuiIntelligenceProvider,
  perUseCaseEnabled,
  taskProfiles,
  chatProfiles,
  embeddingProfiles,
  onDefaultChatbotChange,
  onDefaultEmbeddingChange,
  onWebuiIntelligenceChange,
  onPerUseCaseChange,
  onTaskProfileChange,
}) => {
  const [advancedMode, setAdvancedMode] = useState(false);

  const getProviderIcon = (type: string) => {
    const config = (LLM_PROVIDER_CONFIGS as any)[type as any];
    return config?.icon || <BrainIcon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings -- always visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Default Chatbot LLM Profile */}
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
                onChange={(e) => onDefaultChatbotChange(e.target.value)}
                disabled={loading}
                aria-busy={loading}
              >
                <option value="">Use System Default</option>
                {chatProfiles.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Default Embedding Provider */}
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
                onChange={(e) => onDefaultEmbeddingChange(e.target.value)}
                disabled={loading}
                aria-busy={loading}
              >
                <option value="">None Selected</option>
                {embeddingProfiles.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced Toggle */}
      <div className="flex items-center gap-3 pt-2">
        <Toggle
          label="Advanced"
          color="primary"
          size="sm"
          checked={advancedMode}
          onChange={(e) => setAdvancedMode(e.target.checked)}
        />
      </div>

      {/* Advanced Settings -- hidden behind toggle */}
      {advancedMode && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Default (env-var fallback) */}
            <Card
              className={`bg-base-100 shadow-sm border ${defaultStatus?.configured ? 'border-success/20' : 'border-warning/20'}`}
            >
              <div className="card-body p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold flex items-center gap-2">
                    <ConfigIcon className="w-4 h-4" /> System Default
                  </h3>
                  {defaultStatus?.configured ? (
                    <Badge variant="success" size="small">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="small">
                      Not Set
                    </Badge>
                  )}
                </div>
                <p className="text-xs opacity-60 mb-3">
                  Fallback loaded from environment variables. Used when no profile is assigned.
                </p>
                {defaultStatus?.providers?.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 bg-base-200/50 rounded text-sm"
                  >
                    {getProviderIcon(p.type)}
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="neutral" size="small" className="ml-auto">
                      Read-Only
                    </Badge>
                  </div>
                ))}
                {!defaultStatus?.providers?.length && (
                  <div className="alert alert-warning text-xs p-2">
                    <WarningIcon className="w-4 h-4" />
                    <span>No default provider in .env. Bots without a profile will fail.</span>
                  </div>
                )}
              </div>
            </Card>

            {/* WebUI Intelligence */}
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
                    onChange={(e) => onWebuiIntelligenceChange(e.target.value)}
                    disabled={loading}
                    aria-busy={loading}
                  >
                    <option value="">None (Disabled)</option>
                    {chatProfiles.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} ({p.provider})
                      </option>
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
                  {perUseCaseEnabled ? (
                    <ToggleOnIcon className="w-5 h-5 text-primary" />
                  ) : (
                    <ToggleOffIcon className="w-5 h-5 opacity-40" />
                  )}
                  Per-Use-Case LLM Profiles
                </h3>
                <p className="text-xs opacity-60 mt-0.5">
                  When enabled, assign different profiles to summarisation, moderation, and other
                  tasks independently.
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={perUseCaseEnabled}
                onChange={(e) => onPerUseCaseChange(e.target.checked)}
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
                  Assign a specific LLM profile to each task type. Leave as &quot;Use Default&quot;
                  to fall back to the default chatbot profile.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(
                    [
                      {
                        key: 'LLM_TASK_SEMANTIC_PROVIDER',
                        label: 'Semantic Relevance',
                        icon: <SearchIcon className="w-4 h-4 text-info" />,
                        description:
                          "Determines if a message is relevant to a bot's topic",
                      },
                      {
                        key: 'LLM_TASK_SUMMARY_PROVIDER',
                        label: 'Summarization',
                        icon: <ClockIcon className="w-4 h-4 text-success" />,
                        description: 'Generates conversation summaries and log prose',
                      },
                      {
                        key: 'LLM_TASK_FOLLOWUP_PROVIDER',
                        label: 'Follow-up',
                        icon: <ReplyIcon className="w-4 h-4 text-warning" />,
                        description: 'Generates follow-up questions and continuations',
                      },
                      {
                        key: 'LLM_TASK_IDLE_PROVIDER',
                        label: 'Idle Response',
                        icon: <CoffeeIcon className="w-4 h-4 text-secondary" />,
                        description: 'Handles idle/scheduled responses when no user input',
                      },
                      {
                        key: 'LLM_TASK_WEBUI_PROVIDER',
                        label: 'WebUI Intelligence',
                        icon: <MonitorIcon className="w-4 h-4 text-accent" />,
                        description:
                          'Powers AI-assisted features within the web interface',
                      },
                    ] as const
                  ).map(({ key, label, icon, description }) => (
                    <div
                      key={key}
                      className="flex items-start gap-3 p-3 bg-base-200/40 rounded-lg border border-base-200"
                    >
                      <div className="mt-0.5">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <label className="font-medium text-sm">{label}</label>
                        <p className="text-[11px] opacity-50 mb-2">{description}</p>
                        <select
                          className="select select-bordered select-sm w-full"
                          value={taskProfiles[key] || ''}
                          onChange={(e) => onTaskProfileChange(key, e.target.value)}
                          disabled={loading}
                          aria-busy={loading}
                        >
                          <option value="">Use Default</option>
                          {chatProfiles.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.name} ({p.provider})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

const LLMProvidersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profiles';

  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<
    Record<string, { installed: boolean; package: string }>
  >({});
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
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [testProfileKey, setTestProfileKey] = useState<string | null>(null);
  const [testProviderType, setTestProviderType] = useState('');

  const fetchProfiles = useCallback(async () => {
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
      setProfiles(
        (profilesRes as any).llm || (profilesRes as any).profiles?.llm || [],
      );
      setDefaultStatus(statusRes);
      const gs = (globalRes as any)._userSettings?.values || {};
      const llmValues = (globalRes as any).llm?.values || {};
      setWebuiIntelligenceProvider(gs.webuiIntelligenceProvider || '');
      setDefaultChatbotProfile(gs.defaultChatbotProfile || '');
      setDefaultEmbeddingProvider(
        llmValues.DEFAULT_EMBEDDING_PROVIDER || gs.defaultEmbeddingProfile || '',
      );
      setPerUseCaseEnabled(!!gs.perUseCaseEnabled);
      setTaskProfiles((prev) => ({
        ...prev,
        LLM_TASK_SEMANTIC_PROVIDER: llmValues.LLM_TASK_SEMANTIC_PROVIDER || '',
        LLM_TASK_SUMMARY_PROVIDER: llmValues.LLM_TASK_SUMMARY_PROVIDER || '',
        LLM_TASK_FOLLOWUP_PROVIDER: llmValues.LLM_TASK_FOLLOWUP_PROVIDER || '',
        LLM_TASK_IDLE_PROVIDER: llmValues.LLM_TASK_IDLE_PROVIDER || '',
        LLM_TASK_WEBUI_PROVIDER:
          llmValues.LLM_TASK_WEBUI_PROVIDER || gs.webuiIntelligenceProvider || '',
      }));
      if ((statusRes as any).libraryStatus)
        setLibraryStatus((statusRes as any).libraryStatus);
    } catch (err: unknown) {
      setError(
        (err instanceof Error ? err.message : String(err)) || 'Failed to load configuration',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const saveGlobal = async (patch: Record<string, any>) => {
    await apiService.put('/api/config/global', patch);
  };

  const saveLlmConfig = async (patch: Record<string, any>) => {
    await apiService.put('/api/config/global', {
      configName: 'llm',
      updates: patch,
    });
  };

  const handleAddProfile = () => openAddModal('global', 'llm');

  const handleEditProfile = (profile: any) => {
    openEditModal('global', 'llm', {
      id: profile.key,
      name: profile.name,
      type: profile.provider,
      config: profile.config,
      modelType: profile.modelType,
      enabled: true,
    } as any);
  };

  const handleDeleteProfile = async (key: string) => {
    if (!window.confirm(`Delete profile "${key}"?`)) return;
    try {
      await apiService.delete(`/api/config/llm-profiles/${key}`);
      fetchProfiles();
    } catch (err: unknown) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleProviderSubmit = async (providerData: any) => {
    try {
      const payload = {
        key: providerData.name.toLowerCase().replace(/\s+/g, '-'),
        name: providerData.name,
        provider: providerData.type,
        modelType: providerData.modelType || 'chat',
        config: providerData.config,
      };
      if (modalState.isEdit && modalState.provider?.id) {
        const oldKey = modalState.provider.id;
        if (oldKey === payload.key) {
          await apiService.put(`/api/config/llm-profiles/${oldKey}`, payload);
        } else {
          const backup = profiles.find((p) => p.key === oldKey);
          await apiService.delete(`/api/config/llm-profiles/${oldKey}`);
          try {
            await apiService.post('/api/config/llm-profiles', payload);
          } catch (e: unknown) {
            if (backup)
              await apiService.post('/api/config/llm-profiles', backup).catch(() => {});
            throw e;
          }
        }
      } else {
        await apiService.post('/api/config/llm-profiles', payload);
      }
      closeModal();
      fetchProfiles();
    } catch (err: unknown) {
      alert(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const toggleExpand = (key: string) =>
    setExpandedProfile(expandedProfile === key ? null : key);

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.provider.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch && (filterType === 'all' || p.provider === filterType);
      }),
    [profiles, searchQuery, filterType],
  );

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map((p) => p.provider));
    return Array.from(types).map((type) => ({ label: type, value: type }));
  }, [profiles]);

  const chatProfiles = useMemo(() => profiles.filter(isChatCapable), [profiles]);
  const embeddingProfiles = useMemo(() => profiles.filter(isEmbeddingCapable), [profiles]);

  const stats = [
    {
      id: 'total',
      title: 'Total Profiles',
      value: profiles.length,
      icon: 'brain',
      color: 'primary' as const,
    },
    {
      id: 'types',
      title: 'Provider Types',
      value: providerTypes.length,
      icon: 'cpu',
      color: 'secondary' as const,
    },
    {
      id: 'default',
      title: 'System Default',
      value: defaultStatus?.configured ? 'Active' : 'Missing',
      icon: defaultStatus?.configured ? 'check' : 'alert',
      color: defaultStatus?.configured ? ('success' as const) : ('warning' as const),
    },
  ];

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    {
      id: 'profiles',
      label: 'Profiles',
      icon: <BrainIcon className="w-4 h-4" />,
      content: (
        <ProfilesTab
          profiles={profiles}
          filteredProfiles={filteredProfiles}
          providerTypes={providerTypes}
          stats={stats}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          filterType={filterType}
          defaultChatbotProfile={defaultChatbotProfile}
          webuiIntelligenceProvider={webuiIntelligenceProvider}
          defaultEmbeddingProvider={defaultEmbeddingProvider}
          libraryStatus={libraryStatus}
          expandedProfile={expandedProfile}
          onSearchChange={setSearchQuery}
          onFilterChange={setFilterType}
          onClearError={() => setError(null)}
          onRefresh={fetchProfiles}
          onAddProfile={handleAddProfile}
          onEditProfile={handleEditProfile}
          onDeleteProfile={handleDeleteProfile}
          onToggleExpand={toggleExpand}
          onTestProfile={(key, provider) => {
            setTestProfileKey(key);
            setTestProviderType(provider);
          }}
        />
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <ConfigIcon className="w-4 h-4" />,
      content: (
        <SettingsTab
          profiles={profiles}
          defaultStatus={defaultStatus}
          loading={loading}
          defaultChatbotProfile={defaultChatbotProfile}
          defaultEmbeddingProvider={defaultEmbeddingProvider}
          webuiIntelligenceProvider={webuiIntelligenceProvider}
          perUseCaseEnabled={perUseCaseEnabled}
          taskProfiles={taskProfiles}
          chatProfiles={chatProfiles}
          embeddingProfiles={embeddingProfiles}
          onDefaultChatbotChange={async (val) => {
            setDefaultChatbotProfile(val);
            await saveGlobal({ defaultChatbotProfile: val }).catch(() => {});
          }}
          onDefaultEmbeddingChange={async (val) => {
            setDefaultEmbeddingProvider(val);
            await saveLlmConfig({ DEFAULT_EMBEDDING_PROVIDER: val }).catch(() => {});
          }}
          onWebuiIntelligenceChange={async (val) => {
            setWebuiIntelligenceProvider(val);
            await saveGlobal({ webuiIntelligenceProvider: val }).catch(() => {});
          }}
          onPerUseCaseChange={async (val) => {
            setPerUseCaseEnabled(val);
            await saveGlobal({ perUseCaseEnabled: val }).catch(() => {});
          }}
          onTaskProfileChange={async (key, val) => {
            setTaskProfiles((prev) => ({ ...prev, [key]: val }));
            if (key === 'LLM_TASK_WEBUI_PROVIDER') {
              await saveGlobal({ webuiIntelligenceProvider: val }).catch(() => {});
            } else {
              await saveLlmConfig({ [key]: val }).catch(() => {});
            }
          }}
        />
      ),
    },
    {
      id: 'community',
      label: 'Community',
      icon: <StoreIcon className="w-4 h-4" />,
      content: <MarketplaceGrid filter="llm" />,
    },
  ];

  return (
    <div>
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold">LLM Providers</h1>
        <p className="text-base-content/60 text-sm mt-1">Manage language model provider profiles and settings</p>
      </div>
      <div className="px-6 pb-6">
        <Tabs
          tabs={tabs}
          variant="lifted"
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      <ProviderConfigModal
        modalState={modalState}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
        existingProviders={profiles}
      />

      {testProfileKey && (
        <LlmTestChat
          providerKey={testProfileKey}
          providerType={testProviderType}
          onClose={() => {
            setTestProfileKey(null);
            setTestProviderType('');
          }}
        />
      )}
    </div>
  );
};

export default LLMProvidersPage;
