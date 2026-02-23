/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useModal } from '../hooks/useModal';
import { Card, Button, Badge, Alert } from '../components/DaisyUI';
import {
  Brain as BrainIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  Shield as ShieldIcon,
  Cpu as CpuIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../components/DaisyUI';
import type { LLMProviderType } from '../types/bot';
import { LLM_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../services/api';

const LLMProvidersPage: React.FC = () => {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<Record<string, { installed: boolean; package: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'Providers', href: '/admin/providers' },
    { label: 'LLM Providers', href: '/admin/providers/llm', isActive: true },
  ];

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, statusRes] = await Promise.all([
        apiService.get('/api/config/llm-profiles'),
        apiService.get('/api/config/llm-status'),
      ]);

      setProfiles((profilesRes as any).profiles?.llm || []);
      setDefaultStatus(statusRes);

      // Store library status deeply
      if ((statusRes as any).libraryStatus) {
        setLibraryStatus((statusRes as any).libraryStatus);
      }
    } catch (err: any) {
      console.error('Failed to fetch LLM profiles:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleAddProfile = () => {
    openAddModal('global', 'llm');
  };

  const handleEditProfile = (profile: any) => {
    openEditModal('global', 'llm', {
      id: profile.key,
      name: profile.name,
      type: profile.provider,
      config: profile.config,
      enabled: true,
    } as any);
  };

  const handleDeleteProfile = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete profile "${key}"?`)) return;

    try {
      await apiService.delete(`/api/config/llm-profiles/${key}`);
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to delete profile: ${err.message}`);
    }
  };

  const handleProviderSubmit = async (providerData: any) => {
    try {
      const payload = {
        key: providerData.name.toLowerCase().replace(/\s+/g, '-'), // Generate key from name
        name: providerData.name,
        provider: providerData.type,
        config: providerData.config,
      };

      if (modalState.isEdit) {
        // Updating isn't directly supported by PUT /llm-profiles (it replaces ALL). 
        // Real implementation should probably have a PATCH /llm-profiles/:key or we manipulate array locally and PUT all.
        // For now, let's assume we re-fetch after simplified atomic operations if they existed, 
        // BUT the backend only has bulk PUT or single POST.

        // Strategy: We can't easily "edit" key if it changes.
        // Let's rely on deleting old and creating new if key changed, or just updating list.
        // Actually, backend has DELETE /:key and POST / (create). 
        // To update, we might need to DELETE then POST if no specific update endpoint exists.
        // Wait, review backend... found DELETE /:key and POST /. No specific single Item PUT.
        // So we will delete old key and create new 

        if (modalState.provider?.id) {
          await apiService.delete(`/api/config/llm-profiles/${modalState.provider.id}`);
        }
        await apiService.post('/api/config/llm-profiles', payload);

      } else {
        await apiService.post('/api/config/llm-profiles', payload);
      }

      closeModal();
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    }
  };

  const getProviderIcon = (type: string) => {
    const config = LLM_PROVIDER_CONFIGS[type as LLMProviderType];
    return config?.icon || <BrainIcon className="w-5 h-5" />;
  };

  const toggleExpand = (key: string) => {
    setExpandedProfile(expandedProfile === key ? null : key);
  };

  // Render library warning if missing
  const renderLibraryCheck = (type: string) => {
    const status = libraryStatus[type];
    if (!status) return null; // Unknown provider or no check needed

    if (!status.installed) {
      return (
        <div className="tooltip tooltip-bottom" data-tip={`Missing required library: ${status.package}`}>
          <Badge variant="error" size="small" className="gap-1 cursor-help">
            <XIcon className="w-3 h-3" /> Lib Missing
          </Badge>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <BrainIcon className="w-8 h-8 text-primary" />
            LLM Providers
          </h1>
          <p className="text-base-content/70">
            Configure reusable AI personalities and connection templates.
          </p>
        </div>
        <Button variant="primary" onClick={handleAddProfile}>
          <AddIcon className="w-4 h-4 mr-2" />
          Create Profile
        </Button>
      </div>

      {loading ? (
        <div className="skeleton h-64 w-full"></div>
      ) : error ? (
        <Alert status="error" icon={<XIcon />} message={error} />
      ) : (
        <div className="space-y-8">

          {/* Default / System Profile Check */}
          <div className="collapse collapse-arrow bg-base-200 border border-base-300">
            <input type="checkbox" defaultChecked />
            <div className="collapse-title text-xl font-medium flex items-center gap-3">
              <ConfigIcon className="w-5 h-5" />
              System Default Configuration
              {defaultStatus?.configured && <Badge variant="success" size="small">Active</Badge>}
              {!defaultStatus?.configured && <Badge variant="warning" size="small">Not Configured</Badge>}
            </div>
            <div className="collapse-content">
              <p className="text-sm opacity-70 mb-4">
                This configuration is loaded from your environment variables (`.env`) and serves as the fallback
                when no specific profile is assigned.
              </p>

              {defaultStatus?.defaultProviders?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg mb-2">
                  <div className="flex items-center gap-3">
                    {getProviderIcon(p.type)}
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-xs opacity-50 uppercase">{p.type}</div>
                    </div>
                  </div>
                  <Badge variant="neutral">Read-Only (.env)</Badge>
                </div>
              ))}

              {(!defaultStatus?.defaultProviders || defaultStatus.defaultProviders.length === 0) && (
                <div className="alert alert-warning text-sm">
                  <WarningIcon className="w-4 h-4" />
                  <span>No default LLM provider found in environment variables. Bots without a profile will fail to reply.</span>
                </div>
              )}
            </div>
          </div>

          <div className="divider">Custom Profiles</div>

          {/* Profiles List */}
          {profiles.length === 0 ? (
            <div className="text-center py-10 opacity-50 border-2 border-dashed border-base-300 rounded-xl">
              <BrainIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="font-bold text-lg">No Profiles Created</h3>
              <p>Create a custom profile to override system defaults for specific bots.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">

                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(profile.key)}>
                        <div className="p-3 bg-base-200 rounded-full">
                          {getProviderIcon(profile.provider)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{profile.name} <span className="text-xs font-normal opacity-50 ml-2">({profile.key})</span></h3>
                          <div className="flex items-center gap-2">
                            <Badge style="outline" size="small">{profile.provider}</Badge>
                            {renderLibraryCheck(profile.provider)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditProfile(profile)}>
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="btn-error text-white" onClick={() => handleDeleteProfile(profile.key)}>
                          <DeleteIcon className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)}>
                          {expandedProfile === profile.key ? <ExpandIcon className="w-4 h-4" /> : <CollapseIcon className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {expandedProfile === profile.key && (
                      <div className="mt-4 pt-4 border-t border-base-200">
                        <h4 className="text-xs font-bold uppercase opacity-50 mb-2">Configuration</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                          {Object.entries(profile.config || {}).map(([k, v]) => (
                            <div key={k} className="bg-base-200/50 p-2 rounded text-sm">
                              <span className="font-mono text-xs opacity-60 block">{k}</span>
                              <span className="font-medium truncate block" title={String(v)}>
                                {String(k).toLowerCase().includes('key') ? '••••••••' : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Provider Configuration Modal */}
      <ProviderConfigModal
        modalState={{
          ...modalState,
          providerType: 'llm',
        }}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default LLMProvidersPage;