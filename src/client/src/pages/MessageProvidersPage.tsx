import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useModal } from '../hooks/useModal';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import ConfigKeyValueCard from '../components/DaisyUI/ConfigKeyValueCard';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import SearchFilterBar from '../components/SearchFilterBar';
import { ConfirmModal } from '../components/DaisyUI/Modal';
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
} from 'lucide-react';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../services/api';
import { getProviderSchema } from '../provider-configs';
import { useSavedStamp } from '../contexts/SavedStampContext';
import useUrlParams from '../hooks/useUrlParams';

const MessageProvidersPage: React.FC = () => {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const errorToast = useErrorToast();
  const { showStamp } = useSavedStamp();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
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

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/api/config/message-profiles');
      setProfiles((res as any).profiles?.message || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load message profiles');
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
        } catch (err: any) {
          errorToast('Delete Failed', `Failed to delete: ${err.message}`);
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
          } catch (createErr: any) {
            if (backup) await apiService.post('/api/config/message-profiles', backup).catch(() => {});
            throw createErr;
          }
        }
      } else {
        await apiService.post('/api/config/message-profiles', payload);
      }

      closeModal();
      showStamp();
      fetchProfiles();
    } catch (err: any) {
      errorToast('Save Failed', `Failed to save profile: ${err.message}`);
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

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'message', color: 'primary' as const },
    { id: 'types', title: 'Platform Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message Providers"
        description="Configure messaging platform connections for your bots."
        icon={<MessageIcon className="w-6 h-6" />}
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
                      <Badge variant="secondary" size="small" style="outline">{profile.provider}</Badge>
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
  );
};

export default MessageProvidersPage;
