import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { Radio, Alert, ToastNotification } from '../components/DaisyUI';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface GuardsConfig {
  type: 'owner' | 'users' | 'disabled';
  allowedUsers: string[];
  allowedIPs: string[];
}

const GuardsPage: React.FC = () => {
  const dispatch = useDispatch();
  const guardsConfig = useSelector((state: RootState) => state.config.guards) as GuardsConfig;

  const [formData, setFormData] = useState<GuardsConfig>({
    type: 'disabled',
    allowedUsers: [],
    allowedIPs: [],
  });
  const [newUser, setNewUser] = useState('');
  const [newIP, setNewIP] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (guardsConfig) {
      setFormData(guardsConfig);
    }
  }, [guardsConfig]);

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      type: event.target.value as GuardsConfig['type'],
    });
  };

  const handleAddUser = () => {
    if (newUser.trim() && !formData.allowedUsers.includes(newUser.trim())) {
      setFormData({
        ...formData,
        allowedUsers: [...formData.allowedUsers, newUser.trim()],
      });
      setNewUser('');
    }
  };

  const handleRemoveUser = (user: string) => {
    setFormData({
      ...formData,
      allowedUsers: formData.allowedUsers.filter(u => u !== user),
    });
  };

  const handleAddIP = () => {
    if (newIP.trim() && !formData.allowedIPs.includes(newIP.trim())) {
      setFormData({
        ...formData,
        allowedIPs: [...formData.allowedIPs, newIP.trim()],
      });
      setNewIP('');
    }
  };

  const handleRemoveIP = (ip: string) => {
    setFormData({
      ...formData,
      allowedIPs: formData.allowedIPs.filter(i => i !== ip),
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/uber/guards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save guards configuration');
      }

      // dispatch(setGuardsConfig(formData)); // TODO: Implement guards config state management
      setToast({ message: 'Guards configuration saved successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save guards configuration',
        type: 'error'
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          MCP Tool Guards
        </h1>
        <p className="text-base-content/70">
          Configure access controls for MCP tools. Guards determine who can execute MCP tool operations.
        </p>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-lg">Guard Type</span>
            </label>
            <div className="space-y-2 mb-6">
              <Radio
                name="guard-type"
                value="disabled"
                checked={formData.type === 'disabled'}
                onChange={handleTypeChange}
                label="Disabled - No restrictions (anyone can use MCP tools)"
              />
              <Radio
                name="guard-type"
                value="owner"
                checked={formData.type === 'owner'}
                onChange={handleTypeChange}
                label="Owner Only - Only the server/forum owner can use MCP tools"
              />
              <Radio
                name="guard-type"
                value="users"
                checked={formData.type === 'users'}
                onChange={handleTypeChange}
                label="Specific Users - Only listed users can use MCP tools"
              />
            </div>
          </div>

          {formData.type === 'users' && (
            <div className="mb-6 p-4 bg-base-200 rounded-box">
              <h3 className="font-bold mb-4">Allowed Users</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="User ID or Username"
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddUser}
                  disabled={!newUser.trim()}
                >
                  <PlusIcon className="w-5 h-5" />
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.allowedUsers.map((user) => (
                  <div key={user} className="badge badge-lg gap-2 pr-1">
                    {user}
                    <button
                      onClick={() => handleRemoveUser(user)}
                      className="btn btn-ghost btn-xs btn-circle"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {formData.allowedUsers.length === 0 && (
                  <span className="text-sm text-base-content/50 italic">No users added yet</span>
                )}
              </div>
            </div>
          )}

          <div className="mb-6 p-4 bg-base-200 rounded-box">
            <h3 className="font-bold mb-2">Allowed IP Addresses (Optional)</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Restrict access to specific IP addresses. Leave empty to allow all IPs.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="IP Address (e.g., 192.168.1.1)"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddIP()}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddIP}
                disabled={!newIP.trim()}
              >
                <PlusIcon className="w-5 h-5" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allowedIPs.map((ip) => (
                <div key={ip} className="badge badge-outline badge-lg gap-2 pr-1">
                  {ip}
                  <button
                    onClick={() => handleRemoveIP(ip)}
                    className="btn btn-ghost btn-xs btn-circle"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.allowedIPs.length === 0 && (
                <span className="text-sm text-base-content/50 italic">No IP restrictions configured</span>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button className="btn btn-primary btn-lg" onClick={handleSave}>
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default GuardsPage;