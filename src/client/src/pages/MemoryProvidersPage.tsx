/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useMemo } from 'react';
import { Database as DatabaseIcon } from 'lucide-react';
import { useProviderManagement } from '../hooks/useProviderManagement';
import ProviderManagementPage from '../components/ProviderManagement/ProviderManagementPage';

const MemoryProvidersPage: React.FC = () => {
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
    providerType: 'memory',
    profilesPath: '/api/config/memory-profiles',
  });

  const getProviderIcon = (_type: string) => {
    return <DatabaseIcon className="w-5 h-5" />;
  };

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map(p => p.provider));
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: <DatabaseIcon className="w-8 h-8" />, color: 'primary' as const },
    { id: 'types', title: 'Backend Types', value: providerTypes.length, icon: <DatabaseIcon className="w-8 h-8" />, color: 'secondary' as const },
  ];

  return (
    <ProviderManagementPage
      title="Memory Providers"
      description="Configure memory backends for persistent bot context and knowledge."
      icon={DatabaseIcon}
      providerType="memory"
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

export default MemoryProvidersPage;
