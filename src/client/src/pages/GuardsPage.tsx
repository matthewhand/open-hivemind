/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, RefreshCw, AlertCircle, Save, X, Settings, AlertTriangle, Copy } from 'lucide-react';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import TagInput from '../components/DaisyUI/TagInput';

interface McpGuardConfig {
  enabled: boolean;
  type: 'owner' | 'custom';
  allowedUsers?: string[];
  allowedTools?: string[];
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
      blockedTerms?: string[];
    };
  };
}

const API_BASE = '/api/admin';

const GuardsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<GuardrailProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  const [editingProfile, setEditingProfile] = useState<GuardrailProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Helper for empty profile
  const createEmptyProfile = (): GuardrailProfile => ({
    id: '',
    name: '',
    description: '',
    guards: {
      mcpGuard: { enabled: false, type: 'owner', allowedUsers: [], allowedTools: [] },
      rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
      contentFilter: { enabled: false, strictness: 'low', blockedTerms: [] },
    },
  });

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/guard-profiles`);
      if (!response.ok) throw new Error('Failed to fetch profiles');
      const result = await response.json();
      setProfiles(result.data || []);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSaveProfile = async () => {
    if (!editingProfile) return;
    if (!editingProfile.name.trim()) {
      showError('Profile name is required');
      return;
    }

    try {
      setSaving(true);

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

      showSuccess(`Profile ${isNew ? 'created' : 'updated'} successfully`);
      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = (profile: GuardrailProfile) => {
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

      showSuccess('Profile deleted successfully');
      setDeleteConfirm(null);
      fetchProfiles();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete profile');
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleDuplicateProfile = (profile: GuardrailProfile) => {
    const duplicatedProfile: GuardrailProfile = JSON.parse(JSON.stringify(profile));
    duplicatedProfile.id = '';
    duplicatedProfile.name = `Copy of ${profile.name}`;
    duplicatedProfile.description = profile.description ? `Copy of ${profile.description}` : '';

    setEditingProfile(duplicatedProfile);
    setIsNew(true);
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

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guard Profiles"
        description="Manage security and access control profiles for bots"
        icon={Shield}
        actions={
          <div className="flex gap-2">
            <button onClick={fetchProfiles} className="btn btn-ghost btn-sm" disabled={loading} title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4 mr-2" />
              New Profile
            </button>
          </div>
        }
      />

      <SearchFilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search profiles..."
      />

      {loading && !editingProfile ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No Guard Profiles"
          description="Create a guard profile to enforce security policies and access controls for your bots."
          actionLabel="New Profile"
          actionIcon={Plus}
          onAction={handleCreate}
          variant="noData"
        />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No Matches Found"
          description="Try adjusting your search criteria."
          variant="noResults"
          actionLabel="Clear Search"
          onAction={() => setSearchValue('')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map(profile => (
            <div key={profile.id} className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h3 className="card-title text-lg">{profile.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDuplicateProfile(profile)}
                      className="btn btn-ghost btn-xs btn-square"
                      title="Duplicate Profile"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(profile)} className="btn btn-ghost btn-xs btn-square">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteProfile(profile)} className="btn btn-ghost btn-xs btn-square text-error">
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
        <Modal
          isOpen={!!editingProfile}
          onClose={() => setEditingProfile(null)}
          title={isNew ? 'Create Guard Profile' : 'Edit Guard Profile'}
          size="lg"
          actions={[
            {
              label: 'Cancel',
              onClick: () => setEditingProfile(null),
              variant: 'ghost',
            },
            {
              label: isNew ? 'Create Profile' : 'Save Changes',
              onClick: handleSaveProfile,
              variant: 'primary',
              loading: saving,
              disabled: saving || !editingProfile.name.trim(),
            },
          ]}
        >
            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Profile Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={editingProfile.name}
                onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                placeholder="e.g. Strict Production"
              />
            </div>

            <div className="form-control mb-6">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered h-20"
                value={editingProfile.description}
                onChange={e => setEditingProfile({ ...editingProfile, description: e.target.value })}
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
                      <label className="label" htmlFor="allowed-users"><span className="label-text">Allowed User IDs</span></label>
                      <TagInput
                        value={editingProfile.guards.mcpGuard.allowedUsers || []}
                        onChange={(tags) => updateGuard('mcpGuard', { allowedUsers: tags })}
                        placeholder="Type user ID and press Enter..."
                        disabled={!editingProfile.guards.mcpGuard.enabled}
                      />
                    </div>
                  )}

                  <div className="form-control mt-4">
                    <label className="label" htmlFor="allowed-tools"><span className="label-text">Allowed Tools</span></label>
                    <TagInput
                      value={editingProfile.guards.mcpGuard.allowedTools || []}
                      onChange={(tags) => updateGuard('mcpGuard', { allowedTools: tags })}
                      placeholder="Type tool name and press Enter..."
                      disabled={!editingProfile.guards.mcpGuard.enabled}
                    />
                    <label className="label"><span className="label-text-alt opacity-70">Leave empty to allow all tools (if enabled)</span></label>
                  </div>
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

                  <div className="form-control mt-4">
                    <label className="label" htmlFor="blocked-terms"><span className="label-text">Blocked Terms</span></label>
                    <TagInput
                      value={editingProfile.guards.contentFilter?.blockedTerms || []}
                      onChange={(tags) => updateGuard('contentFilter', { blockedTerms: tags })}
                      placeholder="Type term and press Enter..."
                      disabled={!editingProfile.guards.contentFilter?.enabled}
                    />
                  </div>
                </div>
              </div>
            </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Delete Guard Profile"
        message={`Are you sure you want to delete the profile "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete Profile"
        confirmVariant="error"
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

export default GuardsPage;
