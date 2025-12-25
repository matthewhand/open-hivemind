import React, { useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Loading,
} from './DaisyUI';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface EndpointConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
  expectedStatusCodes?: number[];
  timeout?: number;
  interval?: number;
  enabled: boolean;
  retries?: number;
  retryDelay?: number;
}

interface ApiEndpointConfigProps {
  onEndpointsChange?: () => void;
}

const ApiEndpointConfig: React.FC<ApiEndpointConfigProps> = ({ onEndpointsChange }) => {
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<EndpointConfig | null>(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET' as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
    headers: '',
    body: '',
    expectedStatusCodes: '200,201,202,204',
    timeout: 10000,
    interval: 60000,
    enabled: true,
    retries: 3,
    retryDelay: 1000,
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchEndpoints = async () => {
    try {
      // For now, we'll use a mock implementation since the API endpoint isn't fully implemented
      // In a real implementation, this would call apiService.getApiEndpoints()
      setEndpoints([]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch endpoints:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleOpenDialog = (endpoint?: EndpointConfig) => {
    if (endpoint) {
      setEditingEndpoint(endpoint);
      setFormData({
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        headers: endpoint.headers ? JSON.stringify(endpoint.headers, null, 2) : '',
        body: endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '',
        expectedStatusCodes: endpoint.expectedStatusCodes?.join(',') || '200,201,202,204',
        timeout: endpoint.timeout || 10000,
        interval: endpoint.interval || 60000,
        enabled: endpoint.enabled,
        retries: endpoint.retries || 3,
        retryDelay: endpoint.retryDelay || 1000,
      });
    } else {
      setEditingEndpoint(null);
      setFormData({
        name: '',
        url: '',
        method: 'GET',
        headers: '',
        body: '',
        expectedStatusCodes: '200,201,202,204',
        timeout: 10000,
        interval: 60000,
        enabled: true,
        retries: 3,
        retryDelay: 1000,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEndpoint(null);
  };

  const handleSubmit = async () => {
    try {
      const endpointData = {
        id: editingEndpoint?.id || `endpoint_${Date.now()}`,
        name: formData.name,
        url: formData.url,
        method: formData.method,
        headers: formData.headers ? JSON.parse(formData.headers) : undefined,
        body: formData.body ? JSON.parse(formData.body) : undefined,
        expectedStatusCodes: formData.expectedStatusCodes.split(',').map(code => parseInt(code.trim())),
        timeout: formData.timeout,
        interval: formData.interval,
        enabled: formData.enabled,
        retries: formData.retries,
        retryDelay: formData.retryDelay,
      };

      if (editingEndpoint) {
        await apiService.updateApiEndpoint(editingEndpoint.id, endpointData);
        showToast('Endpoint updated successfully', 'success');
      } else {
        await apiService.addApiEndpoint(endpointData);
        showToast('Endpoint added successfully', 'success');
      }

      handleCloseDialog();
      fetchEndpoints();
      onEndpointsChange?.();
    } catch (error) {
      console.error('Failed to save endpoint:', error);
      showToast('Failed to save endpoint', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.removeApiEndpoint(id);
      showToast('Endpoint deleted successfully', 'success');
      fetchEndpoints();
      onEndpointsChange?.();
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      showToast('Failed to delete endpoint', 'error');
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await apiService.updateApiEndpoint(id, { enabled });
      fetchEndpoints();
      onEndpointsChange?.();
    } catch (error) {
      console.error('Failed to toggle endpoint:', error);
    }
  };

  const formatInterval = (ms: number) => {
    if (ms < 1000) {return `${ms}ms`;}
    if (ms < 60000) {return `${Math.round(ms / 1000)}s`;}
    return `${Math.round(ms / 60000)}m`;
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <span className="loading loading-spinner loading-md"></span>
          <p>Loading endpoints...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">API Endpoint Configuration</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Endpoint
          </Button>
        </div>

        {endpoints.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-base-content/70 mb-2">No API endpoints configured</p>
            <p className="text-sm text-base-content/50">Add your first endpoint to start monitoring</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {endpoints.map((endpoint) => (
              <li key={endpoint.id} className="p-4 bg-base-200 rounded-box hover:bg-base-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{endpoint.name}</span>
                      <Badge variant="neutral" size="sm" style="outline">
                        {endpoint.method}
                      </Badge>
                      <Badge variant={endpoint.enabled ? 'success' : 'neutral'} size="sm">
                        {endpoint.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-sm text-base-content/70 mb-1">{endpoint.url}</p>
                    <p className="text-xs text-base-content/50">
                      Interval: {formatInterval(endpoint.interval || 60000)} |
                      Timeout: {formatInterval(endpoint.timeout || 10000)} |
                      Retries: {endpoint.retries || 3}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="btn-circle"
                      onClick={() => handleToggle(endpoint.id, !endpoint.enabled)}
                    >
                      {endpoint.enabled ? (
                        <StopIcon className="w-4 h-4 text-warning" />
                      ) : (
                        <PlayIcon className="w-4 h-4 text-success" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="btn-circle"
                      onClick={() => handleOpenDialog(endpoint)}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="btn-circle text-error"
                      onClick={() => handleDelete(endpoint.id)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Configuration Modal */}
      <Modal
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        title={editingEndpoint ? 'Edit Endpoint' : 'Add New Endpoint'}
      >
        <div className="space-y-4 py-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Name *</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Endpoint name"
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">URL *</span>
            </label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://api.example.com/health"
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Method</span>
            </label>
            <Select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'HEAD', label: 'HEAD' },
              ]}
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Headers (JSON)</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.headers}
              onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
              rows={3}
              placeholder='{"Authorization": "Bearer token"}'
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Body (JSON)</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={3}
              placeholder='{"key": "value"}'
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Expected Status Codes</span>
            </label>
            <Input
              value={formData.expectedStatusCodes}
              onChange={(e) => setFormData({ ...formData, expectedStatusCodes: e.target.value })}
              placeholder="200,201,202,204"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Timeout (ms)</span>
              </label>
              <Input
                type="number"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Interval (ms)</span>
              </label>
              <Input
                type="number"
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Retries</span>
              </label>
              <Input
                type="number"
                value={formData.retries}
                onChange={(e) => setFormData({ ...formData, retries: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Retry Delay (ms)</span>
              </label>
              <Input
                type="number"
                value={formData.retryDelay}
                onChange={(e) => setFormData({ ...formData, retryDelay: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="modal-action">
          <Button onClick={handleCloseDialog} variant="ghost">Cancel</Button>
          <Button onClick={handleSubmit} variant="primary">
            {editingEndpoint ? 'Update' : 'Add'} Endpoint
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
    </>
  );
};

export default ApiEndpointConfig;