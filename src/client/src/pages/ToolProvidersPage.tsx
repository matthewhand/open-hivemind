import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import {
  Wrench as ToolIcon,
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
import { apiService } from '../services/api';
import { getProviderSchema, getProviderSchemasByType } from '../provider-configs';
import useUrlParams from '../hooks/useUrlParams';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useSavedStamp } from '../contexts/SavedStampContext';
import Input from '../components/DaisyUI/Input';
import Select from '../components/DaisyUI/Select';

const ToolProvidersPage: React.FC = () => {
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

  const [formModal, setFormModal] = useState<{
    isOpen: boolean; isEdit: boolean; profile: any | null;
  }>({ isOpen: false, isEdit: false, profile: null });
  const [formData, setFormData] = useState<Record<string, any>>({ name: '', provider: '', config: {} });
  const [selectedProvider, setSelectedProvider] = useState('');

  const toolSchemas = useMemo(() => getProviderSchemasByType('tool'), []);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/api/config/tool-profiles');
      setProfiles((res as any).tool || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tool profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // Auto-refresh when config changes are broadcast via WebSocket
  const { configVersion, lastConfigChange } = useWebSocket();
  const configVersionRef = React.useRef(configVersion);
  useEffect(() => {
    if (configVersionRef.current === configVersion) return;
    configVersionRef.current = configVersion;
    if (lastConfigChange?.type && lastConfigChange.type !== 'tool-profiles') return;
    fetchProfiles();
  }, [configVersion, lastConfigChange, fetchProfiles]);

  const handleAddProfile = () => {
    const defaultProvider = toolSchemas.length > 0 ? toolSchemas[0].providerType : '';
    setSelectedProvider(defaultProvider);
    setFormData({ name: '', provider: defaultProvider, config: {} });
    setFormModal({ isOpen: true, isEdit: false, profile: null });
  };

  const handleEditProfile = (profile: any) => {
    setSelectedProvider(profile.provider);
    setFormData({ name: profile.name, provider: profile.provider, config: { ...profile.config } });
    setFormModal({ isOpen: true, isEdit: true, profile });
  };

  const handleDeleteProfile = async (key: string) => {
    setConfirmModal({
      isOpen: true, title: 'Delete Profile', message: `Delete profile "${key}"?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.delete(`/api/config/tool-profiles/${key}`);
          fetchProfiles();
        } catch (err: any) { errorToast('Delete Failed', `Failed to delete: ${err.message}`); }
      },
    });
  };

  const handleFormSubmit = async () => {
    try {
      const payload = {
        key: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: formData.name, provider: selectedProvider, config: formData.config,
      };
      if (formModal.isEdit && formModal.profile?.key) {
        const oldKey = formModal.profile.key;
        if (oldKey === payload.key) {
          await apiService.put(`/api/config/tool-profiles/${oldKey}`, payload);
        } else {
          const backup = profiles.find((p) => p.key === oldKey);
          await apiService.delete(`/api/config/tool-profiles/${oldKey}`);
          try { await apiService.post('/api/config/tool-profiles', payload); }
          catch (e: any) { if (backup) await apiService.post('/api/config/tool-profiles', backup).catch(() => {}); throw e; }
        }
      } else { await apiService.post('/api/config/tool-profiles', payload); }
      setFormModal({ isOpen: false, isEdit: false, profile: null });
      showStamp();
      fetchProfiles();
    } catch (err: any) { errorToast('Save Failed', `Failed to save profile: ${err.message}`); }
  };

  const getProviderIcon = (type: string) => {
    const schema = getProviderSchema(type);
    return schema?.icon || <ToolIcon className="w-5 h-5" />;
  };

  const toggleExpand = (key: string) => setExpandedProfile(expandedProfile === key ? null : key);

  const filteredProfiles = useMemo(() =>
    profiles.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.provider.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && (filterType === 'all' || p.provider === filterType);
    }), [profiles, searchQuery, filterType]);

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map(p => p.provider));
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'wrench', color: 'primary' as const },
    { id: 'types', title: 'Provider Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
  ];

  const currentSchema = useMemo(() => getProviderSchema(selectedProvider), [selectedProvider]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Providers"
        description="Configure tool providers for extended capabilities and integrations."
        icon={<ToolIcon className="w-6 h-6" />}
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
        searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search profiles..."
        filters={[{ key: 'type', value: filterType, onChange: setFilterType, options: [{ label: 'All Types', value: 'all' }, ...providerTypes], className: 'w-48' }]}
      />
      {loading ? (
        <SkeletonTableLayout rows={6} columns={4} />
      ) : profiles.length === 0 ? (
        <EmptyState icon={ToolIcon} title="No Profiles Created" description="Create a profile to configure tool providers for your bots." actionLabel="Create Profile" actionIcon={AddIcon} onAction={handleAddProfile} variant="noData" />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState icon={Search} title="No matching profiles" description="Try adjusting your search or filters." actionLabel="Clear Filters" onAction={() => { setSearchQuery(''); setFilterType('all'); }} variant="noResults" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
              <div>
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(profile.key)}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-info/10 text-info rounded-xl">
                      {typeof getProviderIcon(profile.provider) === 'string' ? <span className="text-xl">{getProviderIcon(profile.provider)}</span> : getProviderIcon(profile.provider)}
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
                    <Button size="sm" variant="ghost" onClick={() => handleEditProfile(profile)} aria-label={`Edit ${profile.name} profile`}><EditIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-error hover:bg-error/10" onClick={() => handleDeleteProfile(profile.key)} aria-label={`Delete ${profile.name} profile`}><DeleteIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)} aria-label={expandedProfile === profile.key ? 'Collapse details' : 'Expand details'}>
                      {expandedProfile === profile.key ? <CollapseIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {expandedProfile === profile.key && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-base-200/50 rounded-xl p-4 border border-base-200">
                      <h4 className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2"><ConfigIcon className="w-3 h-3" /> Configuration</h4>
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

      <Modal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, isEdit: false, profile: null })}
        title={formModal.isEdit ? 'Edit Tool Profile' : 'Create Tool Profile'}
        size="md"
        actions={[
          { label: 'Cancel', onClick: () => setFormModal({ isOpen: false, isEdit: false, profile: null }), variant: 'ghost' },
          { label: formModal.isEdit ? 'Update' : 'Create', onClick: handleFormSubmit, variant: 'primary', disabled: !formData.name.trim() },
        ]}
      >
            <div className="form-control w-full mb-3">
              <label className="label" htmlFor="tool-profile-name"><span className="label-text">Profile Name</span></label>
              <Input id="tool-profile-name" type="text" placeholder="My Tool Provider" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="form-control w-full mb-3">
              <label className="label" htmlFor="tool-profile-provider"><span className="label-text">Provider Type</span></label>
              <Select id="tool-profile-provider" className="select-bordered" value={selectedProvider} onChange={(e) => { setSelectedProvider(e.target.value); setFormData(prev => ({ ...prev, provider: e.target.value, config: {} })); }} disabled={formModal.isEdit}>
                {toolSchemas.map((schema) => (<option key={schema.providerType} value={schema.providerType}>{schema.displayName}</option>))}
              </Select>
            </div>
            {currentSchema?.fields?.map((field) => (
              <div key={field.name} className="form-control w-full mb-3">
                <label className="label" htmlFor={`tool-field-${field.name}`}><span className="label-text">{field.label}{field.required && <span className="text-error ml-1">*</span>}</span></label>
                {field.type === 'select' ? (
                  <Select id={`tool-field-${field.name}`} className="select-bordered" value={formData.config[field.name] ?? field.defaultValue ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, config: { ...prev.config, [field.name]: e.target.value } }))}>
                    {field.options?.map((opt) => (<option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>))}
                  </Select>
                ) : (
                  <Input id={`tool-field-${field.name}`} type={field.type === 'password' ? 'password' : 'text'} placeholder={field.placeholder || ''} value={formData.config[field.name] ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, config: { ...prev.config, [field.name]: e.target.value } }))} />
                )}
                {field.description && <label className="label"><span className="label-text-alt opacity-60">{field.description}</span></label>}
              </div>
            ))}
      </Modal>

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} confirmVariant="error" confirmText="Delete" cancelText="Cancel" />
    </div>
  );
};

export default ToolProvidersPage;
