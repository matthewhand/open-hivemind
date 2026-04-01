import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, RefreshCw, AlertTriangle, Plus, Copy, Trash2, Edit2 } from 'lucide-react';
import { apiService } from '../services/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/DaisyUI/Card';
import Input from '../components/DaisyUI/Input';
import Button from '../components/DaisyUI/Button';
import Toggle from '../components/DaisyUI/Toggle';
import Select from '../components/DaisyUI/Select';
import Textarea from '../components/DaisyUI/Textarea';
import ConfirmModal from '../components/DaisyUI/ConfirmModal';
import ModalForm from '../components/DaisyUI/ModalForm';
import { FormField } from '../components/DaisyUI/formTypes';
import RangeSlider from '../components/DaisyUI/RangeSlider';
import { GuardProfile } from '@shared/types/models/security';
import { useToast } from '../components/ToastProvider';

// Custom comma-separated input component
const CommaSeparatedInput = ({
  value,
  onChange,
  disabled,
  placeholder,
  id,
  validate
}: {
  value: string[];
  onChange: (val: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  validate?: (val: string) => string | null;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCurrentValue();
    }
  };

  const addCurrentValue = () => {
    const trimmed = inputValue.trim().replace(/,$/, '');
    if (!trimmed) return;

    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }

    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setError(null);
  };

  const removeValue = (toRemove: string) => {
    onChange(value.filter(v => v !== toRemove));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(val => (
          <div key={val} className="badge badge-primary gap-1 p-3">
            {val}
            {!disabled && (
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle h-4 w-4 min-h-0"
                onClick={() => removeValue(val)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <Input
        id={id}
        value={inputValue}
        onChange={e => {
          setInputValue(e.target.value);
          if (e.target.value.includes(',')) {
            // Trigger add if they paste or type a comma
            setTimeout(addCurrentValue, 0);
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={addCurrentValue}
        disabled={disabled}
        placeholder={placeholder || "Type and press Enter or comma..."}
        variant={error ? 'error' : undefined}
      />
      {error && <span className="label-text-alt text-error mt-1">{error}</span>}
    </div>
  );
};

const defaultNewProfile: Omit<GuardProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  guards: {
    mcpGuard: { enabled: false, type: 'owner', allowedUsers: [], allowedTools: [] },
    rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
    contentFilter: { enabled: false, strictness: 'medium', blockedTerms: [] }
  }
};

const GuardsPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<Partial<GuardProfile> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GuardProfile | null>(null);

  const { data: response, isLoading } = useQuery<{ data: GuardProfile[] }>({
    queryKey: ['guard-profiles'],
    queryFn: () => apiService.get<{ data: GuardProfile[] }>('/api/admin/guard-profiles'),
    staleTime: 30_000,
    gcTime: 60_000,
  });

  const profiles = response?.data || [];

  const createMutation = useMutation({
    mutationFn: async (profile: Partial<GuardProfile>) => {
      return apiService.post('/api/admin/guard-profiles', profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-profiles'] });
      addToast('Profile created successfully', 'success');
      setEditingProfile(null);
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Failed to create profile', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, profile }: { id: string, profile: Partial<GuardProfile> }) => {
      return apiService.put(`/api/admin/guard-profiles/${id}`, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-profiles'] });
      addToast('Profile updated successfully', 'success');
      setEditingProfile(null);
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Failed to update profile', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiService.delete(`/api/admin/guard-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-profiles'] });
      addToast('Profile deleted successfully', 'success');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Failed to delete profile', 'error');
      setDeleteConfirm(null);
    }
  });

  const handleDuplicate = (profile: GuardProfile) => {
    setEditingProfile({
      ...profile,
      id: undefined,
      name: `Copy of ${profile.name}`,
    });
  };

  const confirmDelete = () => {
    if (deleteConfirm?.id) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const handleSaveProfileForm = (formData: Record<string, any>) => {
    if (editingProfile?.id) {
      updateMutation.mutate({ id: editingProfile.id, profile: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getModalFields = (): FormField[] => [
    {
      name: 'name',
      label: 'Profile Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Strict Production',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Describe what this profile enforces...',
    },
    {
      name: 'guards',
      label: '', // Custom component handles its own labels
      type: 'custom',
      render: (guardsValue: any, onChange: (val: any) => void) => {
        const updateGuard = (type: keyof GuardProfile['guards'], data: any) => {
          onChange({
            ...guardsValue,
            [type]: {
              ...guardsValue[type],
              ...data
            }
          });
        };

        return (
          <>
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
                      checked={guardsValue?.mcpGuard?.enabled || false}
                      onChange={e => updateGuard('mcpGuard', { enabled: e.target.checked })}
                    />
                  </div>
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Type</span></label>
                    <Select
                      value={guardsValue?.mcpGuard?.type || 'owner'}
                      onChange={e => updateGuard('mcpGuard', { type: e.target.value })}
                      disabled={!guardsValue?.mcpGuard?.enabled}
                      options={[
                        { value: 'owner', label: 'Owner Only' },
                        { value: 'custom', label: 'Custom Allowed Users' }
                      ]}
                    />
                  </div>
                  {guardsValue?.mcpGuard?.type === 'custom' && (
                    <div className="form-control mt-4">
                      <label className="label" htmlFor="allowed-users"><span className="label-text">Allowed User IDs</span></label>
                      <CommaSeparatedInput
                        id="allowed-users"
                        value={guardsValue?.mcpGuard?.allowedUsers || []}
                        onChange={v => updateGuard('mcpGuard', { allowedUsers: v })}
                        disabled={!guardsValue?.mcpGuard?.enabled}
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
                      value={guardsValue?.mcpGuard?.allowedTools || []}
                      onChange={v => updateGuard('mcpGuard', { allowedTools: v })}
                      disabled={!guardsValue?.mcpGuard?.enabled}
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
                      checked={guardsValue?.rateLimit?.enabled || false}
                      onChange={e => updateGuard('rateLimit', { enabled: e.target.checked })}
                    />
                  </div>
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`form-control transition-all duration-200 ${!guardsValue?.rateLimit?.enabled ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={!guardsValue?.rateLimit?.enabled}>
                      <div className="pt-2">
                        <RangeSlider
                          label="Max Requests"
                          value={guardsValue?.rateLimit?.maxRequests || 100}
                          onChange={val => updateGuard('rateLimit', { maxRequests: val })}
                          min={1}
                          max={1000}
                          step={1}
                          disabled={!guardsValue?.rateLimit?.enabled}
                          variant="primary"
                        />
                      </div>
                    </div>
                    <div className={`form-control transition-all duration-200 ${!guardsValue?.rateLimit?.enabled ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={!guardsValue?.rateLimit?.enabled}>
                      <Input
                        label="Window (seconds)"
                        type="number"
                        value={(guardsValue?.rateLimit?.windowMs || 60000) / 1000}
                        onChange={e => {
                          const seconds = Math.max(1, Math.min(3600, parseInt(e.target.value) || 0));
                          updateGuard('rateLimit', { windowMs: seconds * 1000 });
                        }}
                        disabled={!guardsValue?.rateLimit?.enabled}
                        min={1}
                        max={3600}
                        placeholder="60"
                        helperText={(() => {
                          const seconds = (guardsValue?.rateLimit?.windowMs || 60000) / 1000;
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
                      checked={guardsValue?.contentFilter?.enabled || false}
                      onChange={e => updateGuard('contentFilter', { enabled: e.target.checked })}
                    />
                  </div>
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="form-control mb-8">
                    <div className={`pt-2 transition-all duration-200 ${!guardsValue?.contentFilter?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                      <RangeSlider
                        label="Strictness"
                        value={guardsValue?.contentFilter?.strictness === 'high' ? 3 : guardsValue?.contentFilter?.strictness === 'medium' ? 2 : 1}
                        onChange={(val) => {
                          const level = val === 3 ? 'high' : val === 2 ? 'medium' : 'low';
                          updateGuard('contentFilter', { strictness: level });
                        }}
                        min={1}
                        max={3}
                        step={1}
                        disabled={!guardsValue?.contentFilter?.enabled}
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
                      value={guardsValue?.contentFilter?.blockedTerms || []}
                      onChange={v => updateGuard('contentFilter', { blockedTerms: v })}
                      disabled={!guardsValue?.contentFilter?.enabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      }
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <PageHeader
        title="Guard Profiles"
        description="Manage security, access, and rate limit policies for your bots."
        actions={
          <Button color="primary" onClick={() => setEditingProfile(defaultNewProfile as any)}>
            <Plus className="w-4 h-4 mr-2" /> New Profile
          </Button>
        }
      />

      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-base-200 rounded-box">
          <Shield className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-xl font-bold mb-2">No Guard Profiles</h3>
          <p className="text-base-content/70 mb-6">Create your first guard profile to secure your bots.</p>
          <Button color="primary" onClick={() => setEditingProfile(defaultNewProfile as any)}>
            <Plus className="w-4 h-4 mr-2" /> Create Profile
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <Card key={profile.id} className="hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{profile.name}</h3>
                  <p className="text-sm text-base-content/70 line-clamp-2 min-h-[2.5rem] mt-1">
                    {profile.description || 'No description'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 opacity-70" /> Access Control
                  </span>
                  <div className={`badge ${profile.guards.mcpGuard.enabled ? 'badge-primary badge-outline' : 'badge-ghost'}`}>
                    {profile.guards.mcpGuard.enabled ? profile.guards.mcpGuard.type : 'Disabled'}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 opacity-70" /> Rate Limit
                  </span>
                  <div className={`badge ${profile.guards.rateLimit?.enabled ? 'badge-primary badge-outline' : 'badge-ghost'}`}>
                    {profile.guards.rateLimit?.enabled ? `${profile.guards.rateLimit.maxRequests}/${profile.guards.rateLimit.windowMs / 1000}s` : 'Disabled'}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 opacity-70" /> Content Filter
                  </span>
                  <div className={`badge ${profile.guards.contentFilter?.enabled ? 'badge-error badge-outline' : 'badge-ghost'}`}>
                    {profile.guards.contentFilter?.enabled ? profile.guards.contentFilter.strictness : 'Disabled'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDuplicate(profile)}
                  title="Duplicate Profile"
                  aria-label="Duplicate profile"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingProfile(profile)}
                  title="Edit Profile"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  color="error"
                  onClick={() => setDeleteConfirm(profile)}
                  title="Delete Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editingProfile && (
        <ModalForm
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          title={editingProfile.id ? 'Edit Profile' : 'Create Profile'}
          fields={getModalFields()}
          initialData={editingProfile}
          onSubmit={async (data) => {
            handleSaveProfileForm(data);
          }}
          submitText={editingProfile.id ? 'Save Changes' : 'Create Profile'}
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
