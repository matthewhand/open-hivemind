/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, RefreshCw, AlertCircle, Save, X, Settings, AlertTriangle, Copy, Tag } from 'lucide-react';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import { Input } from '../components/DaisyUI/Input';

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

/**
 * CommaSeparatedInput - Enhanced input with chip-style display, validation, and real-time feedback
 */
interface CommaSeparatedInputProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  validate?: (item: string) => { valid: boolean; message?: string };
  maxItems?: number;
  label?: string;
  helperText?: string;
}

const CommaSeparatedInput: React.FC<CommaSeparatedInputProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Add items...',
  validate,
  maxItems = 100,
  label,
  helperText,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  const validationResults = useMemo(() => {
    if (!validate) return new Map<string, { valid: boolean; message?: string }>();
    const results = new Map<string, { valid: boolean; message?: string }>();
    value.forEach(item => {
      if (item.trim()) {
        results.set(item, validate(item.trim()));
      }
    });
    return results;
  }, [value, validate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Parse current input and merge with existing values
    const currentItems = newValue.split(',').map(s => s.trim()).filter(Boolean);
    const newItems = [...value];
    let hasChanges = false;

    currentItems.forEach(item => {
      if (!newItems.includes(item) && newItems.length < maxItems) {
        newItems.push(item);
        hasChanges = true;
      }
    });

    // If comma was typed, clear input and update values
    if (newValue.includes(',')) {
      setInputValue('');
      if (hasChanges) {
        onChange(newItems);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim()) && value.length < maxItems) {
        onChange([...value, inputValue.trim()]);
        setInputValue('');
        setShowValidation(true);
      }
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeItem = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const hasInvalidItems = Array.from(validationResults.values()).some(r => !r.valid);

  return (
    <div className="form-control">
      {label && (
        <label className="label" htmlFor={id}>
          <span className="label-text">{label}</span>
          <span className="badge badge-sm badge-ghost">{value.length}{maxItems ? `/${maxItems}` : ''}</span>
        </label>
      )}
      <div className={`input input-bordered flex flex-wrap gap-2 p-2 min-h-[3rem] items-center ${hasInvalidItems ? 'input-error' : ''} ${disabled ? 'input-disabled' : ''}`}>
        {value.map((item, index) => {
          const validation = validationResults.get(item);
          const isInvalid = validation && !validation.valid;
          return (
            <span
              key={`${item}-${index}`}
              className={`badge badge-sm gap-1 ${isInvalid ? 'badge-error' : 'badge-primary'} ${disabled ? 'opacity-50' : ''}`}
              title={validation?.message}
            >
              <Tag className="w-3 h-3" />
              {item}
              {!disabled && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost btn-square p-0"
                  onClick={() => removeItem(index)}
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
        <input
          id={id}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setShowValidation(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
        />
      </div>
      {helperText && (
        <label className="label">
          <span className="label-text-alt opacity-70">{helperText}</span>
        </label>
      )}
      {showValidation && hasInvalidItems && (
        <div className="alert alert-error alert-sm mt-2">
          <AlertCircle className="w-4 h-4" />
          <span>Some items have validation errors. Hover over items for details.</span>
        </div>
      )}
    </div>
  );
};

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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileToSave),
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
                  <div className="mt-4">
                    <CommaSeparatedInput
                      id="allowed-users"
                      value={editingProfile.guards.mcpGuard.allowedUsers || []}
                      onChange={(value) => updateGuard('mcpGuard', { allowedUsers: value })}
                      disabled={!editingProfile.guards.mcpGuard.enabled}
                      placeholder="user1, user2..."
                      label="Allowed User IDs"
                      maxItems={50}
                      validate={(item) => {
                        const trimmed = item.trim();
                        if (!trimmed) return { valid: false, message: 'Empty value' };
                        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
                          return { valid: false, message: 'Only alphanumeric, underscore, and hyphen allowed' };
                        }
                        return { valid: true };
                      }}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <CommaSeparatedInput
                    id="allowed-tools"
                    value={editingProfile.guards.mcpGuard.allowedTools || []}
                    onChange={(value) => updateGuard('mcpGuard', { allowedTools: value })}
                    disabled={!editingProfile.guards.mcpGuard.enabled}
                    placeholder="calculator, weather, search..."
                    label="Allowed Tools"
                    maxItems={100}
                    helperText="Leave empty to allow all tools (if enabled)"
                  />
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
                  <div className={`form-control transition-all duration-200 ${!editingProfile.guards.rateLimit?.enabled ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={!editingProfile.guards.rateLimit?.enabled}>
                    <Input
                      type="number"
                      label={
                        <div className="flex items-center justify-between w-full">
                          <span>Max Requests</span>
                          {!editingProfile.guards.rateLimit?.enabled && (
                            <span className="badge badge-sm border-base-300">Disabled</span>
                          )}
                        </div>
                      }
                      value={editingProfile.guards.rateLimit?.maxRequests || 100}
                      onChange={e => updateGuard('rateLimit', { maxRequests: parseInt(e.target.value) })}
                      disabled={!editingProfile.guards.rateLimit?.enabled}
                      aria-label="Max Requests"
                    />
                  </div>
                  <div className={`form-control transition-all duration-200 ${!editingProfile.guards.rateLimit?.enabled ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={!editingProfile.guards.rateLimit?.enabled}>
                    <Input
                      type="number"
                      label={
                        <div className="flex items-center justify-between w-full">
                          <span>Window (seconds)</span>
                          <div className="flex items-center gap-2">
                            <span className="label-text-alt text-info" title="Time period for counting requests">
                              Max 1 hour (3600s)
                            </span>
                            {!editingProfile.guards.rateLimit?.enabled && (
                              <span className="badge badge-sm border-base-300">Disabled</span>
                            )}
                          </div>
                        </div>
                      }
                      value={(editingProfile.guards.rateLimit?.windowMs || 60000) / 1000}
                      onChange={e => {
                        const seconds = Math.max(1, Math.min(3600, parseInt(e.target.value) || 0));
                        updateGuard('rateLimit', { windowMs: seconds * 1000 });
                      }}
                      disabled={!editingProfile.guards.rateLimit?.enabled}
                      min={1}
                      max={3600}
                      placeholder="60"
                      helperText={
                        (() => {
                          const seconds = (editingProfile.guards.rateLimit?.windowMs || 60000) / 1000;
                          if (seconds < 60) return `${seconds} seconds`;
                          if (seconds === 60) return '1 minute';
                          if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${seconds % 60}s`;
                          return '1 hour';
                        })()
                      }
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

                <div className="mt-4">
                  <CommaSeparatedInput
                    id="blocked-terms"
                    value={editingProfile.guards.contentFilter?.blockedTerms || []}
                    onChange={(value) => updateGuard('contentFilter', { blockedTerms: value })}
                    disabled={!editingProfile.guards.contentFilter?.enabled}
                    placeholder="secret, password, confidential..."
                    label="Blocked Terms"
                    maxItems={100}
                    validate={(item) => {
                      const trimmed = item.trim();
                      if (!trimmed) return { valid: false, message: 'Empty term' };
                      if (trimmed.length < 2) {
                        return { valid: false, message: 'Term must be at least 2 characters' };
                      }
                      return { valid: true };
                    }}
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
