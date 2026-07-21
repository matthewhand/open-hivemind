import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '../../hooks/useModal';
import TabbedProviderPage from '../../components/TabbedProviderPage';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';
import { MarketplaceGrid } from '../../components/Marketplace';
import LlmTestChat from '../../components/LlmTestChat';
import {
  Brain as BrainIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  MessageSquare as ChatIcon,
  Store as StoreIcon,
} from 'lucide-react';
import type { LLMProviderType } from '../../types/bot';
import { LLM_PROVIDER_CONFIGS } from '../../types/bot';
import ProviderConfigModal from '../../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useSavedStamp } from '../../contexts/SavedStampContext';
import { ProfilesTab } from './ProfilesTab';
import { SettingsTab } from './SettingsTab';
import { isChatCapable, isEmbeddingCapable } from './utils';

const LLMProvidersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profiles';

  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [expandedProfile, setExpandedProfile] = useLocalStorage<string | null>('ui.llmProviders.expandedProfile', null);
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
              await apiService.post('/api/config/llm-profiles', backup).catch(() => { });
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
            await saveGlobal({ defaultChatbotProfile: val }).catch(() => { });
          }}
          onDefaultEmbeddingChange={async (val) => {
            setDefaultEmbeddingProvider(val);
            await saveLlmConfig({ DEFAULT_EMBEDDING_PROVIDER: val }).catch(() => { });
          }}
          onWebuiIntelligenceChange={async (val) => {
            setWebuiIntelligenceProvider(val);
            await saveGlobal({ webuiIntelligenceProvider: val }).catch(() => { });
          }}
          onPerUseCaseChange={async (val) => {
            setPerUseCaseEnabled(val);
            await saveGlobal({ perUseCaseEnabled: val }).catch(() => { });
          }}
          onTaskProfileChange={async (key, val) => {
            setTaskProfiles((prev) => ({ ...prev, [key]: val }));
            if (key === 'LLM_TASK_WEBUI_PROVIDER') {
              await saveGlobal({ webuiIntelligenceProvider: val }).catch(() => { });
            } else {
              await saveLlmConfig({ [key]: val }).catch(() => { });
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
    <TabbedProviderPage
      title="LLM Providers"
      description="Manage language model provider profiles and settings"
      error={error}
      onClearError={() => setError(null)}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
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
    </TabbedProviderPage>
  );
};

export default LLMProvidersPage;
