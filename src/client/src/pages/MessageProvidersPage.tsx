/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useMemo } from 'react';
import { MessageSquare as MessageIcon } from 'lucide-react';
import { getProviderSchema } from '../provider-configs';
import { useProviderManagement } from '../hooks/useProviderManagement';
import ProviderManagementPage from '../components/ProviderManagement/ProviderManagementPage';

const MessageProvidersPage: React.FC = () => {
  const {
    profiles,
    loading,
    error,
    setError,
    fetchProfiles,
    handleAddProfile,
    handleEditProfile,
    handleDeleteProfile,
    handleProviderSubmit,
    modalState,
    closeModal,
  } = useProviderManagement({
    providerType: 'message',
    profilesPath: '/api/config/message-profiles',
  });

  const getProviderIcon = (type: string) => {
    const schema = getProviderSchema(type);
    return schema?.icon || <MessageIcon className="w-5 h-5" />;
  };

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map(p => p.provider));
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: <MessageIcon className="w-8 h-8" />, color: 'primary' as const },
    { id: 'types', title: 'Platform Types', value: providerTypes.length, icon: <MessageIcon className="w-8 h-8" />, color: 'secondary' as const },
  ];

  return (
    <ProviderManagementPage
      title="Message Providers"
      description="Configure messaging platform connections for your bots."
      icon={MessageIcon}
      providerType="message"
      profiles={profiles}
      loading={loading}
      error={error}
      setError={setError}
      fetchProfiles={fetchProfiles}
      handleAddProfile={handleAddProfile}
      handleEditProfile={handleEditProfile}
      handleDeleteProfile={handleDeleteProfile}
      handleProviderSubmit={handleProviderSubmit}
      modalState={modalState}
      closeModal={closeModal}
      stats={stats}
      getProviderIcon={getProviderIcon}
    />
  );
};

export default MessageProvidersPage;
