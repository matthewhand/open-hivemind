/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useModal } from './useModal';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import { apiService } from '../services/api';
import type { ProfileItem } from '../types/bot';

export type { ProfileItem };

interface UseProviderManagementOptions {
  providerType: 'message' | 'llm';
  profilesPath: string;
  onBeforeSave?: (payload: any) => any;
}

export function useProviderManagement({ providerType, profilesPath, onBeforeSave }: UseProviderManagementOptions) {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const errorToast = useErrorToast();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get(profilesPath);
      const data = (res as any).profiles?.[providerType] || (res as any)[providerType] || [];
      setProfiles(data);
    } catch (err: any) {
      setError(err.message || `Failed to load ${providerType} profiles`);
    } finally {
      setLoading(false);
    }
  }, [profilesPath, providerType]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleAddProfile = useCallback(() => {
    openAddModal('global', providerType);
  }, [openAddModal, providerType]);

  const handleEditProfile = useCallback((profile: ProfileItem) => {
    openEditModal('global', providerType, {
      id: profile.key,
      name: profile.name,
      type: profile.provider,
      config: profile.config,
      ...(providerType === 'llm' ? { modelType: profile.modelType } : {}),
      enabled: true,
    } as any);
  }, [openEditModal, providerType]);

  const handleDeleteProfile = useCallback(async (key: string) => {
    try {
      await apiService.delete(`${profilesPath}/${key}`);
      fetchProfiles();
    } catch (err: any) {
      errorToast('Delete Failed', `Failed to delete: ${err.message}`);
    }
  }, [profilesPath, fetchProfiles, errorToast]);

  const handleProviderSubmit = useCallback(async (providerData: any) => {
    try {
      let payload: any = {
        key: providerData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: providerData.name,
        provider: providerData.type,
        config: providerData.config,
      };

      if (onBeforeSave) {
        payload = onBeforeSave({ ...payload, modelType: providerData.modelType });
      }

      if (modalState.isEdit && modalState.provider?.id) {
        const oldKey = modalState.provider.id;
        if (oldKey === payload.key) {
          await apiService.put(`${profilesPath}/${oldKey}`, payload);
        } else {
          const backup = profiles.find((p) => p.key === oldKey);
          await apiService.delete(`${profilesPath}/${oldKey}`);
          try {
            await apiService.post(profilesPath, payload);
          } catch (e: any) {
            if (backup) await apiService.post(profilesPath, backup).catch(() => {});
            throw e;
          }
        }
      } else {
        await apiService.post(profilesPath, payload);
      }

      closeModal();
      fetchProfiles();
    } catch (err: any) {
      errorToast('Save Failed', `Failed to save: ${err.message}`);
    }
  }, [modalState, profiles, profilesPath, closeModal, fetchProfiles, errorToast, onBeforeSave]);

  return {
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
  };
}

export default useProviderManagement;
