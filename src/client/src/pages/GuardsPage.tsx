/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, RefreshCw, AlertCircle, Save, X, Settings, AlertTriangle, Copy, ToggleLeft } from 'lucide-react';
import { apiService } from '../services/api';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { useSavedStamp } from '../contexts/SavedStampContext';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import Button from '../components/DaisyUI/Button';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import { CommaSeparatedInput } from '../components/DaisyUI/CommaSeparatedInput';
import Input from '../components/DaisyUI/Input';
import Textarea from '../components/DaisyUI/Textarea';
import Select from '../components/DaisyUI/Select';
import Toggle from '../components/DaisyUI/Toggle';
import RangeSlider from '../components/DaisyUI/RangeSlider';
import useUrlParams from '../hooks/useUrlParams';
import { useBulkSelection } from '../hooks/useBulkSelection';
import BulkActionBar from '../components/BulkActionBar';
import Badge from '../components/DaisyUI/Badge';
import Checkbox from '../components/DaisyUI/Checkbox';

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
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
  });
  const searchValue = urlParams.search;
  const setSearchValue = (v: string) => setUrlParam('search', v);

  const showSuccess = useSuccessToast();
  const showError = useErrorToast();
  const { showStamp } = useSavedStamp();

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
      const result: any = await apiService.get(`${API_BASE}/guard-profiles`);
      setProfiles(result.data || []);
    } catch (err: any) {
      // Suppress 401 toasts on initial load to avoid "access popup" spam
      if (!err.message?.includes('401')) {
        showError(err.message || 'Failed to fetch profiles');
      }
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

    // Clean up arrays before saving
    const profileToSave = JSON.parse(JSON.stringify(editingProfile));
    if (profileToSave.guards.mcpGuard.allowedUsers) {
      profileToSave.guards.mcpGuard.allowedUsers = profileToSave.guards.mcpGuard.allowedUsers.map((s: string) => s.trim()).filter(Boolean);
    }
    if (profileToSave.guards.mcpGuard.allowedTools) {
      profileToSave.guards.mcpGuard.allowedTools = profileToSave.guards.mcpGuard.allowedTools.map((s: string) => s.trim()).filter(Boolean);
    }
    if (profileToSave.guards.contentFilter?.blockedTerms) {
      profileToSave.guards.contentFilter.blockedTerms = profileToSave.guards.contentFilter.blockedTerms.map((s: string) => s.trim()).filter(Boolean);
    }

    try {
      setSaving(true);
      const url = isNew ? `${API_BASE}/guard-profiles` : `${API_BASE}/guard-profiles/${editingProfile.id}`;
      const method = isNew ? 'POST' : 'PUT';

      if (method === 'POST') {
        await apiService.post(url, profileToSave);
      } else {
        await apiService.put(url, profileToSave);
      }

      showSuccess(`Profile ${isNew ? 'created' : 'updated'} successfully`);
      showStamp();
      setEditingProfile(null);
      fetchProfiles();
    } catch (err: any) {
      showError(err.message || 'Failed to save profile');
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
      await apiService.delete(`${API_BASE}/guard-profiles/${deleteConfirm.id}`);
      showSuccess('Profile deleted successfully');
      setDeleteConfirm(null);
      fetchProfiles();
    } catch (err: any) {
      showError(err.message || 'Failed to delete profile');
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleDuplicateProfile = (profile: GuardrailProfile) => {
    const duplicatedProfile: GuardrailProfile = JSON.parse(JSON.stringify(profile));
    duplicatedProfile.id = '';
    duplicatedProfile.name = `Copy of ${profile?.name || 'Unnamed'}`;
    duplicatedProfile.description = profile?.description ? `Copy of ${profile.description}` : '';

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

  // Bulk selection
  const filteredProfileIds = useMemo(() => filteredProfiles.map(p => p.id), [filteredProfiles]);
  const bulk = useBulkSelection(filteredProfileIds);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleBulkDeleteProfiles = async () => {
    if (bulk.selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(bulk.selectedIds);
      await Promise.allSettled(
        ids.map(id =>
          fetch(`${API_BASE}/guard-profiles/${id}`, { method: 'DELETE' })
        )
      );
      bulk.clearSelection();
      showSuccess('Selected profiles deleted');
      fetchProfiles();
    } catch (err) {
      showError('Failed to delete some profiles');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkToggleGuards = async (enable: boolean) => {
    if (bulk.selectedCount === 0) return;
    try {
      const ids = Array.from(bulk.selectedIds);
      const updates = ids.map(id => {
        const profile = profiles.find(p => p.id === id);
        if (!profile) return Promise.resolve();
        const updated = JSON.parse(JSON.stringify(profile));
        updated.guards.mcpGuard.enabled = enable;
        if (updated.guards.rateLimit) updated.guards.rateLimit.enabled = enable;
        if (updated.guards.contentFilter) updated.guards.contentFilter.enabled = enable;
        return fetch(`${API_BASE}/guard-profiles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      });
      await Promise.allSettled(updates);
      bulk.clearSelection();
      showSuccess(`Guards ${enable ? 'enabled' : 'disabled'} for selected profiles`);
      fetchProfiles();
    } catch (err) {
      showError('Failed to update some profiles');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guard Profiles"
        description="Manage security and access control profiles for bots"
        icon={<Shield className="w-8 h-8 text-primary" />}
        actions={
          <div className="flex gap-2">
            <div className="tooltip" data-tip="Refresh profiles">
              <Button variant="ghost" size="sm" onClick={fetchProfiles} disabled={loading} aria-label="Refresh profiles">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Profile
            </Button>
          </div>
        }
      />

      <SearchFilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search profiles..."
      />

      {loading && !editingProfile ? (
        <SkeletonTableLayout rows={5} columns={3} />
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
        <>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              className="checkbox checkbox-sm checkbox-primary"
              checked={bulk.isAllSelected}
              onChange={() => bulk.toggleAll(filteredProfileIds)}
              aria-label="Select all profiles"
            />
            <span className="text-xs text-base-content/60">Select all</span>
          </div>
          <BulkActionBar
            selectedCount={bulk.selectedCount}
            onClearSelection={bulk.clearSelection}
            actions={[
              {
                key: 'enable',
                label: 'Enable All Guards',
                icon: <ToggleLeft className="w-4 h-4" />,
                variant: 'success',
                onClick: () => handleBulkToggleGuards(true),
              },
              {
                key: 'disable',
                label: 'Disable All Guards',
                icon: <ToggleLeft className="w-4 h-4" />,
                variant: 'warning',
                onClick: () => handleBulkToggleGuards(false),
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                variant: 'error',
                onClick: handleBulkDeleteProfiles,
                loading: bulkDeleting,
              },
            ]}
          />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map(profile => (
            <div key={profile.id} className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={bulk.isSelected(profile.id)}
                      onChange={(e) => bulk.toggleItem(profile.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${profile.name}`}
                    />
                    <h3 className="card-title text-lg">{profile.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <div className="tooltip" data-tip="Duplicate profile">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDuplicateProfile(profile)}
                        className="btn-square"
                        aria-label="Duplicate profile"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="tooltip" data-tip="Edit profile">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleEdit(profile)}
                        className="btn-square"
                        aria-label="Edit profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="tooltip" data-tip="Delete profile">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteProfile(profile)}
                        className="btn-square text-error"
                        aria-label="Delete profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm opacity-70 mb-4 h-10 line-clamp-2">{profile?.description || 'No description'}</p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {profile?.guards?.mcpGuard?.enabled && <Badge variant="primary" size="small">Access Control</Badge>}
                  {profile?.guards?.rateLimit?.enabled && <Badge variant="warning" size="small">Rate Limit</Badge>}
                  {profile?.guards?.contentFilter?.enabled && <Badge variant="error" size="small">Content Filter</Badge>}
                  {!profile?.guards?.mcpGuard?.enabled && !profile?.guards?.rateLimit?.enabled && !profile?.guards?.contentFilter?.enabled && (
                    <Badge variant="ghost" size="small">No Guards</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
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
            <Input
              label="Profile Name"
              type="text"
              value={editingProfile.name}
              onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
              placeholder="e.g. Strict Production"
            />
          </div>

          <div className="form-control mb-6">
            <label className="label"><span className="label-text">Description</span></label>
            <Textarea
              className="h-20"
              value={editingProfile.description || ''}
              onChange={e => setEditingProfile({ ...editingProfile, description: e.target.value })}
              placeholder="Describe what this profile enforces..."
            />
          </div>

          <div className="divider">Guardrails</div>

          <div className="grid grid-cols-1 gap-6">
            {/* Access Control */}
            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" defaultChecked />
              <div className="collapse-title text-xl font-medium flex items-center gap-2 pr-12">
                <Shield className="w-5 h-5" /> Access Control
                <div className="ml-auto z-10" onClick={e => e.stopPropagation()}>
                  <Toggle
                    color="primary"
                    checked={editingProfile.guards.mcpGuard.enabled}
                    onChange={e => updateGuard('mcpGuard', { enabled: e.target.checked })}
                  />
                </div>
              </div>
              <div className="collapse-content bg-base-100 pt-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Type</span></label>
                  <Select
                    value={editingProfile.guards.mcpGuard.type}
                    onChange={e => updateGuard('mcpGuard', { type: e.target.value })}
                    disabled={!editingProfile.guards.mcpGuard.enabled}
                    options={[
                      { value: 'owner', label: 'Owner Only' },
                      { value: 'custom', label: 'Custom Allowed Users' }
                    ]}
                  />
                </div>
                {editingProfile.guards.mcpGuard.type === 'custom' && (
                  <div className="form-control mt-4">
                    <label className="label" htmlFor="allowed-users"><span className="label-text">Allowed User IDs</span></label>
                    <CommaSeparatedInput
                      id="allowed-users"
                      value={editingProfile.guards.mcpGuard.allowedUsers || []}
                      onChange={v => updateGuard('mcpGuard', { allowedUsers: v })}
                      disabled={!editingProfile.guards.mcpGuard.enabled}
                      validate={item => {
                        if (!/^[a-zA-Z0-9-_]+$/.test(item)) {
                          return "User IDs must contain only letters, numbers, dashes, and underscores.";
                        }
                        return null;
                      }}
                    />
                  </div>
                )}

                <div className="form-control mt-4">
                  <label className="label" htmlFor="allowed-tools"><span className="label-text">Allowed Tools</span></label>
                  <CommaSeparatedInput
                    id="allowed-tools"
                    placeholder="e.g. calculator, weather"
                    value={editingProfile.guards.mcpGuard.allowedTools || []}
                    onChange={v => updateGuard('mcpGuard', { allowedTools: v })}
                    disabled={!editingProfile.guards.mcpGuard.enabled}
                    validate={item => {
                      if (!/^[a-zA-Z0-9-_]+$/.test(item)) {
                        return "Tool names must contain only letters, numbers, dashes, and underscores.";
                      }
                      return null;
                    }}
                  />
                  <label className="label"><span className="label-text-alt opacity-70">Leave empty to allow all tools (if enabled)</span></label>
                </div>
              </div>
            </div>

            {/* Rate Limit */}
            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium flex items-center gap-2 pr-12">
                <RefreshCw className="w-5 h-5" /> Rate Limiter
                <div className="ml-auto z-10" onClick={e => e.stopPropagation()}>
                  <Toggle
                    checked={editingProfile.guards.rateLimit?.enabled || false}
                    onChange={e => updateGuard('rateLimit', { enabled: e.target.checked })}
                  />
                </div>
              </div>
              <div className="collapse-content bg-base-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`form-control transition-all duration-200 ${!editingProfile.guards.rateLimit?.enabled ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={!editingProfile.guards.rateLimit?.enabled}>
                    <div className="pt-2">
                      <RangeSlider
                        label="Max Requests"
                        value={editingProfile.guards.rateLimit?.maxRequests || 100}
                        onChange={val => updateGuard('rateLimit', { maxRequests: val })}
                        min={1}
                        max={1000}
                        step={1}
                        disabled={!editingProfile.guards.rateLimit?.enabled}
                        variant="primary"
                      />
                    </div>
                  </div>
                  <div className={`form-control transition-all duration-200 ${!editingProfile.guards.rateLimit?.enabled ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={!editingProfile.guards.rateLimit?.enabled}>
                    <Input
                      label="Window (seconds)"
                      type="number"
                      value={(editingProfile.guards.rateLimit?.windowMs || 60000) / 1000}
                      onChange={e => {
                        const seconds = Math.max(1, Math.min(3600, parseInt(e.target.value) || 0));
                        updateGuard('rateLimit', { windowMs: seconds * 1000 });
                      }}
                      disabled={!editingProfile.guards.rateLimit?.enabled}
                      min={1}
                      max={3600}
                      placeholder="60"
                      helperText={(() => {
                        const seconds = (editingProfile.guards.rateLimit?.windowMs || 60000) / 1000;
                        if (seconds < 60) return `${seconds} seconds`;
                        if (seconds === 60) return '1 minute';
                        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${seconds % 60}s`;
                        return '1 hour';
                      })()}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Filter */}
            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium flex items-center gap-2 pr-12">
                <AlertTriangle className="w-5 h-5" /> Content Filter
                <div className="ml-auto z-10" onClick={e => e.stopPropagation()}>
                  <Toggle
                    color="error"
                    checked={editingProfile.guards.contentFilter?.enabled || false}
                    onChange={e => updateGuard('contentFilter', { enabled: e.target.checked })}
                  />
                </div>
              </div>
              <div className="collapse-content bg-base-100 pt-4">
                <div className="form-control mb-8">
                  <div className={`pt-2 transition-all duration-200 ${!editingProfile.guards.contentFilter?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <RangeSlider
                      label="Strictness"
                      value={editingProfile.guards.contentFilter?.strictness === 'high' ? 3 : editingProfile.guards.contentFilter?.strictness === 'medium' ? 2 : 1}
                      onChange={(val) => {
                        const level = val === 3 ? 'high' : val === 2 ? 'medium' : 'low';
                        updateGuard('contentFilter', { strictness: level });
                      }}
                      min={1}
                      max={3}
                      step={1}
                      disabled={!editingProfile.guards.contentFilter?.enabled}
                      variant="error"
                      showMarks={true}
                      showValue={false}
                      marks={[
                        { value: 1, label: 'Low' },
                        { value: 2, label: 'Medium' },
                        { value: 3, label: 'High' }
                      ]}
                    />
                  </div>
                </div>

                <div className="form-control mt-4">
                  <label className="label" htmlFor="blocked-terms"><span className="label-text">Blocked Terms</span></label>
                  <CommaSeparatedInput
                    id="blocked-terms"
                    placeholder="e.g. secret, password, confidential"
                    value={editingProfile.guards.contentFilter?.blockedTerms || []}
                    onChange={v => updateGuard('contentFilter', { blockedTerms: v })}
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
