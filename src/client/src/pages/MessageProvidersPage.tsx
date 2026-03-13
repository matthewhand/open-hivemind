/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useModal } from '../hooks/useModal';
import Button from '../components/DaisyUI/Button';
import { Alert } from '../components/DaisyUI/Alert';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import {
  MessageSquare as MessageIcon,
  Plus as AddIcon,
  XCircle as XIcon,
  RefreshCw,
} from 'lucide-react';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../services/api';
import { getProviderSchema } from '../provider-configs';
import GenericProvidersList, { type ProfileItem } from '../components/ProviderManagement/GenericProvidersList';

const MessageProvidersPage: React.FC = () => {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleEditProfile = (profile: ProfileItem) => {
    openEditModal('global', 'message', {
      id: profile.key,
      name: profile.name,
      type: profile.provider,
      config: profile.config,
      enabled: true,
    } as any);
  };

  const handleDeleteProfile = async (key: string) => {
    if (!window.confirm(`Delete profile "${key}"?`)) return;
    try {
      await apiService.delete(`/api/config/message-profiles/${key}`);
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
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
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    }
  };

  const getProviderIcon = (type: string) => {
    const schema = getProviderSchema(type);
    return schema?.icon || <MessageIcon className="w-5 h-5" />;
  };

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
            <Button variant="ghost" onClick={fetchProfiles} disabled={loading}>
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

      <GenericProvidersList
        profiles={profiles}
        loading={loading}
        emptyStateIcon={MessageIcon}
        emptyStateTitle="No Profiles Created"
        emptyStateDescription="Create a profile to connect a messaging platform to your bots."
        onAddProfile={handleAddProfile}
        onEditProfile={handleEditProfile}
        onDeleteProfile={handleDeleteProfile}
        getProviderIcon={getProviderIcon}
      />

      <ProviderConfigModal
        modalState={{ ...modalState, providerType: 'message' }}
        existingProviders={profiles}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default MessageProvidersPage;
