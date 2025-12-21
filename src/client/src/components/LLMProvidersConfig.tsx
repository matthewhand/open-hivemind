import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  ModalForm,
  Input,
  Select,
  Alert,
  Chip,
  Badge,
} from './DaisyUI';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import ProviderConfig from './ProviderConfig';

interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'flowise' | 'openwebui' | 'openswarm';
  config: any;
  isActive: boolean;
}

const LLMProvidersConfig: React.FC = () => {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const llmProviderTypes = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'flowise', label: 'Flowise' },
    { value: 'openwebui', label: 'OpenWebUI' },
    { value: 'openswarm', label: 'OpenSwarm' },
  ];

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/llm-providers');
      if (!response.ok) {
        throw new Error('Failed to fetch LLM providers');
      }
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch LLM providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleOpenDialog = (provider?: LLMProvider) => {
    setEditingProvider(provider || null);
    setFormData(provider?.config || {});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProvider(null);
    setFormData({});
  };

  const handleSaveProvider = async () => {
    try {
      const url = editingProvider
        ? `/api/admin/llm-providers/${editingProvider.id}`
        : '/api/admin/llm-providers';

      const method = editingProvider ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name || editingProvider?.name,
          type: formData.type || editingProvider?.type,
          config: formData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingProvider ? 'update' : 'create'} LLM provider`);
      }

      setToast({
        show: true,
        message: `LLM provider ${editingProvider ? 'updated' : 'created'} successfully`,
        type: 'success',
      });
      handleCloseDialog();
      fetchProviders();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : `Failed to ${editingProvider ? 'update' : 'create'} LLM provider`,
        type: 'error',
      });
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this LLM provider?')) return;

    try {
      const response = await fetch(`/api/admin/llm-providers/${providerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete LLM provider');
      }

      setToast({
        show: true,
        message: 'LLM provider deleted successfully',
        type: 'success',
      });
      fetchProviders();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to delete LLM provider',
        type: 'error',
      });
    }
  };

  const handleToggleActive = async (providerId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/llm-providers/${providerId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update provider status');
      }

      fetchProviders();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to update provider status',
        type: 'error',
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[200px]"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">LLM Providers</h2>
        <Button
          variant="primary"
          startIcon={<PlusIcon className="w-5 h-5" />}
          onClick={() => handleOpenDialog()}
        >
          Add LLM Provider
        </Button>
      </div>

      {error && (
        <Alert status="error" message={error} onClose={() => setError(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <Card key={provider.id} className="bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="card-title">{provider.name}</h3>
                  <div className="mt-2">
                    <Badge variant="primary">{provider.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={provider.isActive ? 'success' : 'neutral'}>
                    {provider.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    size="sm"
                    shape="circle"
                    color="ghost"
                    onClick={() => handleOpenDialog(provider)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    shape="circle"
                    color="error"
                    variant="secondary" className="btn-outline"
                    onClick={() => handleDeleteProvider(provider.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm text-base-content/70">
                  Status: {provider.isActive ? 'Active' : 'Inactive'}
                </span>
                <Button
                  size="sm"
                  variant="secondary" className="btn-outline"
                  onClick={() => handleToggleActive(provider.id, !provider.isActive)}
                >
                  {provider.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ModalForm
        open={openDialog}
        title={editingProvider ? 'Edit LLM Provider' : 'Add New LLM Provider'}
        onClose={handleCloseDialog}
        onSubmit={handleSaveProvider}
        submitLabel={editingProvider ? 'Update' : 'Create'}
      >
        <div className="space-y-4">
          <Input
            label="Provider Name"
            value={formData.name || editingProvider?.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
          />

          <Select
            label="Provider Type"
            value={formData.type || editingProvider?.type || ''}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={llmProviderTypes}
            disabled={!!editingProvider}
            fullWidth
          />

          {(formData.type || editingProvider?.type) && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Provider Configuration</h4>
              <ProviderConfig
                provider={formData.type || editingProvider?.type}
                config={formData}
                onChange={setFormData}
                showSecurityIndicators={true}
              />
            </div>
          )}
        </div>
      </ModalForm>

      {toast.show && (
        <div className="toast toast-bottom toast-center z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setToast({ ...toast, show: false })}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMProvidersConfig;