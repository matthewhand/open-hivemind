/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, RefreshCw, AlertCircle, Save, X, Settings, AlertTriangle, Copy, ToggleLeft } from 'lucide-react';
import { apiService } from '../services/api';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import ModalForm from '../components/DaisyUI/ModalForm';
import type { FormField } from '../components/DaisyUI/formTypes';
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
import useUrlParams from '../hooks/useUrlParams';
import { useBulkSelection } from '../hooks/useBulkSelection';
import BulkActionBar from '../components/BulkActionBar';
import Badge from '../components/DaisyUI/Badge';

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

  const handleSaveProfile = async (formData: Record<string, any>) => {
    try {
      setSaving(true);

      const profileToSave: GuardrailProfile = {
        id: editingProfile?.id || '',
        name: formData.name.trim(),
        description: formData.description,
        guards: {
          mcpGuard: {
            enabled: formData.mcpGuardEnabled,
            type: formData.mcpGuardType,
            allowedUsers: (formData.mcpGuardAllowedUsers || []).map((s: string) => s.trim()).filter(Boolean),
            allowedTools: (formData.mcpGuardAllowedTools || []).map((s: string) => s.trim()).filter(Boolean),
          },
          rateLimit: {
            enabled: formData.rateLimitEnabled,
            maxRequests: formData.rateLimitMaxRequests,
            windowMs: formData.rateLimitWindowSeconds * 1000,
          },
          contentFilter: {
            enabled: formData.contentFilterEnabled,
            strictness: formData.contentFilterStrictness,
            blockedTerms: (formData.contentFilterBlockedTerms || []).map((s: string) => s.trim()).filter(Boolean),
          },
        },
      };

      const url = isNew ? `${API_BASE}/guard-profiles` : `${API_BASE}/guard-profiles/${editingProfile?.id}`;
      const method = isNew ? 'POST' : 'PUT';

      if (method === 'POST') {
        await apiService.post(url, profileToSave);
      } else {
        await apiService.put(url, profileToSave);
      }

      showSuccess(`Profile ${isNew ? 'created' : 'updated'} successfully`);
      setEditingProfile(null);
      fetchProfiles();
    } catch (err: any) {
      showError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const flattenProfile = (profile: GuardrailProfile | null) => {
    if (!profile) return {};
    return {
      name: profile.name,
      description: profile.description || '',
      mcpGuardEnabled: profile.guards.mcpGuard?.enabled || false,
      mcpGuardType: profile.guards.mcpGuard?.type || 'owner',
      mcpGuardAllowedUsers: profile.guards.mcpGuard?.allowedUsers || [],
      mcpGuardAllowedTools: profile.guards.mcpGuard?.allowedTools || [],
      rateLimitEnabled: profile.guards.rateLimit?.enabled || false,
      rateLimitMaxRequests: profile.guards.rateLimit?.maxRequests || 100,
      rateLimitWindowSeconds: (profile.guards.rateLimit?.windowMs || 60000) / 1000,
      contentFilterEnabled: profile.guards.contentFilter?.enabled || false,
      contentFilterStrictness: profile.guards.contentFilter?.strictness || 'low',
      contentFilterBlockedTerms: profile.guards.contentFilter?.blockedTerms || [],
    };
  };

  const modalFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Profile Name',
      type: 'text',
      placeholder: 'e.g. Strict Production',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe what this profile enforces...',
    },
    {
      name: 'mcpGuardEnabled',
      label: 'Enable Access Control',
      type: 'checkbox',
    },
    {
      name: 'mcpGuardType',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'owner', label: 'Owner Only' },
        { value: 'custom', label: 'Custom Allowed Users' },
      ],
    },
    {
      name: 'mcpGuardAllowedUsers',
      label: 'Allowed User IDs',
      type: 'custom',
      render: ({ value, onChange, disabled }) => (
        <CommaSeparatedInput
          id="allowed-users"
          value={value || []}
          onChange={onChange}
          disabled={disabled}
          validate={item => {
            if (!/^[a-zA-Z0-9-_]+$/.test(item)) {
              return "User IDs must contain only letters, numbers, dashes, and underscores.";
            }
            return null;
          }}
        />
      ),
    },
    {
      name: 'mcpGuardAllowedTools',
      label: 'Allowed Tools',
      type: 'custom',
      helperText: 'Leave empty to allow all tools (if enabled)',
      render: ({ value, onChange, disabled }) => (
        <CommaSeparatedInput
          id="allowed-tools"
          placeholder="e.g. calculator, weather"
          value={value || []}
          onChange={onChange}
          disabled={disabled}
          validate={item => {
            if (!/^[a-zA-Z0-9-_]+$/.test(item)) {
              return "Tool names must contain only letters, numbers, dashes, and underscores.";
            }
            return null;
          }}
        />
      ),
    },
    {
      name: 'rateLimitEnabled',
      label: 'Enable Rate Limiter',
      type: 'checkbox',
    },
    {
      name: 'rateLimitMaxRequests',
      label: 'Max Requests',
      type: 'number',
    },
    {
      name: 'rateLimitWindowSeconds',
      label: 'Window (seconds)',
      type: 'number',
    },
    {
      name: 'contentFilterEnabled',
      label: 'Enable Content Filter',
      type: 'checkbox',
    },
    {
      name: 'contentFilterStrictness',
      label: 'Strictness',
      type: 'radio',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    },
    {
      name: 'contentFilterBlockedTerms',
      label: 'Blocked Terms',
      type: 'custom',
      render: ({ value, onChange, disabled }) => (
        <CommaSeparatedInput
          id="blocked-terms"
          placeholder="e.g. secret, password, confidential"
          value={value || []}
          onChange={onChange}
          disabled={disabled}
        />
      ),
    },
  ];

  const modalFormSteps = [
    {
      title: 'General',
      description: 'Basic profile information',
      fields: ['name', 'description'],
    },
    {
      title: 'Access Control',
      description: 'Manage who can use specific tools',
      fields: ['mcpGuardEnabled', 'mcpGuardType', 'mcpGuardAllowedUsers', 'mcpGuardAllowedTools'],
    },
    {
      title: 'Rate Limit',
      description: 'Control request frequency',
      fields: ['rateLimitEnabled', 'rateLimitMaxRequests', 'rateLimitWindowSeconds'],
    },
    {
      title: 'Content Filter',
      description: 'Block specific terms and control strictness',
      fields: ['contentFilterEnabled', 'contentFilterStrictness', 'contentFilterBlockedTerms'],
    },
  ];

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
            <input
              type="checkbox"
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
                    <input
                      type="checkbox"
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
        <ModalForm
          isOpen={!!editingProfile}
          onClose={() => setEditingProfile(null)}
          title={isNew ? 'Create Guard Profile' : 'Edit Guard Profile'}
          size="lg"
          fields={modalFormFields}
          steps={modalFormSteps}
          initialData={flattenProfile(editingProfile)}
          onSubmit={handleSaveProfile}
          submitText={isNew ? 'Create Profile' : 'Save Changes'}
          loading={saving}
        />
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
