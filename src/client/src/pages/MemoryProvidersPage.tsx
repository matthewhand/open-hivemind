import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import SearchFilterBar from '../components/SearchFilterBar';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
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
  Activity as HealthIcon,
  Play as TestIcon,
  CheckCircle as PassIcon,
  AlertCircle as FailIcon,
  MinusCircle as SkipIcon,
  Clock as TimingIcon,
  Globe as UrlIcon,
} from 'lucide-react';
import { apiService } from '../services/api';
import { getProviderSchema, getProviderSchemasByType } from '../provider-configs';
import useUrlParams from '../hooks/useUrlParams';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useSavedStamp } from '../contexts/SavedStampContext';
import Input from '../components/DaisyUI/Input';
import Select from '../components/DaisyUI/Select';

/** Shape returned by GET /api/providers/memory */
interface ProviderHealth {
  name: string;
  id: string;
  label: string;
  status: 'ok' | 'error' | 'unknown';
  details?: Record<string, unknown>;
}

/** Shape returned by POST /api/providers/memory/:name/test */
interface TestStep {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  ms: number;
  detail?: unknown;
}
interface TestResult {
  provider: string;
  summary: { passed: number; failed: number; skipped: number; totalMs: number };
  steps: TestStep[];
}

const statusBadgeVariant = (status: string): 'success' | 'error' | 'warning' | 'neutral' => {
  switch (status) {
  case 'ok':
  case 'pass':
    return 'success';
  case 'error':
  case 'fail':
    return 'error';
  case 'skip':
    return 'warning';
  default:
    return 'neutral';
  }
};

const stepIcon = (status: string) => {
  switch (status) {
  case 'pass':
    return <PassIcon className="w-4 h-4 text-success" />;
  case 'fail':
    return <FailIcon className="w-4 h-4 text-error" />;
  case 'skip':
    return <SkipIcon className="w-4 h-4 text-warning" />;
  default:
    return null;
  }
};

