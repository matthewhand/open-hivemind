/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, RefreshCw, AlertCircle, Save, X, Settings, AlertTriangle } from 'lucide-react';
import { ConfirmModal } from '../components/DaisyUI/Modal';

interface McpGuardConfig {
  enabled: boolean;
  type: 'owner' | 'custom';
  allowedUsers?: string[];
}

interface GuardrailProfile {
  id: string;
  name: string;
  description?: string;
  guards: {
    mcpGuard: McpGuardConfig;
    rateLimit?: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
    contentFilter?: {
      enabled: boolean;
      strictness: 'low' | 'medium' | 'high';
    };
  };
}

const API_BASE = '/api/admin';

const GuardsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<GuardrailProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState<GuardrailProfile | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Helper for empty profile
  const createEmptyProfile = (): GuardrailProfile => ({
    id: '',
    name: '',
    description: '',
    guards: {
      mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
      rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
      contentFilter: { enabled: false, strictness: 'low' },
    },
  });

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/guard-profiles`);
      if (!response.ok) throw new Error('Failed to fetch profiles');
      const result = await response.json();
      setProfiles(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSaveProfile = async () => {
    if (!editingProfile) return;
    if (!editingProfile.name.trim()) {
      setError('Profile name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = isNew ? `${API_BASE}/guard-profiles` : `${API_BASE}/guard-profiles/${editingProfile.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProfile),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save profile');
      }

      setSuccess(`Profile ${isNew ? 'created' : 'updated'} successfully`);
      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (profile: GuardrailProfile) => {
    setDeleteConfirm({ id: profile.id, name: profile.name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/guard-profiles/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete profile');

      setSuccess('Profile deleted successfully');
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
      setLoading(false);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (profile: GuardrailProfile) => {
    setEditingProfile({ ...profile });
    setIsNew(false);
  };

  const handleCreate = () => {
    setEditingProfile(createEmptyProfile());
    setIsNew(true);
  };

  const updateGuard = (section: 'mcpGuard' | 'rateLimit' | 'contentFilter', updates: any) => {
    if (!editingProfile) return;
    setEditingProfile({
      ...editingProfile,
      guards: {
        ...editingProfile.guards,
        [section]: { ...editingProfile.guards[section], ...updates },
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Notifications */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <Check className="w-5 h-5" />
          <span>{success}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Guard Profiles</h1>
            <p className="text-base-content/60">Manage security and access control profiles for bots</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProfiles} className="btn btn-ghost gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleCreate} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> New Profile
          </button>
        </div>
      </div>

      {loading && !editingProfile ? (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <div key={profile.id} className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h3 className="card-title text-lg">{profile.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(profile)} className="btn btn-ghost btn-xs btn-square">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteClick(profile)} className="btn btn-ghost btn-xs btn-square text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm opacity-70 mb-4 h-10 line-clamp-2">{profile.description || 'No description'}</p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {profile.guards.mcpGuard.enabled && <span className="badge badge-primary badge-sm">Access Control</span>}
                  {profile.guards.rateLimit?.enabled && <span className="badge badge-warning badge-sm">Rate Limit</span>}
                  {profile.guards.contentFilter?.enabled && <span className="badge badge-error badge-sm">Content Filter</span>}
                  {!profile.guards.mcpGuard.enabled && !profile.guards.rateLimit?.enabled && !profile.guards.contentFilter?.enabled && (
                    <span className="badge badge-ghost badge-sm">No Guards</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProfile && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 className="font-bold text-lg mb-6">{isNew ? 'Create Guard Profile' : 'Edit Guard Profile'}</h3>

            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Profile Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={editingProfile.name}
                onChange={e => setEditingProfile({...editingProfile, name: e.target.value})}
                placeholder="e.g. Strict Production"
              />
            </div>

            <div className="form-control mb-6">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered h-20"
                value={editingProfile.description}
                onChange={e => setEditingProfile({...editingProfile, description: e.target.value})}
                placeholder="Describe what this profile enforces..."
              />
            </div>

            <div className="divider">Guardrails</div>

            <div className="grid grid-cols-1 gap-6">
              {/* Access Control */}
              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" defaultChecked />
                <div className="collapse-title text-xl font-medium flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Access Control
                  <input
                    type="checkbox"
                    className="toggle toggle-primary ml-auto z-10"
                    checked={editingProfile.guards.mcpGuard.enabled}
                    onChange={e => updateGuard('mcpGuard', { enabled: e.target.checked })}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Type</span></label>
                    <select
                      className="select select-bordered"
                      value={editingProfile.guards.mcpGuard.type}
                      onChange={e => updateGuard('mcpGuard', { type: e.target.value })}
                      disabled={!editingProfile.guards.mcpGuard.enabled}
                    >
                      <option value="owner">Owner Only</option>
                      <option value="custom">Custom Allowed Users</option>
                    </select>
                  </div>
                  {editingProfile.guards.mcpGuard.type === 'custom' && (
                    <div className="form-control mt-4">
                      <label className="label" htmlFor="allowed-users"><span className="label-text">Allowed User IDs (comma separated)</span></label>
                      <input
                        id="allowed-users"
                        type="text"
                        className="input input-bordered"
                        value={editingProfile.guards.mcpGuard.allowedUsers?.join(', ') || ''}
                        onChange={e => updateGuard('mcpGuard', { allowedUsers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        disabled={!editingProfile.guards.mcpGuard.enabled}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Rate Limit */}
              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title text-xl font-medium flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" /> Rate Limiter
                  <input
                    type="checkbox"
                    className="toggle toggle-warning ml-auto z-10"
                    checked={editingProfile.guards.rateLimit?.enabled || false}
                    onChange={e => updateGuard('rateLimit', { enabled: e.target.checked })}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Max Requests</span></label>
                      <input
                        type="number"
                        className="input input-bordered"
                        value={editingProfile.guards.rateLimit?.maxRequests || 100}
                        onChange={e => updateGuard('rateLimit', { maxRequests: parseInt(e.target.value) })}
                        disabled={!editingProfile.guards.rateLimit?.enabled}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Window (ms)</span></label>
                      <input
                        type="number"
                        className="input input-bordered"
                        value={editingProfile.guards.rateLimit?.windowMs || 60000}
                        onChange={e => updateGuard('rateLimit', { windowMs: parseInt(e.target.value) })}
                        disabled={!editingProfile.guards.rateLimit?.enabled}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Filter */}
              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title text-xl font-medium flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Content Filter
                  <input
                    type="checkbox"
                    className="toggle toggle-error ml-auto z-10"
                    checked={editingProfile.guards.contentFilter?.enabled || false}
                    onChange={e => updateGuard('contentFilter', { enabled: e.target.checked })}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Strictness</span></label>
                    <div className="flex gap-4">
                      {['low', 'medium', 'high'].map(level => (
                        <label key={level} className="label cursor-pointer gap-2">
                          <input
                            type="radio"
                            name="strictness"
                            className="radio radio-error"
                            checked={editingProfile.guards.contentFilter?.strictness === level}
                            onChange={() => updateGuard('contentFilter', { strictness: level })}
                            disabled={!editingProfile.guards.contentFilter?.enabled}
                          />
                          <span className="label-text capitalize">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEditingProfile(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <span className="loading loading-spinner" /> : <Save className="w-4 h-4 mr-2" />}
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Guard Profile"
        message={`Are you sure you want to delete the profile "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmVariant="error"
        confirmText="Delete"
      />
    </div>
  );
};

export default GuardsPage;
