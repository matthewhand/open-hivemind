import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useModal } from '../hooks/useModal';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import ConfigKeyValueCard from '../components/DaisyUI/ConfigKeyValueCard';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import SearchFilterBar from '../components/SearchFilterBar';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import Tabs from '../components/DaisyUI/Tabs';
import Toggle from '../components/DaisyUI/Toggle';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import {
  MessageSquare as MessageIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  XCircle as XIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
  Search,
  RefreshCw,
  Store as StoreIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  ExternalLink as ExternalLinkIcon,
  AlertCircle as AlertIcon,
} from 'lucide-react';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import SettingsMessaging from '../components/Settings/SettingsMessaging';
import { apiService } from '../services/api';
import { getProviderSchema } from '../provider-configs';
import { useSavedStamp } from '../contexts/SavedStampContext';
import useUrlParams from '../hooks/useUrlParams';

// ---------------------------------------------------------------------------
// Community Tab – inline marketplace filtered to message type
// ---------------------------------------------------------------------------

interface MarketplacePackage {
  name: string;
  displayName: string;
  description: string;
  type: 'llm' | 'message' | 'memory' | 'tool';
  version: string;
  status: 'built-in' | 'installed' | 'available';
  repoUrl?: string;
  feedbackUrl?: string;
  rating?: number;
}

