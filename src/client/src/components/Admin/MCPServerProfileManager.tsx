import React, { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ServerStackIcon } from '@heroicons/react/24/outline';
import { Button, Modal, Card, Alert, Badge } from '../DaisyUI';

interface McpServerConfig {
    name: string;
    serverUrl: string;
    apiKey?: string;
}

interface McpServerProfile {
    key: string;
    name: string;
    description?: string;
    mcpServers: McpServerConfig[];
}

const MCPServerProfileManager: React.FC = () => {
  const [profiles, setProfiles] = useState<McpServerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<McpServerProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formServers, setFormServers] = useState<McpServerConfig[]>([]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/mcp-server-profiles');
      if (!response.ok) {throw new Error('Failed to fetch profiles');}
      const data = await response.json();
      setProfiles(Array.isArray(data?.profiles) ? data.profiles : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const resetForm = () => {
    setFormKey('');
    setFormName('');
    setFormDescription('');
    setFormServers([]);
    setEditingProfile(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (profile: McpServerProfile) => {
    setEditingProfile(profile);
    setFormKey(profile.key);
    setFormName(profile.name);
    setFormDescription(profile.description || '');
    setFormServers([...profile.mcpServers]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const addServer = () => {
    setFormServers([...formServers, { name: '', serverUrl: '' }]);
  };

  const updateServer = (index: number, field: keyof McpServerConfig, value: string) => {
    const updated = [...formServers];
    updated[index] = { ...updated[index], [field]: value };
    setFormServers(updated);
  };

  const removeServer = (index: number) => {
    setFormServers(formServers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        key: formKey.trim().toLowerCase().replace(/\s+/g, '-'),
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        mcpServers: formServers.filter(s => s.name && s.serverUrl),
      };

      const isEdit = !!editingProfile;
      const url = isEdit
        ? `/api/config/mcp-server-profiles/${editingProfile.key}`
        : '/api/config/mcp-server-profiles';

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      setSuccess(isEdit ? 'Profile updated successfully' : 'Profile created successfully');
      closeModal();
      fetchProfiles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const response = await fetch(`/api/config/mcp-server-profiles/${key}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete profile');
      }

      setSuccess('Profile deleted successfully');
      setDeleteConfirm(null);
      fetchProfiles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">MCP Server Profiles</h2>
        <Button variant="primary" onClick={openCreateModal}>
          <PlusIcon className="w-5 h-5 mr-2" />
                    Add Profile
        </Button>
      </div>

      {error && (
        <Alert status="error" message={error} onClose={() => setError(null)} />
      )}

      {success && (
        <Alert status="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {profiles.length === 0 ? (
        <Alert status="info" message="No MCP server profiles configured. Create one to bundle MCP servers for easy assignment to bots." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => (
            <Card key={profile.key} className="bg-base-200">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="card-title text-lg">{profile.name}</h3>
                    <Badge variant="neutral" className="mt-1">{profile.key}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(profile)}>
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(profile.key)}>
                      <TrashIcon className="w-4 h-4 text-error" />
                    </Button>
                  </div>
                </div>

                {profile.description && (
                  <p className="text-sm text-base-content/70 mt-2">{profile.description}</p>
                )}

                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <ServerStackIcon className="w-4 h-4" />
                    <span>Servers ({profile.mcpServers.length})</span>
                  </div>
                  {profile.mcpServers.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {profile.mcpServers.slice(0, 3).map((server, i) => (
                        <li key={i} className="truncate text-base-content/70">
                                                    • {server.name}
                        </li>
                      ))}
                      {profile.mcpServers.length > 3 && (
                        <li className="text-base-content/50">
                                                    +{profile.mcpServers.length - 3} more...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-base-content/50 italic">No servers configured</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingProfile ? 'Edit Profile' : 'Create Profile'}>
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Profile Key</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="my-profile"
              value={formKey}
              onChange={e => setFormKey(e.target.value)}
              disabled={!!editingProfile}
            />
            <label className="label">
              <span className="label-text-alt">Unique identifier (auto-formatted)</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Display Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="My MCP Profile"
              value={formName}
              onChange={e => setFormName(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="Optional description..."
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="divider">MCP Servers</div>

          {formServers.map((server, index) => (
            <div key={index} className="card bg-base-200 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Server {index + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => removeServer(index)}>
                  <TrashIcon className="w-4 h-4 text-error" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="form-control">
                  <label className="label py-0">
                    <span className="label-text text-xs">Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    placeholder="Server name"
                    value={server.name}
                    onChange={e => updateServer(index, 'name', e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label py-0">
                    <span className="label-text text-xs">URL</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    placeholder="http://localhost:3001"
                    value={server.serverUrl}
                    onChange={e => updateServer(index, 'serverUrl', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-control mt-2">
                <label className="label py-0">
                  <span className="label-text text-xs">API Key (optional)</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  placeholder="••••••••"
                  value={server.apiKey || ''}
                  onChange={e => updateServer(index, 'apiKey', e.target.value)}
                />
              </div>
            </div>
          ))}

          <Button variant="ghost" onClick={addServer} className="w-full">
            <PlusIcon className="w-4 h-4 mr-2" />
                        Add Server
          </Button>

          <div className="modal-action">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!formKey.trim() || !formName.trim()}
            >
              {editingProfile ? 'Save Changes' : 'Create Profile'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
      >
        <p className="py-4">Are you sure you want to delete this profile? This action cannot be undone.</p>
        <div className="modal-action">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <button className="btn btn-error" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
                        Delete Profile
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MCPServerProfileManager;
