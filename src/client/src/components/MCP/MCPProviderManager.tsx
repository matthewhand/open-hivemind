import React, { useState, useEffect } from 'react';
import { Alert, Badge, Button, Card, Collapse, Divider, Input, Modal, Progress, Select, Tabs, Toggle, Tooltip } from 'react-daisyui';
import { FaPlus, FaTrash, FaPlay, FaStop, FaRedo, FaTest, FaDownload, FaUpload, FaCheck, FaExclamationTriangle, FaInfoCircle, FaCog, FaTerminal, FaClock, FaMemory } from 'react-icons/fa';
import { MCPProviderConfig, MCPProviderStatus, MCPProviderTestResult, MCPProviderTemplate } from '../../../types/mcp';
import MCPProviderManager from '../../../config/MCPProviderManager';
import { mcpProviderSchema } from '../../provider-configs/schemas/mcp';

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

      const providersWithStatus: ProviderWithStatus[] = allProviders.map(provider => ({
        ...provider,
        status: providerStatuses[provider.id] || {
          id: provider.id,
          status: 'stopped',
          lastCheck: new Date()
        }
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
      [event.providerId]: event.data
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
        p.id === providerId ? { ...p, isStarting: true } : p
      ));

      await manager.startProvider(providerId);
      await loadProviders();
    } catch (error) {
      console.error('Failed to start provider:', error);
      alert('Failed to start provider: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isStarting: false } : p
      ));
    }
  };

  const handleStopProvider = async (providerId: string) => {
    try {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isStopping: true } : p
      ));

      await manager.stopProvider(providerId);
      await loadProviders();
    } catch (error) {
      console.error('Failed to stop provider:', error);
      alert('Failed to stop provider: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isStopping: false } : p
      ));
    }
  };

  const handleTestProvider = async (providerId: string) => {
    try {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isTesting: true } : p
      ));

      const result = await manager.testProvider(providerId);
      setTestResults(prev => ({
        ...prev,
        [providerId]: result
      }));
    } catch (error) {
      console.error('Failed to test provider:', error);
      alert('Failed to test provider: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isTesting: false } : p
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
    if (!file) return;

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
      case 'running': return 'success';
      case 'stopped': return 'neutral';
      case 'error': return 'error';
      case 'starting': return 'warning';
      case 'stopping': return 'warning';
      default: return 'neutral';
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
        <Card.Body className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="card-title text-lg">{provider.name}</h3>
                <Badge color={statusColor} size="sm">
                  {getStatusIcon(provider.status?.status || 'stopped')}
                  <span className="ml-1">{provider.status?.status || 'stopped'}</span>
                </Badge>
                <Badge variant="outline" size="sm">
                  {provider.type}
                </Badge>
                {provider.enabled && <Badge color="success" size="sm">Enabled</Badge>}
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
                    <Badge color={testResult.success ? 'success' : 'error'} size="sm">
                      {testResult.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span className="text-xs text-base-content/60">
                      {testResult.duration}ms
                    </span>
                  </div>
                  {testResult.error && (
                    <Alert status="error" className="text-xs py-2 px-3">
                      <FaExclamationTriangle className="w-3 h-3" />
                      <span>{testResult.error}</span>
                    </Alert>
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
              <Button
                size="sm"
                color="primary"
                onClick={() => handleEditProvider(provider)}
              >
                <FaCog className="w-3 h-3" />
              </Button>

              {provider.status?.status === 'running' ? (
                <Button
                  size="sm"
                  color="error"
                  onClick={() => handleStopProvider(provider.id)}
                  disabled={provider.isStopping}
                >
                  {provider.isStopping ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaStop className="w-3 h-3" />
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  color="success"
                  onClick={() => handleStartProvider(provider.id)}
                  disabled={provider.isStarting}
                >
                  {provider.isStarting ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaPlay className="w-3 h-3" />
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestProvider(provider.id)}
                disabled={provider.isTesting}
              >
                {provider.isTesting ? (
                  <FaCog className="w-3 h-3 animate-spin" />
                ) : (
                  <FaTest className="w-3 h-3" />
                )}
              </Button>

              <Button
                size="sm"
                color="error"
                variant="outline"
                onClick={() => handleDeleteProvider(provider.id)}
              >
                <FaTrash className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderTemplates = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id} className="bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
            <Card.Body className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{template.name}</h4>
                <Badge variant="outline" size="sm">{template.type}</Badge>
              </div>

              <p className="text-sm text-base-content/70 mb-3">{template.description}</p>

              <div className="text-xs text-base-content/60 mb-3">
                <div className="mb-1">Category: {template.category}</div>
                <div>Command: {template.command} {template.args.join(' ')}</div>
              </div>

              {template.envVars.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1">Environment Variables:</div>
                  <div className="text-xs text-base-content/60">
                    {template.envVars.map(envVar => (
                      <div key={envVar.name} className="flex items-center gap-1">
                        <span>{envVar.name}</span>
                        {envVar.required && <span className="text-error">*</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                size="sm"
                color="primary"
                className="w-full"
                onClick={() => {
                  const provider = manager.createFromTemplate(template.id, {});
                  // TODO: Open edit modal with template
                  alert(`Created provider from template: ${template.name}`);
                }}
              >
                <FaPlus className="w-3 h-3 mr-1" />
                Use Template
              </Button>
            </Card.Body>
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportProviders}
            >
              <FaDownload className="w-3 h-3 mr-1" />
              Export
            </Button>

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

            <Button
              size="sm"
              color="primary"
              onClick={handleCreateProvider}
            >
              <FaPlus className="w-3 h-3 mr-1" />
              Add Provider
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-base-100">
            <Card.Body className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalProviders}</div>
              <div className="text-sm text-base-content/60">Total</div>
            </Card.Body>
          </Card>

          <Card className="bg-base-100">
            <Card.Body className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{stats.runningProviders}</div>
              <div className="text-sm text-base-content/60">Running</div>
            </Card.Body>
          </Card>

          <Card className="bg-base-100">
            <Card.Body className="p-4 text-center">
              <div className="text-2xl font-bold text-neutral">{stats.stoppedProviders}</div>
              <div className="text-sm text-base-content/60">Stopped</div>
            </Card.Body>
          </Card>

          <Card className="bg-base-100">
            <Card.Body className="p-4 text-center">
              <div className="text-2xl font-bold text-error">{stats.errorProviders}</div>
              <div className="text-sm text-base-content/60">Errors</div>
            </Card.Body>
          </Card>

          <Card className="bg-base-100">
            <Card.Body className="p-4 text-center">
              <div className="text-2xl font-bold">{Math.floor(stats.averageUptime / 60)}m</div>
              <div className="text-sm text-base-content/60">Avg Uptime</div>
            </Card.Body>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="providers">Providers ({providers.length})</Tabs.Tab>
            <Tabs.Tab value="templates">Templates ({templates.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Content value="providers">
            {providers.length === 0 ? (
              <Card className="bg-base-100">
                <Card.Body className="p-8 text-center">
                  <div className="text-base-content/60 mb-4">No MCP providers configured yet</div>
                  <Button color="primary" onClick={handleCreateProvider}>
                    <FaPlus className="w-3 h-3 mr-1" />
                    Add Your First Provider
                  </Button>
                </Card.Body>
              </Card>
            ) : (
              providers.map(renderProviderCard)
            )}
          </Tabs.Content>

          <Tabs.Content value="templates">
            {renderTemplates()}
          </Tabs.Content>
        </Tabs>
      </div>

      {/* Create Provider Modal */}
      <Modal open={isCreateModalOpen} onClickBackdrop={() => setIsCreateModalOpen(false)}>
        <Modal.Header className="font-bold">Create MCP Provider</Modal.Header>
        <Modal.Body>
          <p>Select a template to start with or create a custom provider.</p>
          {/* TODO: Implement provider creation form */}
        </Modal.Body>
        <Modal.Actions>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={() => setIsCreateModalOpen(false)}>
            Create Provider
          </Button>
        </Modal.Actions>
      </Modal>

      {/* Edit Provider Modal */}
      <Modal open={isEditModalOpen} onClickBackdrop={() => setIsEditModalOpen(false)}>
        <Modal.Header className="font-bold">Edit MCP Provider</Modal.Header>
        <Modal.Body>
          {selectedProvider && (
            <div>
              <p>Editing: {selectedProvider.name}</p>
              {/* TODO: Implement provider edit form */}
            </div>
          )}
        </Modal.Body>
        <Modal.Actions>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={() => setIsEditModalOpen(false)}>
            Save Changes
          </Button>
        </Modal.Actions>
      </Modal>
    </div>
  );
};

export default MCPProviderManagerComponent;