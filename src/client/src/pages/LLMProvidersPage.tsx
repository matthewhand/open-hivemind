/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useModal } from '../hooks/useModal';
import { Card, Button, Badge, Alert, PageHeader, StatsCards, EmptyState, LoadingSpinner } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import {
  Brain as BrainIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  Shield as ShieldIcon,
  Cpu as CpuIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
  Search,
  RefreshCw,
} from 'lucide-react';
import type { LLMProviderType } from '../types/bot';
import { LLM_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../services/api';

const LLMProvidersPage: React.FC = () => {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<Record<string, { installed: boolean; package: string }>>({});
  const [webuiIntelligenceProvider, setWebuiIntelligenceProvider] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, statusRes, globalRes] = await Promise.all([
        apiService.get('/api/config/llm-profiles'),
        apiService.get('/api/config/llm-status'),
        apiService.get('/api/config/global'),
      ]);

      setProfiles((profilesRes as any).profiles?.llm || []);
      setDefaultStatus(statusRes);

      const globalSettings = (globalRes as any)._userSettings?.values || {};
      setWebuiIntelligenceProvider(globalSettings.webuiIntelligenceProvider || '');

      // Store library status deeply
      if ((statusRes as any).libraryStatus) {
        setLibraryStatus((statusRes as any).libraryStatus);
      }
    } catch (err: any) {
      console.error('Failed to fetch LLM profiles:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleAddProfile = () => {
    openAddModal('global', 'llm');
  };

  const handleEditProfile = (profile: any) => {
    openEditModal('global', 'llm', {
      id: profile.key,
      name: profile.name,
      type: profile.provider,
      config: profile.config,
      enabled: true,
    } as any);
  };

  const handleDeleteProfile = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete profile "${key}"?`)) return;

    try {
      await apiService.delete(`/api/config/llm-profiles/${key}`);
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to delete profile: ${err.message}`);
    }
  };

  const handleSaveGlobalSettings = async (providerKey: string) => {
    try {
      await apiService.put('/api/config/global', {
        webuiIntelligenceProvider: providerKey,
      });
      setWebuiIntelligenceProvider(providerKey);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  const handleProviderSubmit = async (providerData: any) => {
    try {
      const payload = {
        key: providerData.name.toLowerCase().replace(/\s+/g, '-'), // Generate key from name
        name: providerData.name,
        provider: providerData.type,
        config: providerData.config,
      };

      if (modalState.isEdit && modalState.provider?.id) {
        const oldKey = modalState.provider.id;
        const newKey = payload.key;

        if (oldKey === newKey) {
          await apiService.put(`/api/config/llm-profiles/${oldKey}`, payload);
        } else {
          const backupProfile = profiles?.find((p) => p.key === oldKey);
          await apiService.delete(`/api/config/llm-profiles/${oldKey}`);
          try {
            await apiService.post('/api/config/llm-profiles', payload);
          } catch (createError: any) {
            if (backupProfile) {
              try {
                await apiService.post('/api/config/llm-profiles', backupProfile);
              } catch (restoreError: any) {
                console.error('Failed to restore profile after failed rename:', restoreError);
              }
            }
            throw createError;
          }
        }
      } else {
        await apiService.post('/api/config/llm-profiles', payload);
      }

      closeModal();
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    }
  };

  const getProviderIcon = (type: string) => {
    const config = LLM_PROVIDER_CONFIGS[type as LLMProviderType];
    return config?.icon || <BrainIcon className="w-5 h-5" />;
  };

  const toggleExpand = (key: string) => {
    setExpandedProfile(expandedProfile === key ? null : key);
  };

  const renderLibraryCheck = (type: string) => {
    const status = libraryStatus[type];
    if (!status) return null;

    if (!status.installed) {
      return (
        <div className="tooltip tooltip-bottom" data-tip={`Missing required library: ${status.package}`}>
          <Badge variant="error" size="small" className="gap-1 cursor-help">
            <XIcon className="w-3 h-3" /> Lib Missing
          </Badge>
        </div>
      );
    }
    return null;
  };

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
      return profiles.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                p.provider.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesType = filterType === 'all' || p.provider === filterType;
          return matchesSearch && matchesType;
      });
  }, [profiles, searchQuery, filterType]);

  // Unique provider types for filter
  const providerTypes = useMemo(() => {
      const types = new Set(profiles.map(p => p.provider));
      return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  // Stats
  const stats = [
      { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'brain', color: 'primary' as const },
      { id: 'types', title: 'Provider Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
      { id: 'default', title: 'System Default', value: defaultStatus?.configured ? 'Active' : 'Missing', icon: defaultStatus?.configured ? 'check' : 'alert', color: defaultStatus?.configured ? 'success' as const : 'warning' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="LLM Providers"
        description="Configure reusable AI personalities and connection templates."
        icon={BrainIcon}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={fetchProfiles} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="primary" onClick={handleAddProfile}>
              <AddIcon className="w-4 h-4 mr-2" />
              Create Profile
            </Button>
          </div>
        }
      />

      <StatsCards stats={stats} isLoading={loading} />

      {error && (
        <Alert status="error" icon={<XIcon />} message={error} onClose={() => setError(null)} />
      )}

      {/* Grid for settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WebUI Intelligence Settings */}
          <Card className="bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ZapIcon className="w-5 h-5 text-warning" />
                WebUI Intelligence
              </h3>
              <p className="text-sm opacity-70 mb-4">
                Select an LLM profile to power AI assistance features within the WebUI (e.g. generating bot names).
              </p>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">AI Assistance Provider</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={webuiIntelligenceProvider}
                  onChange={(e) => handleSaveGlobalSettings(e.target.value)}
                  disabled={loading}
                >
                  <option value="">None (Disabled)</option>
                  {profiles.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Default / System Profile Check */}
          <Card className={`bg-base-100 shadow-sm border ${defaultStatus?.configured ? 'border-success/20' : 'border-warning/20'}`}>
             <div className="card-body p-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ConfigIcon className="w-5 h-5" />
                        System Default
                    </h3>
                    {defaultStatus?.configured ?
                        <Badge variant="success">Active</Badge> :
                        <Badge variant="warning">Not Configured</Badge>
                    }
                </div>
                <p className="text-sm opacity-70 mb-4">
                    Fallback configuration loaded from environment variables (`.env`). Used when no specific profile is assigned.
                </p>

                {defaultStatus?.defaultProviders?.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg mb-2">
                        <div className="flex items-center gap-3">
                            {getProviderIcon(p.type)}
                            <div>
                                <div className="font-bold text-sm">{p.name}</div>
                                <div className="text-xs opacity-50 uppercase">{p.type}</div>
                            </div>
                        </div>
                        <Badge variant="neutral" size="small">Read-Only</Badge>
                    </div>
                ))}

                {(!defaultStatus?.defaultProviders || defaultStatus.defaultProviders.length === 0) && (
                    <div className="alert alert-warning text-xs p-2">
                        <WarningIcon className="w-4 h-4" />
                        <span>No default provider in .env. Bots without a profile will fail.</span>
                    </div>
                )}
             </div>
          </Card>
      </div>

      <div className="divider">Custom Profiles</div>

      {/* Filter Bar */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search profiles..."
        filters={[
            {
                key: 'type',
                value: filterType,
                onChange: setFilterType,
                options: [{ label: 'All Types', value: 'all' }, ...providerTypes],
                className: "w-48"
            }
        ]}
      />

      {/* Profiles List */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
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
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
              <div className="card-body p-0">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(profile.key)}>
                  <div className="flex items-center gap-4">
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
                        {renderLibraryCheck(profile.provider)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => handleEditProfile(profile)}>
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-error hover:bg-error/10" onClick={() => handleDeleteProfile(profile.key)}>
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)}>
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
      )}

      {/* Provider Configuration Modal */}
      <ProviderConfigModal
        modalState={{
          ...modalState,
          providerType: 'llm',
        }}
        existingProviders={profiles}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default LLMProvidersPage;
