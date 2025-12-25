import React, { useState, useEffect } from 'react';
import { Button, Modal, Card, Alert, Badge } from '../DaisyUI';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface GuardrailProfile {
    key: string;
    name: string;
    description?: string;
    mcpGuard: {
        enabled: boolean;
        type: 'owner' | 'custom';
        allowedUserIds?: string[];
    };
}

const GuardrailProfileManager: React.FC = () => {
  const [profiles, setProfiles] = useState<GuardrailProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<GuardrailProfile | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: true,
    type: 'owner' as 'owner' | 'custom',
    allowedUserIds: '',
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/config/guardrails');
      if (!response.ok) {throw new Error('Failed to fetch guardrail profiles');}
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openCreateDialog = () => {
    setEditingProfile(null);
    setFormData({ key: '', name: '', description: '', enabled: true, type: 'owner', allowedUserIds: '' });
    setEditDialogOpen(true);
  };

  const openEditDialog = (profile: GuardrailProfile) => {
    setEditingProfile(profile);
    setFormData({
      key: profile.key,
      name: profile.name,
      description: profile.description || '',
      enabled: profile.mcpGuard.enabled,
      type: profile.mcpGuard.type,
      allowedUserIds: profile.mcpGuard.allowedUserIds?.join(', ') || '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const profileData: GuardrailProfile = {
        key: formData.key.trim().toLowerCase().replace(/\s+/g, '-'),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        mcpGuard: {
          enabled: formData.enabled,
          type: formData.type,
          allowedUserIds: formData.type === 'custom'
            ? formData.allowedUserIds.split(',').map(s => s.trim()).filter(Boolean)
            : undefined,
        },
      };

      if (editingProfile) {
        const updated = profiles.map(p => p.key === editingProfile.key ? profileData : p);
        const response = await fetch('/api/config/guardrails', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profiles: updated }),
        });
        if (!response.ok) {throw new Error('Failed to update profile');}
      } else {
        const response = await fetch('/api/config/guardrails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create profile');
        }
      }

      setToastMessage(`Profile ${editingProfile ? 'updated' : 'created'} successfully`);
      setToastType('success');
      setEditDialogOpen(false);
      fetchProfiles();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Operation failed');
      setToastType('error');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete profile "${key}"?`)) {return;}
    try {
      const response = await fetch(`/api/config/guardrails/${key}`, { method: 'DELETE' });
      if (!response.ok) {throw new Error('Failed to delete profile');}
      setToastMessage('Profile deleted');
      setToastType('success');
      fetchProfiles();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Delete failed');
      setToastType('error');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[200px]"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <Card title="Guardrail Profiles" className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-7 h-7" />
          <h2 className="text-2xl font-bold">Guardrail Profiles</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchProfiles} startIcon={<ArrowPathIcon className="w-5 h-5" />}>
                        Refresh
          </Button>
          <Button variant="primary" onClick={openCreateDialog} startIcon={<PlusIcon className="w-5 h-5" />}>
                        Add Profile
          </Button>
        </div>
      </div>

      {error && <Alert status="error" message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(profile => (
          <Card key={profile.key} className="bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">{profile.name}</h3>
              <p className="text-sm text-base-content/70">{profile.description || 'No description'}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant={profile.mcpGuard.enabled ? 'success' : 'secondary'}>
                  {profile.mcpGuard.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Badge variant="neutral">{profile.mcpGuard.type}</Badge>
              </div>
              <div className="card-actions justify-end mt-4">
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(profile)}>
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-error" onClick={() => handleDelete(profile.key)}>
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title={editingProfile ? 'Edit Guardrail Profile' : 'Create Guardrail Profile'}
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Key</span></label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.key}
              onChange={e => setFormData({ ...formData, key: e.target.value })}
              disabled={!!editingProfile}
              placeholder="my-profile"
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Name</span></label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Description</span></label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Guard Enabled</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={formData.enabled}
                onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Guard Type</span></label>
            <select
              className="select select-bordered"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as 'owner' | 'custom' })}
            >
              <option value="owner">Owner Only</option>
              <option value="custom">Custom Allow List</option>
            </select>
          </div>
          {formData.type === 'custom' && (
            <div className="form-control">
              <label className="label"><span className="label-text">Allowed User IDs</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.allowedUserIds}
                onChange={e => setFormData({ ...formData, allowedUserIds: e.target.value })}
                placeholder="user1, user2"
              />
              <label className="label"><span className="label-text-alt">Comma-separated user IDs</span></label>
            </div>
          )}
          <div className="modal-action">
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>

      {toastMessage && (
        <div className="toast toast-bottom toast-center z-50">
          <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toastMessage}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setToastMessage('')}>✕</button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GuardrailProfileManager;
