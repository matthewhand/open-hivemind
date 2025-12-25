import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, Accordion, Alert, DataTable, Loading } from './DaisyUI';
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  CodeBracketIcon,
  LockClosedIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import type { ConfigSourcesResponse } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index} className="mt-4">
    {value === index && children}
  </div>
);

const ConfigSources: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [configSources, setConfigSources] = useState<ConfigSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedEnvVar, setSelectedEnvVar] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchConfigSources();
  }, []);

  const fetchConfigSources = async () => {
    try {
      setError(null);
      const data = await apiService.getConfigSources();
      setConfigSources(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration sources');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEnvVar = (envVar: string) => {
    setSelectedEnvVar(envVar);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEnvVar(null);
  };

  const isSensitiveKey = (key: string) => {
    const sensitivePatterns = [
      'token', 'key', 'secret', 'password', 'auth', 'credential',
    ];
    return sensitivePatterns.some(pattern =>
      key.toLowerCase().includes(pattern),
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {return '0 B';}
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="ml-4">Loading configuration sources...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert status="error" message={error} className="mb-4" />
        <Button
          variant="primary"
          onClick={fetchConfigSources}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Retry
        </Button>
      </Card>
    );
  }

  const envVarColumns = [
    { key: 'variable', label: 'Variable' },
    { key: 'value', label: 'Value' },
    { key: 'source', label: 'Source' },
    { key: 'sensitive', label: 'Sensitive' },
    { key: 'actions', label: 'Actions' },
  ];

  const envVarData = configSources?.environmentVariables
    ? Object.entries(configSources.environmentVariables).map(([key, value]) => ({
      variable: (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-sm">{key}</span>
          {isSensitiveKey(key) && <LockClosedIcon className="w-4 h-4 text-error" />}
        </div>
      ),
      value: (
        <span className="font-mono text-xs">
          {isSensitiveKey(key) ? '••••••••' : (value?.value || 'Not set')}
        </span>
      ),
      source: (
        <Badge variant="primary" size="sm" style="outline">
          <Cog6ToothIcon className="w-3 h-3 mr-1" />
          Environment
        </Badge>
      ),
      sensitive: (
        <Badge variant={isSensitiveKey(key) ? 'error' : 'success'} size="sm">
          {isSensitiveKey(key) ? 'Yes' : 'No'}
        </Badge>
      ),
      actions: (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewEnvVar(key)}
          disabled={isSensitiveKey(key)}
        >
          View
        </Button>
      ),
    }))
    : [];

  const configFileColumns = [
    { key: 'name', label: 'File Name' },
    { key: 'path', label: 'Path' },
    { key: 'size', label: 'Size' },
    { key: 'modified', label: 'Last Modified' },
    { key: 'type', label: 'Type' },
  ];

  const configFileData = configSources?.configFiles?.map((file) => ({
    name: <span className="font-medium">{file.name}</span>,
    path: <span className="font-mono text-xs">{file.path}</span>,
    size: formatFileSize(file.size),
    modified: formatDate(file.modified),
    type: (
      <Badge variant="secondary" size="sm" style="outline">
        {file.type.toUpperCase()}
      </Badge>
    ),
  })) || [];

  const overrideColumns = [
    { key: 'key', label: 'Key' },
    { key: 'value', label: 'Value' },
    { key: 'bot', label: 'Bot' },
    { key: 'type', label: 'Type' },
    { key: 'source', label: 'Source' },
  ];

  const overrideData = configSources?.overrides?.map((override) => ({
    key: <span className="font-mono font-medium text-sm">{override.key}</span>,
    value: (
      <span className="font-mono text-xs">
        {isSensitiveKey(override.key) ? '••••••••' : (override.value || 'Not set')}
      </span>
    ),
    bot: override.bot,
    type: (
      <Badge variant="warning" size="sm" style="outline">
        {override.type}
      </Badge>
    ),
    source: (
      <Badge variant="warning" size="sm">
        <CodeBracketIcon className="w-3 h-3 mr-1" />
        Override
      </Badge>
    ),
  })) || [];

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Configuration Sources</h2>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <p className="text-sm text-base-content/70">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
            <Button
              size="sm"
              onClick={fetchConfigSources}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        <p className="text-sm text-base-content/70 mb-6">
          View and manage configuration sources including environment variables, config files, and overrides.
        </p>

        {/* DaisyUI Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <button
            className={`tab ${tabValue === 0 ? 'tab-active' : ''}`}
            onClick={() => setTabValue(0)}
          >
            Environment Variables
          </button>
          <button
            className={`tab ${tabValue === 1 ? 'tab-active' : ''}`}
            onClick={() => setTabValue(1)}
          >
            Config Files
          </button>
          <button
            className={`tab ${tabValue === 2 ? 'tab-active' : ''}`}
            onClick={() => setTabValue(2)}
          >
            Overrides
          </button>
        </div>

        <TabPanel value={tabValue} index={0}>
          {envVarData.length > 0 ? (
            <DataTable columns={envVarColumns} data={envVarData} />
          ) : (
            <Alert status="info" message="No environment variables found for bot configuration." />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {configFileData.length > 0 ? (
            <DataTable columns={configFileColumns} data={configFileData} />
          ) : (
            <Alert status="info" message="No configuration files found." />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {overrideData.length > 0 ? (
            <DataTable columns={overrideColumns} data={overrideData} />
          ) : (
            <Alert status="info" message="No configuration overrides found." />
          )}
        </TabPanel>
      </Card>

      {/* Environment Variable Detail Modal */}
      <Modal isOpen={dialogOpen} onClose={handleCloseDialog} title="Environment Variable Details">
        {selectedEnvVar && configSources?.environmentVariables[selectedEnvVar] && (
          <div className="space-y-4">
            <Accordion defaultOpen>
              <Accordion.Item value="details">
                <Accordion.Trigger>
                  <div className="flex items-center gap-2">
                    <span>Details</span>
                    <ChevronDownIcon className="w-4 h-4" />
                  </div>
                </Accordion.Trigger>
                <Accordion.Content>
                  <div className="space-y-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Key</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered"
                        value={selectedEnvVar}
                        readOnly
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Value</span>
                      </label>
                      <textarea
                        className="textarea textarea-bordered"
                        value={configSources.environmentVariables[selectedEnvVar].value || ''}
                        readOnly
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Source</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={configSources.environmentVariables[selectedEnvVar].source || 'unknown'}
                          readOnly
                        />
                      </div>

                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Sensitive</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={isSensitiveKey(selectedEnvVar) ? 'Yes' : 'No'}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </div>
        )}
        <div className="modal-action">
          <Button onClick={handleCloseDialog}>Close</Button>
        </div>
      </Modal>
    </>
  );
};

export default ConfigSources;