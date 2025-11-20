import React, { useState } from 'react';
import { Card, Badge, Button, Input, Select, Modal, Alert, Toggle, Tooltip, Loading } from './DaisyUI';
import {
  ArrowPathIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../store/hooks';
import {
  selectConfig,
  selectConfigError,
} from '../store/slices/configSlice';
import LoadingSpinnerComponent from './LoadingSpinner';

const ConfigManager: React.FC = () => {
  const config = useAppSelector(selectConfig);
  const configError = useAppSelector(selectConfigError);
  const [selectedEnv, setSelectedEnv] = useState<string>('development');
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Mock configuration data for demonstration
  const mockConfigs = [
    { id: 'dev', name: 'Development', environment: 'development', isActive: true, lastModified: new Date('2024-09-25T10:30:00Z') },
    { id: 'staging', name: 'Staging', environment: 'staging', isActive: false, lastModified: new Date('2024-09-24T15:45:00Z') },
    { id: 'prod', name: 'Production', environment: 'production', isActive: false, lastModified: new Date('2024-09-23T08:20:00Z') },
  ];

  const [editingConfig, setEditingConfig] = useState(mockConfigs[0]);
  const [configs, setConfigs] = useState(mockConfigs);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSaveConfig = () => {
    // Basic validation
    const errors: Record<string, string> = {};
    if (!editingConfig.name || editingConfig.name.trim() === '') {
      errors.name = 'Configuration name is required';
    }
    if (!editingConfig.environment || editingConfig.environment.trim() === '') {
      errors.environment = 'Environment is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

    try {
      // Simulate saving configuration
      const updatedConfig = { ...editingConfig, lastModified: new Date() };
      setConfigs(prev => prev.map(c => c.id === editingConfig.id ? updatedConfig : c));
      setEditingConfig(updatedConfig);
      setHasChanges(false);
      setValidationErrors({});
      showToast('Configuration saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      showToast('Failed to save configuration', 'error');
    }
  };

  const handleEnvironmentChange = (env: string) => {
    setSelectedEnv(env);
    const config = configs.find(c => c.environment === env) || configs[0];
    setEditingConfig(config);
  };

  const handleDeleteConfig = (config: any) => {
    setConfigToDelete(config);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteConfig = () => {
    if (configToDelete) {
      setConfigs(prev => prev.filter(c => c.id !== configToDelete.id));
      if (editingConfig.id === configToDelete.id) {
        setEditingConfig(configs[0] || null);
      }
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  const filteredConfigs = configs.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.environment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnvironment = filterEnvironment === 'all' || config.environment === filterEnvironment;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && config.isActive) ||
      (filterStatus === 'inactive' && !config.isActive);
    return matchesSearch && matchesEnvironment && matchesStatus;
  });

  if (config.isLoading) {
    return <LoadingSpinnerComponent message="Loading configurations..." />;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Configuration Manager</h1>

      {configError && (
        <Alert status="error" message={configError} className="mb-6" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Panel - Configuration List */}
        <div className="md:col-span-4">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Configurations</h2>
              <Tooltip content="Refresh configurations">
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-circle"
                  onClick={() => console.log('Refresh configs')}
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </Button>
              </Tooltip>
            </div>

            {/* Search */}
            <div className="form-control w-full mb-4">
              <div className="relative">
                <Input
                  placeholder="Search configurations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Environment</span>
                </label>
                <Select
                  size="sm"
                  value={filterEnvironment}
                  onChange={(e) => setFilterEnvironment(e.target.value)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'development', label: 'Development' },
                    { value: 'staging', label: 'Staging' },
                    { value: 'production', label: 'Production' },
                  ]}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <Select
                  size="sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>

            {/* Configuration List */}
            <div className="space-y-2">
              {filteredConfigs.map((config) => (
                <div
                  key={config.id}
                  onClick={() => handleEnvironmentChange(config.environment)}
                  className={`p-3 border rounded-box cursor-pointer transition-colors ${selectedEnv === config.environment
                      ? 'bg-primary/10 border-primary'
                      : 'bg-base-200 border-base-300 hover:bg-base-300'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <p className="font-medium">{config.name}</p>
                      <p className="text-xs text-base-content/70">
                        Last Modified: {config.lastModified.toLocaleString()}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="neutral" size="sm" style="outline">
                          {config.environment}
                        </Badge>
                        {config.isActive && (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Tooltip content="Delete configuration">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="btn-circle text-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfig(config);
                        }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Panel - Configuration Editor */}
        <div className="md:col-span-8">
          {editingConfig ? (
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Edit Configuration</h2>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    buttonStyle="outline"
                    onClick={() => setEditingConfig(mockConfigs[0])}
                    className="flex items-center gap-2"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Reset
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveConfig}
                    disabled={!hasChanges}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Configuration Name</span>
                  </label>
                  <Input
                    value={editingConfig.name || ''}
                    onChange={(e) => {
                      setEditingConfig({ ...editingConfig, name: e.target.value });
                      setHasChanges(true);
                      if (validationErrors.name) {
                        setValidationErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                  />
                  {validationErrors.name && (
                    <label className="label">
                      <span className="label-text-alt text-error">{validationErrors.name}</span>
                    </label>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Environment</span>
                  </label>
                  <Input
                    value={editingConfig.environment || 'development'}
                    onChange={(e) => {
                      setEditingConfig({ ...editingConfig, environment: e.target.value });
                      setHasChanges(true);
                      if (validationErrors.environment) {
                        setValidationErrors(prev => ({ ...prev, environment: '' }));
                      }
                    }}
                  />
                  {validationErrors.environment && (
                    <label className="label">
                      <span className="label-text-alt text-error">{validationErrors.environment}</span>
                    </label>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Toggle
                    label="Active Configuration"
                    checked={editingConfig.isActive || false}
                    onChange={(e) => {
                      setEditingConfig({ ...editingConfig, isActive: e.target.checked });
                      setHasChanges(true);
                    }}
                    color="primary"
                  />
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="text-lg text-base-content/70 text-center">
                Select a configuration to edit
              </h2>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Confirm Deletion"
      >
        <p className="py-4">
          Are you sure you want to delete the configuration "{configToDelete?.name}"?
          This action cannot be undone.
        </p>
        <div className="modal-action">
          <Button onClick={() => setDeleteDialogOpen(false)} variant="ghost">
            Cancel
          </Button>
          <Button onClick={confirmDeleteConfig} variant="primary" className="btn-error">
            Delete
          </Button>
        </div>
      </Modal>

      {/* Toast notification */}
      {toast.show && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigManager;