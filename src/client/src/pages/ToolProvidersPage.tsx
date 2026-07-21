import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import TabbedProviderPage from '../components/TabbedProviderPage';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import ConfigKeyValueCard from '../components/DaisyUI/ConfigKeyValueCard';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import SearchFilterBar from '../components/SearchFilterBar';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import { MarketplaceGrid } from '../components/Marketplace';
import {
  Wrench as ToolIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
  Search,
  RefreshCw,
  Store as StoreIcon,
} from 'lucide-react';
import { getProviderSchema, getProviderSchemasByType } from '../provider-configs';
import Input from '../components/DaisyUI/Input';
import Select from '../components/DaisyUI/Select';
import { useProviderPage } from '../hooks/useProviderPage';

// Derive a simple connection-status badge from config presence. There is no
// live per-profile tool health endpoint, so "Configured" means the profile has
// at least one credential/endpoint field, mirroring MessageProvidersPage.
const TOOL_CREDENTIAL_KEYS = ['apiKey', 'token', 'accessToken', 'baseUrl', 'endpoint', 'url', 'host', 'serverUrl'];

const deriveToolStatus = (
  profile: any,
): { variant: 'success' | 'warning'; label: string; description: string } => {
  const config = (profile?.config || {}) as Record<string, unknown>;
  const configured = TOOL_CREDENTIAL_KEYS.some((key) => {
    const value = config[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
  return configured
    ? { variant: 'success', label: 'Configured', description: 'Credentials present — connection not yet verified' }
    : { variant: 'warning', label: 'Not Configured', description: 'Missing credentials — edit the profile to add details' };
};

const ToolProvidersPage: React.FC = () => {
  const {
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
  } = useProviderPage({
    apiPath: '/api/config/tool-profiles',
    entityKey: 'tool',
    wsChangeType: 'tool-profiles',
    localStorageKey: 'ui.toolProviders.expandedProfile',
  });

  const toolSchemas = useMemo(() => getProviderSchemasByType('tool'), []);
  const currentSchema = useMemo(() => getProviderSchema(selectedProvider), [selectedProvider]);

  const getProviderIcon = (type: string) => {
    const schema = getProviderSchema(type);
    return schema?.icon || <ToolIcon className="w-5 h-5" />;
  };

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'wrench', color: 'primary' as const },
    { id: 'types', title: 'Provider Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profiles';
  const handleTabChange = (tabId: string) => setSearchParams({ tab: tabId });

  const onAddProfile = () => {
    const defaultProvider = toolSchemas.length > 0 ? toolSchemas[0].providerType : '';
    handleAddProfile(defaultProvider);
  };

  const profilesContent = (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchProfiles} disabled={loading} aria-busy={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" onClick={onAddProfile}>
            <AddIcon className="w-4 h-4 mr-2" /> Create Profile
          </Button>
        </div>
      </div>
      <StatsCards stats={stats} isLoading={loading} />
      <SearchFilterBar
        searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search profiles..."
        filters={[{ key: 'type', value: filterType, onChange: setFilterType, options: [{ label: 'All Types', value: 'all' }, ...providerTypes], className: 'w-48' }]}
      />
      {loading ? (
        <SkeletonTableLayout rows={6} columns={4} />
      ) : profiles.length === 0 ? (
        <EmptyState icon={ToolIcon} title="No Profiles Created" description="Create a profile to configure tool providers for your bots." actionLabel="Create Profile" actionIcon={AddIcon} onAction={onAddProfile} variant="noData" />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState icon={Search} title="No matching profiles" description="Try adjusting your search or filters." actionLabel="Clear Filters" onAction={() => { setSearchQuery(''); setFilterType('all'); }} variant="noResults" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
              <div>
                <button type="button" className="p-4 w-full text-left flex items-center justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none" onClick={() => toggleExpand(profile.key)}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-info/10 text-info rounded-xl">
                      {typeof getProviderIcon(profile.provider) === 'string' ? <span className="text-xl">{getProviderIcon(profile.provider)}</span> : getProviderIcon(profile.provider)}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg flex items-center gap-2">
                        {profile.name}
                        <span className="text-xs font-normal opacity-80 px-2 py-0.5 bg-base-200 rounded-full font-mono">{profile.key}</span>
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="sm" className="badge-outline">{profile.provider}</Badge>
                        {(() => {
                          const status = deriveToolStatus(profile);
                          return (
                            <div className="tooltip tooltip-bottom" data-tip={status.description}>
                              <Badge variant={status.variant} size="sm">{status.label}</Badge>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditProfile(profile); }} aria-label={`Edit ${profile.name} profile`}><EditIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-error hover:bg-error/10" onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.key); }} aria-label={`Delete ${profile.name} profile`}><DeleteIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleExpand(profile.key); }} aria-label={expandedProfile === profile.key ? 'Collapse details' : 'Expand details'}>
                      {expandedProfile === profile.key ? <CollapseIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
                    </Button>
                  </div>
                </button>
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

  const toolTabs = useMemo(() => [
    { id: 'profiles', label: 'Profiles', icon: <ToolIcon className="w-4 h-4" />, content: profilesContent },
    { id: 'community', label: 'Community', icon: <StoreIcon className="w-4 h-4" />, content: <MarketplaceGrid filter="tool" /> },
  ], [profilesContent]);

  return (
    <TabbedProviderPage
      title="Tool Providers"
      description="Connect tool providers and external integrations"
      error={error}
      onClearError={() => setError(null)}
      tabs={toolTabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  );
};

export default ToolProvidersPage;
