/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import SearchFilterBar from '../components/SearchFilterBar';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import {
  Database as MemoryIcon,
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

const MemoryProvidersPage: React.FC = () => {
  const errorToast = useErrorToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [formModal, setFormModal] = useState<{
    isOpen: boolean; isEdit: boolean; profile: any | null;
  }>({ isOpen: false, isEdit: false, profile: null });
  const [formData, setFormData] = useState<Record<string, any>>({ name: '', provider: '', config: {} });
  const [selectedProvider, setSelectedProvider] = useState('');

  const memorySchemas = useMemo(() => getProviderSchemasByType('memory'), []);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/api/config/memory-profiles');
      setProfiles((res as any).memory || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load memory profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleAddProfile = () => {
    const defaultProvider = memorySchemas.length > 0 ? memorySchemas[0].providerType : '';
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
          await apiService.delete(`/api/config/memory-profiles/${key}`);
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
          await apiService.put(`/api/config/memory-profiles/${oldKey}`, payload);
        } else {
          const backup = profiles.find((p) => p.key === oldKey);
          await apiService.delete(`/api/config/memory-profiles/${oldKey}`);
          try { await apiService.post('/api/config/memory-profiles', payload); }
          catch (e: any) { if (backup) await apiService.post('/api/config/memory-profiles', backup).catch(() => {}); throw e; }
        }
      } else { await apiService.post('/api/config/memory-profiles', payload); }
      setFormModal({ isOpen: false, isEdit: false, profile: null });
      fetchProfiles();
    } catch (err: any) { errorToast('Save Failed', `Failed to save profile: ${err.message}`); }
  };

  const getProviderIcon = (type: string) => {
    const schema = getProviderSchema(type);
    return schema?.icon || <MemoryIcon className="w-5 h-5" />;
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
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'database', color: 'primary' as const },
    { id: 'types', title: 'Provider Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
  ];

  const currentSchema = useMemo(() => getProviderSchema(selectedProvider), [selectedProvider]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Providers"
        description="Configure memory providers for persistent context and knowledge storage."
        icon={<MemoryIcon className="w-6 h-6" />}
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
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : profiles.length === 0 ? (
        <EmptyState icon={MemoryIcon} title="No Profiles Created" description="Create a profile to configure memory storage for your bots." actionLabel="Create Profile" actionIcon={AddIcon} onAction={handleAddProfile} variant="noData" />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState icon={Search} title="No matching profiles" description="Try adjusting your search or filters." actionLabel="Clear Filters" onAction={() => { setSearchQuery(''); setFilterType('all'); }} variant="noResults" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
              <div className="card-body p-0">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(profile.key)}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl">
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
                    <Button size="sm" variant="ghost" onClick={() => handleEditProfile(profile)}><EditIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-error hover:bg-error/10" onClick={() => handleDeleteProfile(profile.key)}><DeleteIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)}>
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
                          <div key={k} className="bg-base-100 p-2 rounded border border-base-200/50 flex flex-col">
                            <span className="font-mono text-[10px] opacity-50 uppercase tracking-wider mb-1">{k}</span>
                            <span className="font-medium text-sm truncate" title={String(v)}>
                              {String(k).toLowerCase().includes('key') || String(k).toLowerCase().includes('token') || String(k).toLowerCase().includes('secret') ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : String(v)}
                            </span>
                          </div>
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

      {formModal.isOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">{formModal.isEdit ? 'Edit Memory Profile' : 'Create Memory Profile'}</h3>
            <div className="form-control w-full mb-3">
              <label className="label" htmlFor="memory-profile-name"><span className="label-text">Profile Name</span></label>
              <input id="memory-profile-name" type="text" className="input input-bordered w-full" placeholder="My Memory Provider" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="form-control w-full mb-3">
              <label className="label" htmlFor="memory-profile-provider"><span className="label-text">Provider Type</span></label>
              <select id="memory-profile-provider" className="select select-bordered w-full" value={selectedProvider} onChange={(e) => { setSelectedProvider(e.target.value); setFormData(prev => ({ ...prev, provider: e.target.value, config: {} })); }} disabled={formModal.isEdit}>
                {memorySchemas.map((schema) => (<option key={schema.providerType} value={schema.providerType}>{schema.displayName}</option>))}
              </select>
            </div>
            {currentSchema?.fields?.map((field) => (
              <div key={field.name} className="form-control w-full mb-3">
                <label className="label" htmlFor={`memory-field-${field.name}`}><span className="label-text">{field.label}{field.required && <span className="text-error ml-1">*</span>}</span></label>
                {field.type === 'select' ? (
                  <select id={`memory-field-${field.name}`} className="select select-bordered w-full" value={formData.config[field.name] ?? field.defaultValue ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, config: { ...prev.config, [field.name]: e.target.value } }))}>
                    {field.options?.map((opt) => (<option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>))}
                  </select>
                ) : (
                  <input id={`memory-field-${field.name}`} type={field.type === 'password' ? 'password' : 'text'} className="input input-bordered w-full" placeholder={field.placeholder || ''} value={formData.config[field.name] ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, config: { ...prev.config, [field.name]: e.target.value } }))} />
                )}
                {field.description && <label className="label"><span className="label-text-alt opacity-60">{field.description}</span></label>}
              </div>
            ))}
            <div className="modal-action">
              <Button variant="ghost" onClick={() => setFormModal({ isOpen: false, isEdit: false, profile: null })}>Cancel</Button>
              <Button variant="primary" onClick={handleFormSubmit} disabled={!formData.name.trim()}>{formModal.isEdit ? 'Update' : 'Create'}</Button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setFormModal({ isOpen: false, isEdit: false, profile: null })}>close</button></form>
        </dialog>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} confirmVariant="error" confirmText="Delete" cancelText="Cancel" />
    </div>
  );
};

export default MemoryProvidersPage;
