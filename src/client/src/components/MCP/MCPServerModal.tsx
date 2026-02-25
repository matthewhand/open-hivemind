import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Modal, Button, Alert } from '../DaisyUI';
import { apiService } from '../../services/api';

export interface MCPServerFormData {
  id?: string;
  name: string;
  url: string;
  description?: string;
  apiKey?: string;
}

interface MCPServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  server?: MCPServerFormData | null;
  onSave: (data: MCPServerFormData) => Promise<void>;
}

const MCPServerModal: React.FC<MCPServerModalProps> = ({
  isOpen,
  onClose,
  server,
  onSave
}) => {
  const [formData, setFormData] = useState<MCPServerFormData>({
    name: '',
    url: '',
    description: '',
    apiKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (server) {
      setFormData({
        id: server.id,
        name: server.name || '',
        url: server.url || '',
        description: server.description || '',
        apiKey: server.apiKey || ''
      });
    } else {
      setFormData({
        name: '',
        url: '',
        description: '',
        apiKey: ''
      });
    }
    setError(null);
    setTestResult(null);
  }, [server, isOpen]);

  const handleTestConnection = async () => {
    if (!formData.url) {
      setError('Server URL is required');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await apiService.testMcpServer({
        name: formData.name || 'Test Server',
        serverUrl: formData.url,
        apiKey: formData.apiKey
      });

      if (response && response.success) {
        const toolCount = response.data?.toolCount || 0;
        setTestResult({
          success: true,
          message: `Connection successful! Found ${toolCount} tools.`
        });
      } else {
        throw new Error(response.message || 'Connection failed');
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Server name is required');
      return;
    }
    if (!formData.url.trim()) {
      setError('Server URL is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={server ? 'Edit MCP Server' : 'Add MCP Server'}
      size="md"
    >
      <div className="space-y-4 py-2">
        {error && (
          <Alert status="error" message={error} />
        )}

        {testResult && (
          <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'} text-sm py-2`}>
            {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium">Server Name *</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. Filesystem Server"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium">Server URL *</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full font-mono text-sm"
            placeholder="http://localhost:3000 or mcp://..."
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium">API Key (Optional)</span>
          </label>
          <input
            type="password"
            className="input input-bordered w-full font-mono text-sm"
            placeholder="Leave blank if not required"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium">Description</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="What capabilities does this server provide?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </div>

      <div className="modal-action flex justify-between items-center mt-6">
        <Button
          variant="ghost"
          onClick={handleTestConnection}
          loading={testing}
          disabled={loading || !formData.url}
          className="mr-auto"
        >
          <Activity className="w-4 h-4 mr-2" />
          Test Connection
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={testing}
          >
            <Save className="w-4 h-4 mr-2" />
            {server ? 'Update Server' : 'Add Server'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MCPServerModal;
