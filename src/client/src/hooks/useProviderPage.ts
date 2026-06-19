import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import useUrlParams from './useUrlParams';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useSavedStamp } from '../contexts/SavedStampContext';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import { apiService } from '../services/api';

interface ConfirmModal {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface FormModal {
  isOpen: boolean;
  isEdit: boolean;
  profile: any | null;
}

export interface UseProviderPageConfig {
  /** Base API path, e.g. '/api/config/tool-profiles' */
  apiPath: string;
  /** Key inside the GET response object, e.g. 'tool' */
  entityKey: string;
  /** WebSocket lastConfigChange.type to watch, e.g. 'tool-profiles' */
  wsChangeType: string;
  /** localStorage key for the expanded-profile UI state */
  localStorageKey: string;
}

export interface UseProviderPageReturn {
  profiles: any[];
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  expandedProfile: string | null;
  confirmModal: ConfirmModal;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModal>>;
  formModal: FormModal;
  setFormModal: React.Dispatch<React.SetStateAction<FormModal>>;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  selectedProvider: string;
  setSelectedProvider: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filteredProfiles: any[];
  providerTypes: { label: string; value: string }[];
  fetchProfiles: () => Promise<void>;
  handleAddProfile: (defaultProvider?: string) => void;
  handleEditProfile: (profile: any) => void;
  handleDeleteProfile: (key: string) => void;
  handleFormSubmit: () => Promise<void>;
  toggleExpand: (key: string) => void;
}

/**
 * Shared state + CRUD logic for all provider-config pages (LLM, Memory, Message, Tool).
 * Each page passes its own apiPath/entityKey/wsChangeType and handles only its rendering.
 */
export function useProviderPage(config: UseProviderPageConfig): UseProviderPageReturn {
  const { apiPath, entityKey, wsChangeType, localStorageKey } = config;

  const errorToast = useErrorToast();
  const { showStamp } = useSavedStamp();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [expandedProfile, setExpandedProfile] = useLocalStorage<string | null>(localStorageKey, null);
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

  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({
    isOpen: false, title: '', message: '', onConfirm: () => {},
  });
  const [formModal, setFormModal] = useState<FormModal>({
    isOpen: false, isEdit: false, profile: null,
  });
  const [formData, setFormData] = useState<Record<string, any>>({ name: '', provider: '', config: {} });
  const [selectedProvider, setSelectedProvider] = useState('');

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get(apiPath);
      setProfiles((res as any)[entityKey] || []);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || `Failed to load ${entityKey} profiles`);
    } finally {
      setLoading(false);
    }
  }, [apiPath, entityKey]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const { configVersion, lastConfigChange } = useWebSocket();
  const configVersionRef = useRef(configVersion);
  useEffect(() => {
    if (configVersionRef.current === configVersion) return;
    configVersionRef.current = configVersion;
    if (lastConfigChange?.type && lastConfigChange.type !== wsChangeType) return;
    fetchProfiles();
  }, [configVersion, lastConfigChange, fetchProfiles, wsChangeType]);

  const handleAddProfile = useCallback((defaultProvider?: string) => {
    setSelectedProvider(defaultProvider ?? '');
    setFormData({ name: '', provider: defaultProvider ?? '', config: {} });
    setFormModal({ isOpen: true, isEdit: false, profile: null });
  }, []);

  const handleEditProfile = useCallback((profile: any) => {
    setSelectedProvider(profile.provider);
    setFormData({ name: profile.name, provider: profile.provider, config: { ...profile.config } });
    setFormModal({ isOpen: true, isEdit: true, profile });
  }, []);

  const handleDeleteProfile = useCallback((key: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Profile',
      message: `Delete profile "${key}"?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.delete(`${apiPath}/${key}`);
          fetchProfiles();
        } catch (err: unknown) {
          errorToast('Delete Failed', `Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });
  }, [apiPath, fetchProfiles, errorToast]);

  const handleFormSubmit = useCallback(async () => {
    try {
      const payload = {
        key: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: formData.name,
        provider: selectedProvider,
        config: formData.config,
      };
      if (formModal.isEdit && formModal.profile?.key) {
        const oldKey = formModal.profile.key;
        if (oldKey === payload.key) {
          await apiService.put(`${apiPath}/${oldKey}`, payload);
        } else {
          // Key rename: delete old, create new; roll back if create fails
          const backup = profiles.find(p => p.key === oldKey);
          await apiService.delete(`${apiPath}/${oldKey}`);
          try {
            await apiService.post(apiPath, payload);
          } catch (e: unknown) {
            if (backup) await apiService.post(apiPath, backup).catch(() => {});
            throw e;
          }
        }
      } else {
        await apiService.post(apiPath, payload);
      }
      setFormModal({ isOpen: false, isEdit: false, profile: null });
      showStamp();
      fetchProfiles();
    } catch (err: unknown) {
      errorToast('Save Failed', `Failed to save profile: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [apiPath, formData, selectedProvider, formModal, profiles, showStamp, fetchProfiles, errorToast]);

  const toggleExpand = useCallback(
    (key: string) => setExpandedProfile(expandedProfile === key ? null : key),
    [expandedProfile, setExpandedProfile],
  );

  const filteredProfiles = useMemo(
    () => profiles.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.provider.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && (filterType === 'all' || p.provider === filterType);
    }),
    [profiles, searchQuery, filterType],
  );

  const providerTypes = useMemo(
    () => Array.from(new Set(profiles.map(p => p.provider))).map(type => ({ label: type, value: type })),
    [profiles],
  );

  return {
    profiles, loading, error, setError,
    expandedProfile,
    confirmModal, setConfirmModal,
    formModal, setFormModal,
    formData, setFormData,
    selectedProvider, setSelectedProvider,
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filteredProfiles, providerTypes,
    fetchProfiles,
    handleAddProfile, handleEditProfile, handleDeleteProfile, handleFormSubmit,
    toggleExpand,
  };
}
