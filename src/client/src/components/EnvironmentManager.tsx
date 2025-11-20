import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
  Modal,
  Input,
  Tooltip,
  Loading
} from './DaisyUI';
import {
  PlusIcon as AddIcon,
  PencilIcon as EditIcon,
  TrashIcon as DeleteIcon,
  ArrowsRightLeftIcon as CompareIcon,
  ArrowPathIcon as SyncIcon,
  ExclamationTriangleIcon as WarningIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface Environment {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'syncing';
  driftDetected: boolean;
  lastSync: string;
}

interface EnvironmentComparison {
  environment1: string;
  environment2: string;
  differences: Array<{
    path: string;
    value1: any;
    value2: any;
    type: 'added' | 'removed' | 'modified';
  }>;
}

const EnvironmentManager: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const [comparison, setComparison] = useState<EnvironmentComparison | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    config: {} as Record<string, any>
  });

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      setLoading(true);
      const mockEnvironments: Environment[] = [
        {
          id: 'dev',
          name: 'Development',
          description: 'Development environment for testing',
          config: { debug: true, logLevel: 'debug' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          status: 'active',
          driftDetected: false,
          lastSync: '2024-01-15T00:00:00Z'
        },
        {
          id: 'staging',
          name: 'Staging',
          description: 'Staging environment for pre-production testing',
          config: { debug: false, logLevel: 'info' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-14T00:00:00Z',
          status: 'active',
          driftDetected: true,
          lastSync: '2024-01-14T00:00:00Z'
        },
        {
          id: 'prod',
          name: 'Production',
          description: 'Production environment',
          config: { debug: false, logLevel: 'error' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-13T00:00:00Z',
          status: 'active',
          driftDetected: false,
          lastSync: '2024-01-13T00:00:00Z'
        }
      ];
      setEnvironments(mockEnvironments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnvironment = async () => {
    if (!formData.name.trim()) {
      setError('Environment name is required');
      return;
    }

    try {
      setLoading(true);
      const newEnvironment: Environment = {
        id: formData.name.toLowerCase().replace(/\s+/g, '-'),
        name: formData.name,
        description: formData.description,
        config: formData.config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        driftDetected: false,
        lastSync: new Date().toISOString()
      };

      setEnvironments(prev => [...prev, newEnvironment]);
      setSuccess('Environment created successfully!');
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', config: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create environment');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEnvironment = async (envId: string) => {
    try {
      setLoading(true);
      setEnvironments(prev =>
        prev.map(env =>
          env.id === envId
            ? { ...env, status: 'syncing' as const, lastSync: new Date().toISOString() }
            : env
        )
      );

      setTimeout(() => {
        setEnvironments(prev =>
          prev.map(env =>
            env.id === envId
              ? { ...env, status: 'active' as const, driftDetected: false }
              : env
          )
        );
        setSuccess(`Environment ${envId} synced successfully!`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync environment');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareEnvironments = async () => {
    if (selectedEnvironments.length !== 2) {
      setError('Please select exactly 2 environments to compare');
      return;
    }

    try {
      setLoading(true);
      const [env1, env2] = selectedEnvironments.map(id =>
        environments.find(env => env.id === id)
      );

      if (!env1 || !env2) {
        setError('Selected environments not found');
        return;
      }

      const differences: EnvironmentComparison['differences'] = [];
      const compareObjects = (obj1: any, obj2: any, path = '') => {
        const keys1 = Object.keys(obj1 || {});
        const keys2 = Object.keys(obj2 || {});

        keys1.forEach(key => {
          if (!(key in obj2)) {
            differences.push({ path: path + key, value1: obj1[key], value2: undefined, type: 'removed' });
          }
        });

        keys2.forEach(key => {
          if (!(key in obj1)) {
            differences.push({ path: path + key, value1: undefined, value2: obj2[key], type: 'added' });
          }
        });

        keys1.forEach(key => {
          if (key in obj2) {
            if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
              differences.push({ path: path + key, value1: obj1[key], value2: obj2[key], type: 'modified' });
            }
          }
        });
      };

      compareObjects(env1.config, env2.config);

      setComparison({
        environment1: env1.name,
        environment2: env2.name,
        differences
      });

      setCompareDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare environments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'syncing': return 'warning';
      default: return 'success';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Environment Management</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCompareEnvironments}
            disabled={selectedEnvironments.length !== 2 || loading}
          >
            <CompareIcon className="w-4 h-4 mr-2" />
            Compare Selected
          </Button>
          <Button
            variant="primary"
            onClick={() => setCreateDialogOpen(true)}
            disabled={loading}
          >
            <AddIcon className="w-4 h-4 mr-2" />
            Create Environment
          </Button>
        </div>
      </div>

      {error && <Alert status="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert status="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {environments.map((env) => (
          <Card key={env.id} className="shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{env.name}</h2>
                  <p className="text-sm opacity-70">{env.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={getStatusColor(env.status)}>
                    {env.status}
                  </Badge>
                  {env.driftDetected && (
                    <Tooltip content="Configuration drift detected">
                      <WarningIcon className="w-5 h-5 text-warning" />
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="space-y-1 mb-4 text-sm opacity-70">
                <p>Last Sync: {new Date(env.lastSync).toLocaleString()}</p>
                <p>Updated: {new Date(env.updatedAt).toLocaleString()}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSyncEnvironment(env.id)}
                  disabled={loading || env.status === 'syncing'}
                >
                  {env.status === 'syncing' ? (
                    <><Loading.Spinner size="sm" className="mr-2" /> Syncing...</>
                  ) : (
                    <><SyncIcon className="w-4 h-4 mr-1" /> Sync</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={selectedEnvironments.includes(env.id) ? 'primary' : 'ghost'}
                  onClick={() => {
                    const newSelection = selectedEnvironments.includes(env.id)
                      ? selectedEnvironments.filter(id => id !== env.id)
                      : [...selectedEnvironments, env.id].slice(-2);
                    setSelectedEnvironments(newSelection);
                  }}
                >
                  <CompareIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Environment Modal */}
      <Modal
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Create New Environment"
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Environment Name *</span></label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Production"
              required
            />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Description</span></label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Brief description of this environment"
            />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Configuration (JSON)</span></label>
            <textarea
              className="textarea textarea-bordered font-mono text-xs"
              value={JSON.stringify(formData.config, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setFormData(prev => ({ ...prev, config }));
                } catch (err) {
                  // Invalid JSON, keep current value
                }
              }}
              rows={8}
              placeholder='{"debug": true, "logLevel": "info"}'
            />
            <label className="label"><span className="label-text-alt">Enter environment-specific configuration as JSON</span></label>
          </div>
        </div>

        <div className="modal-action">
          <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreateEnvironment}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? 'Creating...' : 'Create Environment'}
          </Button>
        </div>
      </Modal>

      {/* Compare Environments Modal */}
      <Modal
        isOpen={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        title={`Environment Comparison: ${comparison?.environment1} vs ${comparison?.environment2}`}
      >
        <div className="space-y-2">
          {comparison && (
            <>
              {comparison.differences.map((diff, index) => (
                <div key={index} className="p-3 border border-base-300 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">{diff.path}</code>
                    <Badge
                      variant={diff.type === 'added' ? 'success' : diff.type === 'removed' ? 'error' : 'warning'}
                      size="sm"
                    >
                      {diff.type}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="font-bold">{comparison.environment1}:</span>{' '}
                      <code>{JSON.stringify(diff.value1)}</code>
                    </div>
                    <div>
                      <span className="font-bold">{comparison.environment2}:</span>{' '}
                      <code>{JSON.stringify(diff.value2)}</code>
                    </div>
                  </div>
                </div>
              ))}
              {comparison.differences.length === 0 && (
                <div className="text-center py-8 opacity-70">
                  <p>No differences found</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-action">
          <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
};

export default EnvironmentManager;