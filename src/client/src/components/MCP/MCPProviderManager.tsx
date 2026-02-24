/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaPlay, FaStop, FaCog, FaTerminal, FaClock, FaVial, FaDownload, FaUpload, FaExclamationTriangle } from 'react-icons/fa';
import type { MCPProviderConfig, MCPProviderStatus, MCPProviderTestResult, MCPProviderTemplate } from '../../types/mcp';
import MCPProviderManager from '../../../config/MCPProviderManager';
import Card from '../DaisyUI/Card';
import Input from '../DaisyUI/Input';
import Modal from '../DaisyUI/Modal';

interface MCPProviderManagerProps {
  className?: string;
}

interface ProviderWithStatus extends MCPProviderConfig {
  status?: MCPProviderStatus;
  testResult?: MCPProviderTestResult;
  isTesting?: boolean;
  isStarting?: boolean;
  isStopping?: boolean;
}

const MCPProviderManagerComponent: React.FC<MCPProviderManagerProps> = ({ className = '' }) => {
  const [providers, setProviders] = useState<ProviderWithStatus[]>([]);
  const [templates, setTemplates] = useState<MCPProviderTemplate[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithStatus | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('providers');
  const [testResults, setTestResults] = useState<Record<string, MCPProviderTestResult>>({});
  const [manager] = useState(() => new MCPProviderManager());
  const [isSaving, setIsSaving] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    args: '',
    env: '',
    autoStart: true,
    description: '',
  });

  useEffect(() => {
    loadProviders();
    loadTemplates();

    // Listen to manager events
    manager.on('provider_added', loadProviders);
    manager.on('provider_removed', loadProviders);
    manager.on('provider_updated', loadProviders);
    manager.on('provider_started', handleProviderStarted);
    manager.on('provider_stopped', handleProviderStopped);
    manager.on('provider_error', handleProviderError);
    manager.on('provider_test_completed', handleProviderTestCompleted);

    return () => {
      manager.removeAllListeners();
    };
  }, [manager]);

  const loadProviders = async () => {
    try {
      const allProviders = manager.getAllProviders();
      const providerStatuses = manager.getAllProviderStatuses();

      const providersWithStatus: ProviderWithStatus[] = allProviders.map((provider: MCPProviderConfig) => ({
        ...provider,
        status: providerStatuses[provider.id] || {
          id: provider.id,
          status: 'stopped',
          lastCheck: new Date(),
        },
      }));

      setProviders(providersWithStatus);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadTemplates = () => {
    try {
      const availableTemplates = manager.getTemplates();
      setTemplates(availableTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleProviderStarted = (event: any) => {
    loadProviders();
  };

  const handleProviderStopped = (event: any) => {
    loadProviders();
  };

  const handleProviderError = (event: any) => {
    loadProviders();
  };

  const handleProviderTestCompleted = (event: any) => {
    setTestResults(prev => ({
      ...prev,
      [event.providerId]: event.data,
    }));
    loadProviders();
  };

  const handleCreateProvider = () => {
    setSelectedProvider(null);
    setIsCreateModalOpen(true);
  };

  const handleEditProvider = (provider: ProviderWithStatus) => {
    setSelectedProvider(provider);
    setIsEditModalOpen(true);
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this MCP provider?')) {
      return;
    }

    try {
      await manager.removeProvider(providerId);
      await loadProviders();
    } catch (error) {
      console.error('Failed to delete provider:', error);
      alert('Failed to delete provider: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleStartProvider = async (providerId: string) => {
    try {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isStarting: true } : p,
      ));

      await manager.startProvider(providerId);
      await loadProviders();
    } catch (error) {
      console.error('Failed to start provider:', error);
      alert('Failed to start provider: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isStarting: false } : p,
      ));
    }
  };

  const handleStopProvider = async (providerId: string) => {
    try {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isStopping: true } : p,
      ));

      await manager.stopProvider(providerId);
      await loadProviders();
    } catch (error) {
      console.error('Failed to stop provider:', error);
      alert('Failed to stop provider: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isStopping: false } : p,
      ));
    }
  };

  const handleTestProvider = async (providerId: string) => {
    try {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isTesting: true } : p,
      ));

      const result = await manager.testProvider(providerId);
      setTestResults(prev => ({
        ...prev,
        [providerId]: result,
      }));
    } catch (error) {
      console.error('Failed to test provider:', error);
      alert('Failed to test provider: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isTesting: false } : p,
      ));
    }
  };

  const handleExportProviders = () => {
    try {
      const data = manager.exportProviders();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mcp-providers.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export providers:', error);
      alert('Failed to export providers');
    }
  };

  const handleImportProviders = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { return; }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as string;
        await manager.importProviders(data);
        await loadProviders();
        alert('Providers imported successfully');
      } catch (error) {
        console.error('Failed to import providers:', error);
        alert('Failed to import providers: ' + (error instanceof Error ? error.message : String(error)));
      }
    };
    reader.readAsText(file);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'badge-success';
      case 'stopped': return 'badge-neutral';
      case 'error': return 'badge-error';
      case 'starting': return 'badge-warning';
      case 'stopping': return 'badge-warning';
      default: return 'badge-neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <FaPlay className="w-3 h-3" />;
      case 'stopped': return <FaStop className="w-3 h-3" />;
      case 'error': return <FaExclamationTriangle className="w-3 h-3" />;
      case 'starting':
      case 'stopping': return <FaCog className="w-3 h-3 animate-spin" />;
      default: return <FaCog className="w-3 h-3" />;
    }
  };

  const renderProviderCard = (provider: ProviderWithStatus) => {
    const testResult = testResults[provider.id];
    const statusColor = getStatusColor(provider.status?.status || 'stopped');

    return (
      <Card key={provider.id} className="bg-base-100 shadow-lg mb-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="card-title text-lg">{provider.name}</h3>
                <span className={`badge ${statusColor} gap-1`}>
                  {getStatusIcon(provider.status?.status || 'stopped')}
                  <span className="ml-1">{provider.status?.status || 'stopped'}</span>
                </span>
                <span className="badge badge-neutral badge-outline">{provider.type}</span>
                {provider.enabled && <span className="badge badge-success">Enabled</span>}
              </div>

              {provider.description && (
                <p className="text-sm text-base-content/70 mb-3">{provider.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-1 text-xs text-base-content/60">
                  <FaTerminal className="w-3 h-3" />
                  <span>{provider.command}</span>
                  {provider.args && (
                    <span className="text-base-content/40">{Array.isArray(provider.args) ? provider.args.join(' ') : provider.args}</span>
                  )}
                </div>

                {provider.status?.processId && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <FaCog className="w-3 h-3" />
                    <span>PID: {provider.status.processId}</span>
                  </div>
                )}

                {provider.status?.uptime !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <FaClock className="w-3 h-3" />
                    <span>Uptime: {Math.floor(provider.status.uptime / 60)}m</span>
                  </div>
                )}
              </div>

              {testResult && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">Last Test:</span>
                    <span className={`badge ${testResult.success ? 'badge-success' : 'badge-error'} badge-sm`}>
                      {testResult.success ? 'Success' : 'Failed'}
                    </span>
                    <span className="text-xs text-base-content/60">
                      {testResult.duration}ms
                    </span>
                  </div>
                  {testResult.error && (
                    <div className="alert alert-error text-xs py-2 px-3">
                      <FaExclamationTriangle className="w-3 h-3" />
                      <span>{testResult.error}</span>
                    </div>
                  )}
                  {testResult.version && (
                    <div className="text-xs text-base-content/60 mt-1">
                      Version: {testResult.version}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 ml-4">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleEditProvider(provider)}
              >
                <FaCog className="w-3 h-3" />
              </button>

              {provider.status?.status === 'running' ? (
                <button
                  className="btn btn-sm btn-error"
                  onClick={() => handleStopProvider(provider.id)}
                  disabled={provider.isStopping}
                >
                  {provider.isStopping ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaStop className="w-3 h-3" />
                  )}
                </button>
              ) : (
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleStartProvider(provider.id)}
                  disabled={provider.isStarting}
                >
                  {provider.isStarting ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaPlay className="w-3 h-3" />
                  )}
                </button>
              )}

              <button
                className="btn btn-sm btn-secondary btn-outline"
                onClick={() => handleTestProvider(provider.id)}
                disabled={provider.isTesting}
              >
                {provider.isTesting ? (
                  <FaCog className="w-3 h-3 animate-spin" />
                ) : (
                  <FaVial className="w-3 h-3" />
                )}
              </button>

              <button
                className="btn btn-sm btn-error btn-outline"
                onClick={() => handleDeleteProvider(provider.id)}
              >
                <FaTrash className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderTemplates = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id} className="bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{template.name}</h4>
                <span className="badge badge-neutral badge-outline badge-sm">{template.type}</span>
              </div>

              <p className="text-sm text-base-content/70 mb-3">{template.description}</p>

              <div className="text-xs text-base-content/60 mb-3">
                <div className="mb-1">Category: {template.category}</div>
                <div>Command: {template.command} {(template.args ?? []).join(' ')}</div>
              </div>

              {(template.envVars ?? []).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1">Environment Variables:</div>
                  <div className="text-xs text-base-content/60">
                    {(template.envVars ?? []).map(envVar => (
                      <div key={envVar.name} className="flex items-center gap-1">
                        <span>{envVar.name}</span>
                        {envVar.required && <span className="text-error">*</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn btn-sm btn-primary w-full"
                onClick={() => {
                  // Pre-fill form with template data
                  setFormData({
                    name: `${template.name}-${Date.now().toString(36)}`,
                    command: template.command || '',
                    args: (template.args || []).join(' '),
                    env: Object.entries(template.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'),
                    autoStart: template.autoStart ?? true,
                    description: template.description || `Created from ${template.name} template`,
                  });
                  setIsCreateModalOpen(true);
                }}
              >
                <FaPlus className="w-3 h-3 mr-1" />
                Use Template
              </button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const stats = manager.getStats();

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">MCP Providers</h2>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-secondary btn-outline"
              onClick={handleExportProviders}
            >
              <FaDownload className="w-3 h-3 mr-1" />
              Export
            </button>

            <label className="btn btn-sm btn-outline">
              <FaUpload className="w-3 h-3 mr-1" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportProviders}
                className="hidden"
              />
            </label>

            <button
              className="btn btn-sm btn-primary"
              onClick={handleCreateProvider}
            >
              <FaPlus className="w-3 h-3 mr-1" />
              Add Provider
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-base-100">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalProviders}</div>
              <div className="text-sm text-base-content/60">Total</div>
            </div>
          </Card>

          <Card className="bg-base-100">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{stats.runningProviders}</div>
              <div className="text-sm text-base-content/60">Running</div>
            </div>
          </Card>

          <Card className="bg-base-100">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-neutral">{stats.stoppedProviders}</div>
              <div className="text-sm text-base-content/60">Stopped</div>
            </div>
          </Card>

          <Card className="bg-base-100">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-error">{stats.errorProviders}</div>
              <div className="text-sm text-base-content/60">Errors</div>
            </div>
          </Card>

          <Card className="bg-base-100">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold">{Math.floor(stats.averageUptime / 60)}m</div>
              <div className="text-sm text-base-content/60">Avg Uptime</div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-lifted mb-4">
          <a role="tab" className={`tab ${activeTab === 'providers' ? 'tab-active' : ''}`} onClick={() => setActiveTab('providers')}>
            Providers ({providers.length})
          </a>
          <a role="tab" className={`tab ${activeTab === 'templates' ? 'tab-active' : ''}`} onClick={() => setActiveTab('templates')}>
            Templates ({templates.length})
          </a>
        </div>

        <div className="bg-base-100 border-base-300 rounded-box p-6 min-h-[200px]">
          {activeTab === 'providers' && (
            <div>
              {providers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-base-content/60 mb-4">No MCP providers configured yet</div>
                  <button className="btn btn-primary" onClick={handleCreateProvider}>
                    <FaPlus className="w-3 h-3 mr-1" />
                    Add Your First Provider
                  </button>
                </div>
              ) : (
                providers.map(renderProviderCard)
              )}
            </div>
          )}

          {activeTab === 'templates' && renderTemplates()}
        </div>
      </div>

      {/* Create Provider Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create MCP Provider">
        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Provider Name*</span></label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="my-mcp-provider"
              className="input-bordered"
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Command*</span></label>
            <Input
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              placeholder="npx -y @modelcontextprotocol/server-*"
              className="input-bordered"
            />
            <label className="label"><span className="label-text-alt">The command to start the MCP server</span></label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Arguments</span></label>
            <Input
              value={formData.args}
              onChange={(e) => setFormData({ ...formData, args: e.target.value })}
              placeholder="--port 8080 --config /path/to/config"
              className="input-bordered"
            />
            <label className="label"><span className="label-text-alt">Space-separated arguments</span></label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Environment Variables</span></label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.env}
              onChange={(e) => setFormData({ ...formData, env: e.target.value })}
              placeholder="KEY=value&#10;ANOTHER_KEY=value"
              rows={3}
            />
            <label className="label"><span className="label-text-alt">One per line, KEY=value format</span></label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Description</span></label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="input-bordered"
            />
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text">Auto-start on boot</span>
              <input
                type="checkbox"
                className="toggle"
                checked={formData.autoStart}
                onChange={(e) => setFormData({ ...formData, autoStart: e.target.checked })}
              />
            </label>
          </div>

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!formData.name || !formData.command) {
                  alert('Name and command are required');
                  return;
                }
                setIsSaving(true);
                try {
                  const envObj: Record<string, string> = {};
                  formData.env.split('\n').forEach(line => {
                    const [key, ...valueParts] = line.split('=');
                    if (key && valueParts.length) envObj[key.trim()] = valueParts.join('=').trim();
                  });
                  await manager.addProvider({
                    name: formData.name,
                    command: formData.command,
                    args: formData.args.split(/\s+/).filter(Boolean),
                    env: envObj,
                    autoStart: formData.autoStart,
                    description: formData.description,
                  });
                  setFormData({ name: '', command: '', args: '', env: '', autoStart: true, description: '' });
                  setIsCreateModalOpen(false);
                  loadProviders();
                } catch (error) {
                  alert('Failed to create provider: ' + (error instanceof Error ? error.message : String(error)));
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? <span className="loading loading-spinner loading-sm" /> : 'Create Provider'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Provider Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit MCP Provider">
        {selectedProvider && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Provider Name</span></label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Command</span></label>
              <Input
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                className="input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Arguments</span></label>
              <Input
                value={formData.args}
                onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                placeholder="Space-separated arguments"
                className="input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Environment Variables</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={formData.env}
                onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                rows={3}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Description</span></label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Auto-start on boot</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={formData.autoStart}
                  onChange={(e) => setFormData({ ...formData, autoStart: e.target.checked })}
                />
              </label>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => setIsEditModalOpen(false)}>
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MCPProviderManagerComponent;
