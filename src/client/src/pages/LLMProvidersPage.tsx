/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useModal } from '../hooks/useModal';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import SearchFilterBar from '../components/SearchFilterBar';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
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
} from 'lucide-react';
import type { LLMProviderType } from '../types/bot';
import { LLM_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../services/api';
import useUrlParams from '../hooks/useUrlParams';
import { useApiQuery } from '../hooks/useApiQuery';
import { useBulkSelection } from '../hooks/useBulkSelection';
import BulkActionBar from '../components/BulkActionBar';

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
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const errorToast = useErrorToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<Record<string, { installed: boolean; package: string }>>({});
  const [webuiIntelligenceProvider, setWebuiIntelligenceProvider] = useState<string>('');
  const [defaultChatbotProfile, setDefaultChatbotProfile] = useState<string>('');
  const [defaultEmbeddingProvider, setDefaultEmbeddingProvider] = useState<string>('');
  const [perUseCaseEnabled, setPerUseCaseEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    type: { type: 'string', default: 'all' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const filterType = urlParams.type;
  const setFilterType = (v: string) => setUrlParam('type', v);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Cached queries for LLM profiles, status, and global config
  const {
    data: profilesRes,
    loading: profilesLoading,
    error: profilesError,
    refetch: refetchProfiles,
  } = useApiQuery<any>('/api/config/llm-profiles', { ttl: 30_000 });

  const {
    data: statusRes,
    loading: statusLoading,
    refetch: refetchStatus,
  } = useApiQuery<any>('/api/config/llm-status', { ttl: 30_000 });

  const {
    data: globalRes,
    loading: globalLoading,
    refetch: refetchGlobal,
  } = useApiQuery<any>('/api/config/global', { ttl: 30_000 });

  // Derive state from cached responses
  useEffect(() => {
    if (profilesRes) {
      setProfiles(profilesRes.llm || profilesRes.profiles?.llm || []);
    }
  }, [profilesRes]);

  useEffect(() => {
    if (statusRes) {
      setDefaultStatus(statusRes);
      if (statusRes.libraryStatus) setLibraryStatus(statusRes.libraryStatus);
    }
  }, [statusRes]);

  useEffect(() => {
    if (globalRes) {
      const gs = globalRes._userSettings?.values || {};
      const llmValues = globalRes.llm?.values || {};
      setWebuiIntelligenceProvider(gs.webuiIntelligenceProvider || '');
      setDefaultChatbotProfile(gs.defaultChatbotProfile || '');
      setDefaultEmbeddingProvider(llmValues.DEFAULT_EMBEDDING_PROVIDER || gs.defaultEmbeddingProfile || '');
      setPerUseCaseEnabled(!!gs.perUseCaseEnabled);
    }
  }, [globalRes]);

  // Sync loading/error
  useEffect(() => {
    setLoading(profilesLoading || statusLoading || globalLoading);
  }, [profilesLoading, statusLoading, globalLoading]);

  useEffect(() => {
    if (profilesError) setError(profilesError.message);
  }, [profilesError]);

  const fetchProfiles = useCallback(async () => {
    await Promise.all([refetchProfiles(), refetchStatus(), refetchGlobal()]);
  }, [refetchProfiles, refetchStatus, refetchGlobal]);

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
      id: profile?.key, name: profile?.name, type: profile?.provider, config: profile?.config, modelType: profile?.modelType, enabled: true,
    });
  };

  const handleDeleteProfile = async (key: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Profile',
      message: `Delete profile "${key}"?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.delete(`/api/config/llm-profiles/${key}`);
          fetchProfiles();
        } catch (err: any) { errorToast('Delete Failed', `Failed to delete: ${err.message}`); }
      },
    });
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
          } catch (e: any) {
            if (backup) await apiService.post('/api/config/llm-profiles', backup).catch(() => {});
            throw e;
          }
        }
      } else {
        await apiService.post('/api/config/llm-profiles', payload);
      }
      closeModal();
      fetchProfiles();
    } catch (err: any) { errorToast('Save Failed', `Failed to save: ${err.message}`); }
  };

  const getProviderIcon = (type: string) => {
    const config = LLM_PROVIDER_CONFIGS[type as LLMProviderType];
    return config?.icon || <BrainIcon className="w-5 h-5" />;
  };

  const toggleExpand = (key: string) => setExpandedProfile(expandedProfile === key ? null : key);

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

  const filteredProfiles = useMemo(() =>
    profiles.filter(p => {
      const matchesSearch = p?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p?.provider?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && (filterType === 'all' || p?.provider === filterType);
    }), [profiles, searchQuery, filterType]);

  // Bulk selection
  const filteredProfileKeys = useMemo(() => filteredProfiles.map(p => p.key), [filteredProfiles]);
  const bulk = useBulkSelection(filteredProfileKeys);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleBulkDeleteProfiles = async () => {
    if (bulk.selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const keys = Array.from(bulk.selectedIds);
      await Promise.allSettled(
        keys.map(key => apiService.delete(`/api/config/llm-profiles/${key}`))
      );
      bulk.clearSelection();
      fetchProfiles();
    } catch (err: any) {
      errorToast('Bulk Delete Failed', 'Failed to delete some profiles');
    } finally {
      setBulkDeleting(false);
    }
  };

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map(p => p?.provider).filter(Boolean));
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  const chatProfiles = useMemo(() => profiles.filter(isChatCapable), [profiles]);
  const embeddingProfiles = useMemo(() => profiles.filter(isEmbeddingCapable), [profiles]);

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'brain', color: 'primary' as const },
    { id: 'types', title: 'Provider Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
    { id: 'default', title: 'System Default', value: defaultStatus?.configured ? 'Active' : 'Missing', icon: defaultStatus?.configured ? 'check' : 'alert', color: defaultStatus?.configured ? 'success' as const : 'warning' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="LLM Providers"
        description="Configure AI provider profiles and assign them to specific use cases."
        icon={<BrainIcon className="w-6 h-6" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={fetchProfiles} disabled={loading} aria-busy={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="primary" onClick={handleAddProfile}>
              <AddIcon className="w-4 h-4 mr-2" /> Create Profile
            </Button>
          </div>
        }
      />

      <StatsCards stats={stats} isLoading={loading} />

      {error && <Alert status="error" icon={<XIcon />} message={error} onClose={() => setError(null)} />}

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
              <div key={p?.id} className="flex items-center gap-2 p-2 bg-base-200/50 rounded text-sm">
                {getProviderIcon(p?.type)}
                <span className="font-medium">{p?.name || 'Unnamed'}</span>
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
                  <option key={p?.key} value={p?.key}>{p?.name || 'Unnamed'} ({p?.provider || 'Unknown'})</option>
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
                  <option key={p?.key} value={p?.key}>{p?.name || 'Unnamed'} ({p?.provider || 'Unknown'})</option>
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
              Embedding-capable provider/profile used by memory and semantic search features when embeddings are needed.
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
                  <option key={p?.key} value={p?.key}>{p?.name || 'Unnamed'} ({p?.provider || 'Unknown'})</option>
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
              await saveGlobal({ perUseCaseEnabled: e.target.checked }).catch(() => {});
            }}
          />
        </div>
      </Card>

      <div className="divider">Custom Profiles</div>

      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search profiles..."
        filters={[{
          key: 'type',
          value: filterType,
          onChange: setFilterType,
          options: [{ label: 'All Types', value: 'all' }, ...providerTypes],
          className: 'w-48',
        }]}
      />

      {loading ? (
        <SkeletonTableLayout rows={6} columns={4} />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={BrainIcon}
          title="No Profiles Created"
          description="Create a custom profile to override system defaults for specific bots."
          actionLabel="Create Profile"
          actionIcon={AddIcon}
          onAction={handleAddProfile}
          variant="noData"
        />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching profiles"
          description="Try adjusting your search or filters."
          actionLabel="Clear Filters"
          onAction={() => { setSearchQuery(''); setFilterType('all'); }}
          variant="noResults"
        />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={bulk.isAllSelected}
              onChange={() => bulk.toggleAll(filteredProfileKeys)}
              aria-label="Select all profiles"
            />
            <span className="text-xs text-base-content/60">Select all</span>
          </div>
          <BulkActionBar
            selectedCount={bulk.selectedCount}
            onClearSelection={bulk.clearSelection}
            actions={[
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteIcon className="w-4 h-4" />,
                variant: 'error',
                onClick: handleBulkDeleteProfiles,
                loading: bulkDeleting,
              },
            ]}
          />
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
              <div className="card-body p-0">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(profile.key)}>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={bulk.isSelected(profile.key)}
                      onChange={(e) => { e.stopPropagation(); bulk.toggleItem(profile.key, e as any); }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${profile.name}`}
                    />
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      {getProviderIcon(profile.provider)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {profile.name}
                        <span className="text-xs font-normal opacity-50 px-2 py-0.5 bg-base-200 rounded-full font-mono">{profile.key}</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="small" style="outline">{profile.provider}</Badge>
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
                          <Badge variant="primary" size="small">Default Chatbot</Badge>
                        )}
                        {profile.key === webuiIntelligenceProvider && (
                          <Badge variant="warning" size="small">WebUI AI</Badge>
                        )}
                        {profile.key === defaultEmbeddingProvider && (
                          <Badge variant="secondary" size="small">Default Embedding</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => handleEditProfile(profile)} aria-label={`Edit ${profile.name} profile`}>
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-error hover:bg-error/10" onClick={() => handleDeleteProfile(profile.key)} aria-label={`Delete ${profile.name} profile`}>
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)} aria-label={expandedProfile === profile.key ? 'Collapse details' : 'Expand details'}>
                      {expandedProfile === profile.key ? <CollapseIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
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
                          <div key={k} className="bg-base-100 p-2 rounded border border-base-200/50 flex flex-col">
                            <span className="font-mono text-[10px] opacity-50 uppercase tracking-wider mb-1">{k}</span>
                            <span className="font-medium text-sm truncate" title={String(v)}>
                              {String(k).toLowerCase().includes('key') || String(k).toLowerCase().includes('token') || String(k).toLowerCase().includes('password')
                                ? '••••••••'
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
        </>
      )}

      <ProviderConfigModal
        modalState={{ ...modalState, providerType: 'llm' }}
        existingProviders={profiles}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        confirmVariant="error"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default LLMProvidersPage;
