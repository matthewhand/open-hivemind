/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Toggle, Loading, Textarea, Modal, Badge } from './DaisyUI';
import {
  PuzzlePieceIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import {
  MessageSquare,
  Brain,
  Plug,
  CheckCircle,
  AlertCircle,
  Bot,
} from 'lucide-react';

import { PROVIDER_CATEGORIES } from '../config/providers';
import ProviderConfigModal from './ProviderConfiguration/ProviderConfigModal';
import { LLM_PROVIDER_CONFIGS, LLMProviderType, ProviderModalState } from '../types/bot';

interface ConfigSchema {
  doc?: string;
  format?: string | string[];
  default?: any;
  env?: string;
  locked?: boolean;
}

interface ConfigItem {
  values: Record<string, any>;
  schema: Record<string, any>;
}

type GlobalConfig = Record<string, ConfigItem>;

const PROVIDER_ICONS: Record<string, any> = {
  openai: Brain,
  flowise: Brain,
  openwebui: Brain,
  ollama: Brain,
  anthropic: Brain,
  gemini: Brain,
  groq: Brain,
  discord: MessageSquare,
  slack: MessageSquare,
  mattermost: MessageSquare,
  telegram: MessageSquare,
  whatsapp: MessageSquare,
};


const IntegrationsPanel: React.FC = () => {
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [bots, setBots] = useState<any[]>([]);
  const [llmProfiles, setLlmProfiles] = useState<any[]>([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit/Configure Modal State (For Global Config)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfigName, setSelectedConfigName] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});

  // New Integration Modal State (For Message Providers)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<string>('llm');
  const [newIntegrationType, setNewIntegrationType] = useState<string>('');
  const [newIntegrationName, setNewIntegrationName] = useState<string>('');
  const [newConfigValues, setNewConfigValues] = useState<Record<string, any>>({});

  // Profile Modal State (For LLM Profiles)
  const [providerModalState, setProviderModalState] = useState<ProviderModalState>({
    isOpen: false,
    isEdit: false,
    providerType: 'llm',
    provider: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, botsRes, profilesRes] = await Promise.all([
        fetch('/api/config/global'),
        fetch('/api/dashboard/api/status'), // Using status endpoint for bots list
        fetch('/api/config/llm-profiles'),
      ]);

      if (!configRes.ok) { throw new Error('Failed to fetch configuration'); }
      const configData = await configRes.json();
      setConfig(configData);
      setAdvancedMode(configData._userSettings?.values?.['webui.advancedMode'] || false);

      if (botsRes.ok) {
        const botsData = await botsRes.json();
        setBots(botsData.bots || []);
      }

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        setLlmProfiles(profilesData.profiles?.llm || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = (item: ConfigItem) => {
    const values = item.values;
    const requiredKeys = Object.keys(item.schema).filter(k =>
      !k.includes('model') && (k.toLowerCase().includes('key') || k.toLowerCase().includes('token')),
    );
    if (requiredKeys.length === 0) { return true; }
    return requiredKeys.some(k => values[k] && values[k] !== '***' && values[k] !== '');
  };

  const getConnectedBots = (integrationName: string, category: string) => {
    return bots.filter(bot => {
      if (category === 'llm') { return bot.llmProvider === integrationName; }
      if (category === 'message') { return bot.messageProvider === integrationName; }
      return bot.messageProvider === integrationName;
    });
  };

  const handleSave = async () => {
    if (!selectedConfigName) { return; }
    setSaving(true);

    try {
      const res = await fetch('/api/config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configName: selectedConfigName, updates: configValues }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      await fetchData();
      setIsModalOpen(false);
      setSelectedConfigName(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newIntegrationType || !newIntegrationName) { return; }

    let finalName = newIntegrationName.toLowerCase().replace(/\s+/g, '-');
    if (!finalName.startsWith(newIntegrationType + '-')) {
      finalName = `${newIntegrationType}-${finalName}`;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configName: finalName, updates: newConfigValues }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create configuration');
      }

      await fetchData();
      setIsAddModalOpen(false);
      setNewIntegrationType('');
      setNewIntegrationName('');
      setNewConfigValues({});
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSubmit = async (providerData: any) => {
    try {
      setSaving(true);
      const payload = {
        key: providerData.name.toLowerCase().replace(/\s+/g, '-'),
        name: providerData.name,
        provider: providerData.type,
        config: providerData.config,
      };

      if (providerModalState.isEdit && providerModalState.provider?.id) {
        // Delete old profile first if name/key changed or just to be safe
         await fetch(`/api/config/llm-profiles/${providerModalState.provider.id}`, { method: 'DELETE' });
      }

      const res = await fetch('/api/config/llm-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save profile');
      }

      await fetchData();
      setProviderModalState({ ...providerModalState, isOpen: false });
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete profile "${key}"?`)) return;
    try {
      setSaving(true);
      await fetch(`/api/config/llm-profiles/${key}`, { method: 'DELETE' });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (configName: string) => {
    if (!config || !config[configName]) { return; }
    setSelectedConfigName(configName);
    setConfigValues(JSON.parse(JSON.stringify(config[configName].values)));
    setIsModalOpen(true);
  };

  // Helper to render a single form field (reused in Edit and Create)
  const renderField = (key: string, value: any, schema: ConfigSchema, onChange: (val: any) => void) => {
    const isReadOnly = key.toUpperCase().includes('KEY') || key.toUpperCase().includes('TOKEN') || key.toUpperCase().includes('SECRET');
    const label = (key === 'LLM_PROVIDER' || key === 'MESSAGE_PROVIDER') ? `Default ${key}` : key;
    const isLocked = schema.locked === true;

    let type = 'text';
    if (typeof value === 'boolean' || schema.format === 'Boolean') { type = 'boolean'; }
    else if (typeof value === 'number' || schema.format === 'int' || schema.format === 'Number') { type = 'number'; }

    type = 'text';
    if (typeof value === 'boolean' || schema.format === 'Boolean') {
      type = 'boolean';
    } else if (typeof value === 'number' || schema.format === 'int' || schema.format === 'Number') {
      type = 'number';
    } else if (schema.format && Array.isArray(schema.format)) {
      type = 'select';
    } else if (isReadOnly) { // Keys/tokens are often passwords
      type = 'password';
    } else if (schema.format === 'Array') {
      type = 'array';
    }

    return (
      <div key={key} className="form-control">
        <label className="label py-1">
          <div className="tooltip tooltip-right z-10 text-left" data-tip={`Key: ${key}${schema.env ? ` • Env: ${schema.env}` : ''}`}>
            <span className="label-text font-medium flex items-center gap-2 text-sm opacity-90 border-b border-dashed border-base-content/30 cursor-help">
              {schema.doc || label}
              {isLocked && <LockClosedIcon className="w-3 h-3 text-warning" />}
            </span>
          </div>
        </label>
        {(type === 'text' || type === 'number' || type === 'password') && (
          <div className="join w-full">
            <Input
              type={type}
              value={value}
              onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
              disabled={isLocked}
              className={`join-item w-full input-sm ${isLocked ? 'input-disabled bg-base-200 text-base-content/50' : ''}`}
              placeholder={isReadOnly ? 'Protected Value' : ''}
            />
            {isLocked && <button className="btn btn-sm btn-square join-item btn-disabled"><LockClosedIcon className="w-4 h-4" /></button>}
          </div>
        )}
        {type === 'select' && (
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLocked}
            size="sm"
            options={(schema.format as string[]).map((opt: string) => ({ value: opt, label: opt }))}
          />
        )}
        {type === 'boolean' && (
          <Toggle
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={isLocked}
            size="sm"
          />
        )}
        {type === 'array' && (
          <Input
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => onChange(e.target.value.split(',').map((s: string) => s.trim()))}
            disabled={isLocked}
            size="sm"
            placeholder="Comma separated values"
          />
        )}
      </div>
    );
  };

  const renderLLMSection = () => {
    if (!config) return null;
    const llmConfig = config['llm'];

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 border-b border-base-200 pb-2">
          <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wide text-base-content/70">
            <CpuChipIcon className="w-5 h-5" />
            LLM Providers
            <div className="tooltip tooltip-right font-normal normal-case text-sm" data-tip="Manage AI models and API keys">
              <AlertCircle className="w-4 h-4 cursor-help opacity-50 hover:opacity-100" />
            </div>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setProviderModalState({ isOpen: true, isEdit: false, providerType: 'llm', provider: null })}
          >
            <PlusIcon className="w-4 h-4" /> Add LLM Provider
          </Button>
        </div>

        {/* Profiles List */}
        {llmProfiles.length === 0 ? (
          <div className="text-center py-8 opacity-50 border-2 border-dashed border-base-200 rounded-xl mb-6">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No custom LLM profiles configured. Using defaults.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {llmProfiles.map(profile => {
              const Icon = PROVIDER_ICONS[profile.provider] || Brain;
              const connectedBots = getConnectedBots(profile.key, 'llm');
              return (
                <Card key={profile.key} className="bg-base-100 shadow-sm hover:shadow-md transition-all border border-base-200 group">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-base-200 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm truncate" title={profile.name}>{profile.name}</h3>
                          <Badge variant="ghost" size="small" className="gap-1 p-0 text-[10px]">{profile.provider}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="btn-square btn-xs" onClick={() => setProviderModalState({
                          isOpen: true,
                          isEdit: true,
                          providerType: 'llm',
                          provider: { id: profile.key, name: profile.name, type: profile.provider, config: profile.config }
                        })}>
                          <PencilSquareIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="btn-square btn-xs text-error" onClick={() => handleDeleteProfile(profile.key)}>
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-base-200">
                      <p className="text-[10px] font-bold text-base-content/40 uppercase mb-1.5 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Used by {connectedBots.length} Bots
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Global LLM Settings */}
        {llmConfig && (
          <div className="collapse collapse-arrow bg-base-200/50 border border-base-200">
            <input type="checkbox" defaultChecked={false} />
            <div className="collapse-title text-sm font-medium flex items-center gap-2">
              <Plug className="w-4 h-4" /> Global Settings
            </div>
            <div className="collapse-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                 {/* Only allow editing existing config values, but filter for advanced */}
                 <div className="flex items-center justify-between mb-2 col-span-full">
                    <h3 className="font-bold text-sm">Default Configuration</h3>
                    <Button variant="ghost" size="sm" className="btn-xs" onClick={() => openEditModal('llm')}>
                      <PencilSquareIcon className="w-3 h-3 mr-1" /> Edit Globals
                    </Button>
                 </div>

                 {Object.entries(llmConfig.values).map(([key, value]) => {
                   const isAdvanced = key.includes('PARALLEL') || key.includes('EXECUTION');
                   if (isAdvanced && !advancedMode) return null;

                   return (
                     <div key={key} className="flex justify-between items-center p-2 bg-base-100 rounded border border-base-200">
                       <span className="text-xs font-mono opacity-70">{key}</span>
                       <span className="font-bold text-sm">{String(value)}</span>
                     </div>
                   );
                 })}

                 {!advancedMode && (
                   <div className="col-span-full text-center text-xs opacity-50 italic">
                     Enable "Advanced Mode" in System Settings to see more options.
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  const renderSection = (title: string, category: string) => {
    if (!config) { return null; }

    if (category === 'llm') {
      return renderLLMSection();
    }

    const baseProviders = PROVIDER_CATEGORIES[category] || [];
    const sectionItems = Object.keys(config).filter(key => {
      return baseProviders.some(base => key === base || key.startsWith(`${base}-`));
    });

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 border-b border-base-200 pb-2">
          <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wide text-base-content/70">
            {category === 'llm' ? <CpuChipIcon className="w-5 h-5" /> : <ChatBubbleLeftRightIcon className="w-5 h-5" />}
            {title}
            <div className="tooltip tooltip-right font-normal normal-case text-sm" data-tip={category === 'llm' ? 'Manage AI models and API keys' : 'Connect to messaging platforms'}>
              <AlertCircle className="w-4 h-4 cursor-help opacity-50 hover:opacity-100" />
            </div>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => {
              setAddCategory(category);
              setNewIntegrationType(category === 'llm' ? 'openai' : 'discord');
              setNewIntegrationName('');
              setNewConfigValues({});
              setIsAddModalOpen(true);
            }}
          >
            <PlusIcon className="w-4 h-4" /> Add {category === 'llm' ? 'LLM' : 'Message'} Integration
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sectionItems.map(key => {
            const type = baseProviders.find(base => key === base || key.startsWith(`${base}-`)) || key;
            const Icon = PROVIDER_ICONS[type] || PuzzlePieceIcon;
            const item = config[key];
            const isLocked = Object.values(item.schema).some((s: any) => s.locked);
            const isActive = isConfigured(item);

            const connectedBots = getConnectedBots(key, category);

            return (
              <Card key={key} className="bg-base-100 shadow-sm hover:shadow-md transition-all border border-base-200 group">
                <div className="card-body p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-base-200 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate" title={key}>{key}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isLocked && <Badge variant="warning" size="small" className="gap-1 p-1"><LockClosedIcon className="w-2.5 h-2.5" /> Env</Badge>}
                          {isActive && !isLocked && <Badge variant="success" size="small" className="gap-1 p-1">Active</Badge>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="btn-square btn-xs" onClick={() => openEditModal(key)}>
                      <PencilSquareIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="pt-3 border-t border-base-200">
                    <p className="text-[10px] font-bold text-base-content/40 uppercase mb-1.5 flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Used by {connectedBots.length} Bots
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {connectedBots.length > 0 ? (
                        connectedBots.slice(0, 3).map(b => (
                          <span key={b.id} className="badge badge-xs badge-ghost border-base-300">{b.name}</span>
                        ))
                      ) : (
                        <span className="text-xs text-base-content/30 italic">Not in use</span>
                      )}
                      {connectedBots.length > 3 && <span className="badge badge-xs badge-ghost">+{connectedBots.length - 3}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading && !config) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <span className="text-base-content/50">Loading integrations...</span>
      </div>
    );
  }
  if (error) { return <Alert status="error" message={error} />; }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {renderSection('LLM Providers', 'llm')}
      {renderSection('Message Platforms', 'message')}

      {/* Edit Modal (Global Config) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Configure: ${selectedConfigName}`}
        size="lg"
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          {selectedConfigName && config && config[selectedConfigName] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {Object.entries(config[selectedConfigName].values).map(([key, value]) => {
                const schema = config[selectedConfigName].schema[key] || {};

                // Advanced Mode Filter for Global Config Modal
                const isAdvanced = key.includes('PARALLEL') || key.includes('EXECUTION');
                if (isAdvanced && !advancedMode) return null;

                return renderField(
                  key,
                  configValues[key] !== undefined ? configValues[key] : value,
                  schema,
                  (val) => setConfigValues(prev => ({ ...prev, [key]: val })),
                );
              })}
            </div>
          )}
           {!advancedMode && selectedConfigName === 'llm' && (
             <div className="text-center text-xs opacity-50 italic mt-2">
               Some settings are hidden. Enable "Advanced Mode" in System Settings to see them.
             </div>
           )}
        </div>
        <div className="modal-action border-t border-base-200 pt-4 mt-4">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>Save Changes</Button>
        </div>
      </Modal>

      {/* Create Integration Modal (Message Platforms) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add ${addCategory === 'llm' ? 'LLM' : 'Message'} Integration`}
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Provider Type</span></label>
              <Select
                value={newIntegrationType}
                onChange={(e) => {
                  const type = e.target.value;
                  setNewIntegrationType(type);
                  // Reset name and values when type changes
                  setNewIntegrationName('');
                  setNewConfigValues({});
                }}
                options={[
                  { value: '', label: 'Select Type...', disabled: true },
                  ...(PROVIDER_CATEGORIES[addCategory] || []).map(p => ({ value: p, label: p })),
                ]}
                className="w-full"
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Instance ID</span></label>
              <div className="join w-full">
                <span className="btn btn-sm btn-static join-item bg-base-200 border-base-300 font-mono text-xs px-2">
                  {newIntegrationType ? `${newIntegrationType}-` : 'type-'}
                </span>
                <Input
                  value={newIntegrationName}
                  onChange={(e) => setNewIntegrationName(e.target.value)}
                  placeholder="production"
                  className="join-item input-sm w-full"
                />
              </div>
            </div>
          </div>

          {/* Configuration Fields for Selected Type */}
          {newIntegrationType && config && config[newIntegrationType] && (
            <div className="bg-base-200/50 rounded-lg p-4 border border-base-200">
              <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                <PencilSquareIcon className="w-4 h-4" /> Configure Initial Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(config[newIntegrationType].values).map(([key, defaultValue]) => {
                  const schema = config[newIntegrationType].schema[key] || {};
                  // Use newConfigValues if set, otherwise default
                  const val = newConfigValues[key] !== undefined ? newConfigValues[key] : defaultValue;

                  return renderField(
                    key,
                    val,
                    schema,
                    (newVal) => setNewConfigValues(prev => ({ ...prev, [key]: newVal })),
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-action border-t border-base-200 pt-4 mt-6">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!newIntegrationType || !newIntegrationName || saving}
            loading={saving}
          >
            Create & Save
          </Button>
        </div>
      </Modal>

      {/* Provider Config Modal (LLM Profiles) */}
      <ProviderConfigModal
        modalState={providerModalState}
        existingProviders={llmProfiles}
        onClose={() => setProviderModalState({ ...providerModalState, isOpen: false })}
        onSubmit={handleProfileSubmit}
      />
    </div>
  );
};

export default IntegrationsPanel;