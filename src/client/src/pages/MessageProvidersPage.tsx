/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useModal } from '../hooks/useModal';
import { Card, Button, Badge, Alert } from '../components/DaisyUI';
import {
  MessageCircle as MessageIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../components/DaisyUI';
import type { MessageProviderType } from '../types/bot';
import { MESSAGE_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { apiService } from '../services/api';

const MessageProvidersPage: React.FC = () => {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'Providers', href: '/admin/providers' },
    { label: 'Message Providers', href: '/admin/providers/message', isActive: true },
  ];

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, statusRes] = await Promise.all([
        apiService.get('/api/config/message-profiles'),
        apiService.get('/api/config/message-status'),
      ]);

      setProfiles((profilesRes as any).profiles?.message || []);
      setDefaultStatus(statusRes);
    } catch (err: any) {
      console.error('Failed to fetch message profiles:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleAddProfile = () => {
    openAddModal('global', 'message');
  };

  const handleEditProfile = (profile: any) => {
    openEditModal('global', 'message', {
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
      await apiService.delete(`/api/config/message-profiles/${key}`);
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to delete profile: ${err.message}`);
    }
  };

  const handleProviderSubmit = async (providerData: any) => {
    try {
      // In edit mode, preserve the original key to avoid creating a new profile
      const key = modalState.isEdit && modalState.provider?.id
        ? modalState.provider.id
        : providerData.name.toLowerCase().replace(/\s+/g, '-');

      const payload = {
        key,
        name: providerData.name,
        provider: providerData.type,
        config: providerData.config,
      };

      if (modalState.isEdit) {
        if (!modalState.provider?.id) {
          alert('Cannot edit profile: missing profile ID');
          return;
        }
        // Delete old profile first, then create with updated data
        await apiService.delete(`/api/config/message-profiles/${modalState.provider.id}`);
      }
      await apiService.post('/api/config/message-profiles', payload);

      closeModal();
      fetchProfiles();
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    }
  };

  const getProviderIcon = (type: string) => {
    const config = MESSAGE_PROVIDER_CONFIGS[type as MessageProviderType];
    return config?.icon || <MessageIcon className="w-5 h-5" />;
  };

  const toggleExpand = (key: string) => {
    setExpandedProfile(expandedProfile === key ? null : key);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MessageIcon className="w-8 h-8 text-primary" />
            Message Providers
          </h1>
          <p className="text-base-content/70">
            Configure messaging platforms and connection templates.
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
                This configuration is loaded from your environment variables (`.env`) and serves as the fallback.
              </p>

              {defaultStatus?.providers?.map((p: any) => (
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

              {(!defaultStatus?.providers || defaultStatus.providers.length === 0) && (
                <div className="alert alert-warning text-sm">
                  <WarningIcon className="w-4 h-4" />
                  <span>No default message provider found in environment variables.</span>
                </div>
              )}
            </div>
          </div>

          <div className="divider">Custom Profiles</div>

          {/* Profiles List */}
          {profiles.length === 0 ? (
            <div className="text-center py-10 opacity-50 border-2 border-dashed border-base-300 rounded-xl">
              <MessageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="font-bold text-lg">No Profiles Created</h3>
              <p>Create a custom profile to configure messaging platforms.</p>
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
                                {String(k).toLowerCase().includes('token') || String(k).toLowerCase().includes('secret') ? '••••••••' : String(v)}
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

      {/* Configuration Guide */}
      <Card className="bg-primary/5 border border-primary/20 mt-8">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">
            <ConfigIcon className="w-6 h-6 mr-2" />
            Configuration Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-primary">📱 Discord Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Create a Discord Bot Application</li>
                <li>• Enable Message Content Intent</li>
                <li>• Generate Bot Token</li>
                <li>• Invite Bot to your Server</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-primary">✈️ Telegram Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Create a Bot with @BotFather</li>
                <li>• Get your Bot Token</li>
                <li>• Configure Webhook (optional)</li>
                <li>• Set up commands and permissions</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-primary">📱 Slack Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Create a Slack App</li>
                <li>• Enable Bot Token Scopes</li>
                <li>• Install App to Workspace</li>
                <li>• Add Bot to Channels</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-primary">🔗 Webhook Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Configure endpoint URL</li>
                <li>• Set up authentication</li>
                <li>• Define message format</li>
                <li>• Test webhook delivery</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Provider Configuration Modal */}
      <ProviderConfigModal
        modalState={{
          ...modalState,
          providerType: 'message',
        }}
        existingProviders={profiles}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default MessageProvidersPage;