const CommunityTab: React.FC = () => {
  const [packages, setPackages] = useState<MarketplacePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      setError(null);
      try {
        const data: any = await apiService.get('/api/marketplace/packages');
        const all: MarketplacePackage[] = data?.data || data || [];
        setPackages(all.filter((p) => p.type === 'message'));
      } catch (err: unknown) {
        setError(
          (err instanceof Error ? err.message : String(err)) ||
          'Failed to load community packages',
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg text-primary" aria-hidden="true"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error mb-4">
        <AlertIcon className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <EmptyState
        icon={StoreIcon}
        title="No Community Message Packages"
        description="There are no community message provider packages available yet."
        variant="noData"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {packages.map((pkg) => {
        const statusLabel =
          pkg.status === 'built-in'
            ? 'Built-in'
            : pkg.status === 'installed'
              ? 'Installed'
              : 'Available';
        const statusColor =
          pkg.status === 'built-in'
            ? 'neutral'
            : pkg.status === 'installed'
              ? 'success'
              : ('info' as const);

        return (
          <Card key={pkg.name} className="bg-base-200 hover:bg-base-300 transition-colors">
            <Card.Body className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{pkg.displayName}</h3>
                    <p className="text-xs text-base-content/50 font-mono">{pkg.name}</p>
                  </div>
                </div>
                <Badge variant={statusColor} size="sm">
                  {statusLabel}
                </Badge>
              </div>

              <p className="text-sm text-base-content/70 mb-3 line-clamp-2">{pkg.description}</p>

              <div className="flex items-center justify-between text-xs text-base-content/50 mb-3">
                <span>v{pkg.version}</span>
                <span className="uppercase badge badge-sm badge-outline">message</span>
              </div>

              {/* Rating & Feedback */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      className={`w-4 h-4 ${(pkg.rating ?? 0) >= star
                          ? 'fill-warning text-warning'
                          : 'text-base-content/30'
                        }`}
                    />
                  ))}
                </div>
                {(pkg.feedbackUrl || pkg.repoUrl) && (
                  <a
                    href={pkg.feedbackUrl || `${pkg.repoUrl}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-xs flex items-center gap-1"
                  >
                    Feedback <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex gap-2">
                {pkg.status === 'available' && (
                  <Button variant="primary" size="sm" className="flex-1">
                    <DownloadIcon className="w-4 h-4 mr-1" />
                    Install
                  </Button>
                )}
                {pkg.status === 'built-in' && (
                  <span className="text-xs text-base-content/50 italic w-full text-center">
                    Included with open-hivemind
                  </span>
                )}
                {pkg.status === 'installed' && (
                  <span className="text-xs text-success w-full text-center">Installed</span>
                )}
              </div>
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Settings Tab – wraps SettingsMessaging with advanced toggle
// ---------------------------------------------------------------------------

const SettingsTab: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/70">
          Configure messaging behavior and platform settings.
        </p>
        <Toggle
          label="Advanced"
          checked={showAdvanced}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowAdvanced(e.target.checked)}
          color="primary"
          size="sm"
        />
      </div>
      <div className={showAdvanced ? '' : '[&_.advanced-settings]:hidden'}>
        <SettingsMessaging />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Profiles Tab – existing content extracted
// ---------------------------------------------------------------------------

interface ProfilesTabProps {
  profiles: any[];
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  fetchProfiles: () => void;
  handleAddProfile: () => void;
  handleEditProfile: (profile: any) => void;
  handleDeleteProfile: (key: string) => void;
  expandedProfile: string | null;
  toggleExpand: (key: string) => void;
  filteredProfiles: any[];
  providerTypes: { label: string; value: string }[];
  getProviderIcon: (type: string) => React.ReactNode;
}

const ProfilesTab: React.FC<ProfilesTabProps> = ({
  profiles,
  loading,
  error,
  setError,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  fetchProfiles,
  handleAddProfile,
  handleEditProfile,
  handleDeleteProfile,
  expandedProfile,
  toggleExpand,
  filteredProfiles,
  providerTypes,
  getProviderIcon,
}) => {
  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'message', color: 'primary' as const },
    { id: 'types', title: 'Platform Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProfiles} disabled={loading} aria-busy={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" onClick={handleAddProfile}>
            <AddIcon className="w-4 h-4 mr-2" /> Create Profile
          </Button>
        </div>
      </div>

      <StatsCards stats={stats} isLoading={loading} />

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
          icon={MessageIcon}
          title="No Profiles Created"
          description="Create a profile to connect a messaging platform to your bots."
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
              <div>
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
                      <Badge variant="secondary" size="sm" style="outline">{profile.provider}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => handleEditProfile(profile)} aria-label={`Edit ${profile.name} profile`}>
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-error hover:bg-error/10" onClick={() => handleDeleteProfile(profile.key)} aria-label={`Delete ${profile.name} profile`}>
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
                          <ConfigKeyValueCard key={k} configKey={k} value={v} />
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
// Main Page Component
// ---------------------------------------------------------------------------

const TAB_IDS = ['profiles', 'settings', 'community'] as const;
type TabId = (typeof TAB_IDS)[number];

const MessageProvidersPage: React.FC = () => {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const errorToast = useErrorToast();
  const { showStamp } = useSavedStamp();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    tab: { type: 'string', default: 'profiles' },
    search: { type: 'string', default: '', debounce: 300 },
    type: { type: 'string', default: 'all' },
  });

  const activeTab = TAB_IDS.includes(urlParams.tab as TabId) ? (urlParams.tab as TabId) : 'profiles';
  const setActiveTab = (id: string) => setUrlParam('tab', id);
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const filterType = urlParams.type;
  const setFilterType = (v: string) => setUrlParam('type', v);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/api/config/message-profiles');
      setProfiles((res as any).message || (res as any).profiles?.message || []);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to load message profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleAddProfile = () => openAddModal('global', 'message');

  const handleEditProfile = (profile: any) => {
    openEditModal('global', 'message', {
      id: profile.key,
      name: profile.name,
      type: profile.provider,
      config: profile.config,
      enabled: true,
    } as any);
  };

  const handleDeleteProfile = async (key: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Profile',
      message: `Delete profile "${key}"?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.delete(`/api/config/message-profiles/${key}`);
          fetchProfiles();
        } catch (err: unknown) {
          errorToast('Delete Failed', `Failed to delete: ${(err instanceof Error ? err.message : String(err))}`);
        }
      },
    });
  };

  const handleProviderSubmit = async (providerData: any) => {
    try {
      const payload = {
        key: providerData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: providerData.name,
        provider: providerData.type,
        config: providerData.config,
      };

      if (modalState.isEdit && modalState.provider?.id) {
        const oldKey = modalState.provider.id;
        const newKey = payload.key;
        if (oldKey === newKey) {
          await apiService.put(`/api/config/message-profiles/${oldKey}`, payload);
        } else {
          const backup = profiles.find((p) => p.key === oldKey);
          await apiService.delete(`/api/config/message-profiles/${oldKey}`);
          try {
            await apiService.post('/api/config/message-profiles', payload);
          } catch (createErr: unknown) {
            if (backup) await apiService.post('/api/config/message-profiles', backup).catch(() => { });
            throw createErr;
          }
        }
      } else {
        await apiService.post('/api/config/message-profiles', payload);
      }

      closeModal();
      showStamp();
      fetchProfiles();
    } catch (err: unknown) {
      errorToast('Save Failed', `Failed to save profile: ${(err instanceof Error ? err.message : String(err))}`);
    }
  };

  const getProviderIcon = (type: string) => {
    const schema = getProviderSchema(type);
    return schema?.icon || <MessageIcon className="w-5 h-5" />;
  };

  const toggleExpand = (key: string) => setExpandedProfile(expandedProfile === key ? null : key);

  const filteredProfiles = useMemo(() =>
    profiles.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || p.provider === filterType;
      return matchesSearch && matchesType;
    }), [profiles, searchQuery, filterType]);

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map(p => p.provider));
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  const tabs = [
    {
      id: 'profiles',
      label: 'Profiles',
      icon: <MessageIcon className="w-4 h-4" />,
      badge: profiles.length || undefined,
      content: (
        <ProfilesTab
          profiles={profiles}
          loading={loading}
          error={error}
          setError={setError}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          fetchProfiles={fetchProfiles}
          handleAddProfile={handleAddProfile}
          handleEditProfile={handleEditProfile}
          handleDeleteProfile={handleDeleteProfile}
          expandedProfile={expandedProfile}
          toggleExpand={toggleExpand}
          filteredProfiles={filteredProfiles}
          providerTypes={providerTypes}
          getProviderIcon={getProviderIcon}
        />
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <ConfigIcon className="w-4 h-4" />,
      content: <SettingsTab />,
    },
    {
      id: 'community',
      label: 'Community',
      icon: <StoreIcon className="w-4 h-4" />,
      content: <CommunityTab />,
    },
  ];

  return (
    <div>
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold">Message Providers</h1>
        <p className="text-base-content/60 text-sm mt-1">Manage messaging platform connections and profiles</p>
      </div>
      <div className="px-6 pb-6">
        {error && (
          <div className="mb-6">
            <Alert status="error" icon={<XIcon />} message={error} onClose={() => setError(null)} />
          </div>
        )}
        <Tabs
          tabs={tabs}
          variant="lifted"
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <ProviderConfigModal
          modalState={{ ...modalState, providerType: 'message' }}
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
    </div>
  );
};

export default MessageProvidersPage;