const MemoryProvidersPage: React.FC = () => {
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

  // Health state: map from provider name -> ProviderHealth
  const [healthMap, setHealthMap] = useState<Record<string, ProviderHealth>>({});
  const [healthLoading, setHealthLoading] = useState(false);

  // Test state: map from profile key -> TestResult | 'loading'
  const [testResults, setTestResults] = useState<Record<string, TestResult | 'loading'>>({});

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

  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const res = await apiService.get('/api/providers/memory') as any;
      const map: Record<string, ProviderHealth> = {};
      for (const provider of res.providers || []) {
        map[provider.name] = provider;
      }
      setHealthMap(map);
    } catch (err: any) {
      errorToast('Health Check Failed', err.message || 'Could not fetch provider health');
    } finally {
      setHealthLoading(false);
    }
  }, [errorToast]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Auto-refresh when config changes are broadcast via WebSocket
  const { configVersion, lastConfigChange } = useWebSocket();
  const configVersionRef = React.useRef(configVersion);
  useEffect(() => {
    if (configVersionRef.current === configVersion) return;
    configVersionRef.current = configVersion;
    if (lastConfigChange?.type && lastConfigChange.type !== 'memory-profiles') return;
    fetchProfiles();
  }, [configVersion, lastConfigChange, fetchProfiles]);

  const handleTestProfile = useCallback(async (profileKey: string) => {
    setTestResults(prev => ({ ...prev, [profileKey]: 'loading' }));
    try {
      const res = await apiService.post(`/api/providers/memory/${profileKey}/test`, {}) as TestResult;
      setTestResults(prev => ({ ...prev, [profileKey]: res }));
    } catch (err: any) {
      errorToast('Test Failed', err.message || `Test for "${profileKey}" failed`);
      setTestResults(prev => {
        const next = { ...prev };
        delete next[profileKey];
        return next;
      });
    }
  }, [errorToast]);

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
      showStamp();
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

  const healthyCount = Object.values(healthMap).filter(h => h.status === 'ok').length;
  const unhealthyCount = Object.values(healthMap).filter(h => h.status === 'error').length;

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'database', color: 'primary' as const },
    { id: 'types', title: 'Provider Types', value: providerTypes.length, icon: 'cpu', color: 'secondary' as const },
    { id: 'healthy', title: 'Healthy', value: healthyCount, icon: 'check-circle', color: 'success' as const },
    { id: 'unhealthy', title: 'Unhealthy', value: unhealthyCount, icon: 'alert-circle', color: 'error' as const },
  ];

  const currentSchema = useMemo(() => getProviderSchema(selectedProvider), [selectedProvider]);

  const getProfileHealth = (profile: any): ProviderHealth | undefined => {
    // Match by profile key first, then by provider name
    return healthMap[profile.key] || healthMap[profile.provider];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Providers"
        description="Configure memory providers for persistent context and knowledge storage."
        icon={<MemoryIcon className="w-6 h-6" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={fetchHealth} disabled={healthLoading} aria-busy={healthLoading}>
              <HealthIcon className={`w-4 h-4 ${healthLoading ? 'animate-pulse' : ''}`} /> Health
            </Button>
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
        <EmptyState icon={MemoryIcon} title="No Profiles Created" description="Create a profile to configure memory storage for your bots." actionLabel="Create Profile" actionIcon={AddIcon} onAction={handleAddProfile} variant="noData" />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState icon={Search} title="No matching profiles" description="Try adjusting your search or filters." actionLabel="Clear Filters" onAction={() => { setSearchQuery(''); setFilterType('all'); }} variant="noResults" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => {
            const health = getProfileHealth(profile);
            const testResult = testResults[profile.key];
            const isTesting = testResult === 'loading';

            return (
              <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
                <div>
                  {/* Card header */}
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" size="small" style="outline">{profile.provider}</Badge>
                          {profile.config?.baseUrl && (
                            <span className="flex items-center gap-1 text-xs opacity-60">
                              <UrlIcon className="w-3 h-3" />
                              {profile.config.baseUrl}
                            </span>
                          )}
                          {health && (
                            <Badge variant={statusBadgeVariant(health.status)} size="small">
                              {health.status === 'ok' ? 'Healthy' : health.status === 'error' ? 'Unhealthy' : 'Unknown'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-info hover:bg-info/10"
                        onClick={() => handleTestProfile(profile.key)}
                        loading={isTesting}
                        aria-label={`Test ${profile.name} provider`}
                      >
                        <TestIcon className="w-4 h-4" />
                        <span className="ml-1 text-xs">Test</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEditProfile(profile)} aria-label={`Edit ${profile.name} profile`}><EditIcon className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-error hover:bg-error/10" onClick={() => handleDeleteProfile(profile.key)} aria-label={`Delete ${profile.name} profile`}><DeleteIcon className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)} aria-label={expandedProfile === profile.key ? 'Collapse details' : 'Expand details'}>
                        {expandedProfile === profile.key ? <CollapseIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Test results inline */}
                  {testResult && testResult !== 'loading' && (
                    <div className="px-4 pb-2">
                      <div className="bg-base-200/50 rounded-xl p-4 border border-base-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase opacity-50 flex items-center gap-2">
                            <TestIcon className="w-3 h-3" /> Test Results
                          </h4>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="success" size="small">{testResult.summary.passed} passed</Badge>
                            {testResult.summary.failed > 0 && <Badge variant="error" size="small">{testResult.summary.failed} failed</Badge>}
                            {testResult.summary.skipped > 0 && <Badge variant="warning" size="small">{testResult.summary.skipped} skipped</Badge>}
                            <span className="flex items-center gap-1 opacity-60">
                              <TimingIcon className="w-3 h-3" /> {testResult.summary.totalMs}ms
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {testResult.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-base-100 p-2 rounded border border-base-200/50">
                              {stepIcon(step.status)}
                              <span className="font-mono text-sm flex-1">{step.step}</span>
                              <Badge variant={statusBadgeVariant(step.status)} size="small">{step.status}</Badge>
                              <span className="text-xs opacity-50 tabular-nums w-16 text-right">{step.ms}ms</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded config details */}
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

                      {/* Health details when expanded */}
                      {health?.details && (
                        <div className="bg-base-200/50 rounded-xl p-4 border border-base-200 mt-3">
                          <h4 className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2"><HealthIcon className="w-3 h-3" /> Health Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(health.details).map(([k, v]) => (
                              <div key={k} className="bg-base-100 p-2 rounded border border-base-200/50 flex flex-col">
                                <span className="font-mono text-[10px] opacity-50 uppercase tracking-wider mb-1">{k}</span>
                                <span className="font-medium text-sm truncate" title={String(v)}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Profile Modal */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, isEdit: false, profile: null })}
        title={formModal.isEdit ? 'Edit Memory Profile' : 'Create Memory Profile'}
        size="md"
        actions={[
          { label: 'Cancel', onClick: () => setFormModal({ isOpen: false, isEdit: false, profile: null }), variant: 'ghost' },
          { label: formModal.isEdit ? 'Update' : 'Create', onClick: handleFormSubmit, variant: 'primary', disabled: !formData.name.trim() },
        ]}
      >
            <div className="form-control w-full mb-3">
              <label className="label" htmlFor="memory-profile-name"><span className="label-text">Profile Name</span></label>
              <Input id="memory-profile-name" type="text" placeholder="My Memory Provider" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="form-control w-full mb-3">
              <label className="label" htmlFor="memory-profile-provider"><span className="label-text">Provider Type</span></label>
              <Select id="memory-profile-provider" className="select-bordered" value={selectedProvider} onChange={(e) => { setSelectedProvider(e.target.value); setFormData(prev => ({ ...prev, provider: e.target.value, config: {} })); }} disabled={formModal.isEdit}>
                {memorySchemas.map((schema) => (<option key={schema.providerType} value={schema.providerType}>{schema.displayName}</option>))}
              </Select>
            </div>
            {currentSchema?.fields?.map((field) => (
              <div key={field.name} className="form-control w-full mb-3">
                <label className="label" htmlFor={`memory-field-${field.name}`}><span className="label-text">{field.label}{field.required && <span className="text-error ml-1">*</span>}</span></label>
                {field.type === 'select' ? (
                  <Select id={`memory-field-${field.name}`} className="select-bordered" value={formData.config[field.name] ?? field.defaultValue ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, config: { ...prev.config, [field.name]: e.target.value } }))}>
                    {field.options?.map((opt) => (<option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>))}
                  </Select>
                ) : (
                  <Input id={`memory-field-${field.name}`} type={field.type === 'password' ? 'password' : 'text'} placeholder={field.placeholder || ''} value={formData.config[field.name] ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, config: { ...prev.config, [field.name]: e.target.value } }))} />
                )}
                {field.description && <label className="label"><span className="label-text-alt opacity-60">{field.description}</span></label>}
              </div>
            ))}
      </Modal>

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} confirmVariant="error" confirmText="Delete" cancelText="Cancel" />
    </div>
  );
};

export default MemoryProvidersPage;
