/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import Button from '../DaisyUI/Button';
import { Alert } from '../DaisyUI/Alert';
import PageHeader from '../DaisyUI/PageHeader';
import StatsCards from '../DaisyUI/StatsCards';
import { ConfirmModal } from '../DaisyUI/Modal';
import { XCircle as XIcon, Plus as AddIcon, RefreshCw } from 'lucide-react';
import ProviderConfigModal from '../ProviderConfiguration/ProviderConfigModal';
import GenericProvidersList from './GenericProvidersList';
import type { ProfileItem } from '../../types/bot';
import type { ProviderModalState } from '../../types/bot';
import type { LucideIcon } from 'lucide-react';

interface StatItem {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
}

interface ProviderManagementPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  providerType: 'message' | 'llm';
  profiles: ProfileItem[];
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  fetchProfiles: () => void;
  handleAddProfile: () => void;
  handleEditProfile: (profile: ProfileItem) => void;
  handleDeleteProfile: (key: string) => void;
  handleProviderSubmit: (providerData: any) => void;
  modalState: ProviderModalState;
  closeModal: () => void;
  stats: StatItem[];
  getProviderIcon: (type: string) => React.ReactNode;
  renderExtraBadges?: (profile: ProfileItem) => React.ReactNode;
  children?: React.ReactNode;
}

const ProviderManagementPage: React.FC<ProviderManagementPageProps> = ({
  title,
  description,
  icon: Icon,
  providerType,
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
  stats,
  getProviderIcon,
  renderExtraBadges,
  children,
}) => {
  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const onDeleteProfile = (key: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Profile',
      message: `Delete profile "${key}"?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await handleDeleteProfile(key);
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        icon={<Icon className="w-6 h-6" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={fetchProfiles} disabled={loading} aria-busy={loading} aria-label="Refresh profiles">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="primary" onClick={handleAddProfile} aria-label="Create profile">
              <AddIcon className="w-4 h-4 mr-2" /> Create Profile
            </Button>
          </div>
        }
      />

      <StatsCards stats={stats} isLoading={loading} />

      {error && <Alert status="error" icon={<XIcon />} message={error} onClose={() => setError(null)} />}

      {children}

      <div className="divider">Custom Profiles</div>

      <GenericProvidersList
        profiles={profiles}
        loading={loading}
        emptyStateIcon={Icon}
        emptyStateTitle="No Profiles Created"
        emptyStateDescription={`Create a custom profile to get started with ${title.toLowerCase()}.`}
        onAddProfile={handleAddProfile}
        onEditProfile={handleEditProfile}
        onDeleteProfile={onDeleteProfile}
        getProviderIcon={getProviderIcon}
        renderExtraBadges={renderExtraBadges}
      />

      <ProviderConfigModal
        modalState={{ ...modalState, providerType }}
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

export default ProviderManagementPage;
