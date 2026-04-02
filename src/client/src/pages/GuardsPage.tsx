import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, RefreshCw, AlertTriangle, Plus, Copy, Trash2, Edit2 } from 'lucide-react';
import { apiService } from '../services/api';
import PageHeader from '../components/DaisyUI/PageHeader';
import Card from '../components/DaisyUI/Card';
import Input from '../components/DaisyUI/Input';
import Button from '../components/DaisyUI/Button';
import Toggle from '../components/DaisyUI/Toggle';
import Select from '../components/DaisyUI/Select';
import { ConfirmModal } from '../components/DaisyUI/Modal';
import FormField from '../components/DaisyUI/FormField';
import RangeSlider from '../components/DaisyUI/RangeSlider';
import { GuardProfile } from '@shared/types/models/security';
import { useToast } from '../components/DaisyUI/ToastNotification';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const guardProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Profile name is required')
    .max(255, 'Name must be 255 characters or fewer'),
  description: z.string().optional(),
  guards: z.object({
    mcpGuard: z.object({
      enabled: z.boolean(),
      type: z.enum(['owner', 'custom']),
      allowedUsers: z.array(z.string()),
      allowedTools: z.array(z.string()),
    }),
    rateLimit: z.object({
      enabled: z.boolean(),
      maxRequests: z.number().int().min(1).max(1000000),
      windowMs: z.number().int().positive(),
    }),
    contentFilter: z.object({
      enabled: z.boolean(),
      strictness: z.enum(['low', 'medium', 'high']),
      blockedTerms: z.array(z.string()),
    }),
  }),
});

type GuardProfileFormValues = z.infer<typeof guardProfileSchema>;

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const defaultGuards: GuardProfileFormValues['guards'] = {
  mcpGuard: { enabled: false, type: 'owner', allowedUsers: [], allowedTools: [] },
  rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
  contentFilter: { enabled: false, strictness: 'medium', blockedTerms: [] },
};

// ---------------------------------------------------------------------------
// CommaSeparatedInput helper
// ---------------------------------------------------------------------------

const CommaSeparatedInput = ({
  value,
  onChange,
  disabled,
  placeholder,
  id,
  validate,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCurrentValue();
    }
  };

  const removeValue = (toRemove: string) => {
    onChange(value.filter((v) => v !== toRemove));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((val) => (
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
        onChange={(e) => {
          setInputValue(e.target.value);
          if (e.target.value.includes(',')) {
            setTimeout(addCurrentValue, 0);
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={addCurrentValue}
        disabled={disabled}
        placeholder={placeholder || 'Type and press Enter or comma...'}
        variant={error ? 'error' : undefined}
      />
      {error && <span className="label-text-alt text-error mt-1">{error}</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// GuardProfileModal – the edit/create modal backed by react-hook-form
// ---------------------------------------------------------------------------

interface GuardProfileModalProps {
  initialData: Partial<GuardProfile>;
  onClose: () => void;
  onSave: (data: GuardProfileFormValues) => void;
  isPending: boolean;
}

const GuardProfileModal: React.FC<GuardProfileModalProps> = ({
  initialData,
  onClose,
  onSave,
  isPending,
}) => {
  const isEditing = !!initialData.id;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GuardProfileFormValues>({
    resolver: zodResolver(guardProfileSchema),
    defaultValues: {
      name: initialData.name ?? '',
      description: initialData.description ?? '',
      guards: initialData.guards
        ? {
            mcpGuard: {
              enabled: initialData.guards.mcpGuard?.enabled ?? false,
              type: initialData.guards.mcpGuard?.type ?? 'owner',
              allowedUsers: initialData.guards.mcpGuard?.allowedUsers ?? [],
              allowedTools: initialData.guards.mcpGuard?.allowedTools ?? [],
            },
            rateLimit: {
              enabled: initialData.guards.rateLimit?.enabled ?? false,
              maxRequests: initialData.guards.rateLimit?.maxRequests ?? 100,
              windowMs: initialData.guards.rateLimit?.windowMs ?? 60000,
            },
            contentFilter: {
              enabled: initialData.guards.contentFilter?.enabled ?? false,
              strictness: initialData.guards.contentFilter?.strictness ?? 'medium',
              blockedTerms: initialData.guards.contentFilter?.blockedTerms ?? [],
            },
          }
        : defaultGuards,
    },
  });

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="guard-modal-title">
      <div className="modal-box w-11/12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 id="guard-modal-title" className="font-bold text-lg">
            {isEditing ? 'Edit Profile' : 'Create Profile'}
          </h3>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="space-y-4">
            {/* Name */}
            <FormField label="Profile Name" error={errors.name} required>
              <Input
                id="guard-name"
                placeholder="e.g. Strict Production"
                {...register('name')}
                variant={errors.name ? 'error' : undefined}
              />
            </FormField>

            {/* Description */}
            <FormField label="Description" error={errors.description}>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Describe what this profile enforces..."
                rows={3}
                {...register('description')}
              />
            </FormField>

            {/* Guards */}
            <div className="divider">Guardrails</div>

            <div className="grid grid-cols-1 gap-6">
              {/* Access Control */}
              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" defaultChecked />
                <div className="collapse-title text-xl font-medium flex items-center gap-2 pr-12">
                  <Shield className="w-5 h-5" /> Access Control
                  <div className="ml-auto z-10" onClick={(e) => e.stopPropagation()}>
                    <Controller
                      name="guards.mcpGuard.enabled"
                      control={control}
                      render={({ field }) => (
                        <Toggle
                          color="primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Type</span>
                    </label>
                    <Controller
                      name="guards.mcpGuard.type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          options={[
                            { value: 'owner', label: 'Owner Only' },
                            { value: 'custom', label: 'Custom Allowed Users' },
                          ]}
                        />
                      )}
                    />
                  </div>

                  <Controller
                    name="guards.mcpGuard"
                    control={control}
                    render={({ field: mcpField }) =>
                      mcpField.value.type === 'custom' ? (
                        <div className="form-control mt-4">
                          <label className="label" htmlFor="allowed-users">
                            <span className="label-text">Allowed User IDs</span>
                          </label>
                          <CommaSeparatedInput
                            id="allowed-users"
                            value={mcpField.value.allowedUsers}
                            onChange={(v) => mcpField.onChange({ ...mcpField.value, allowedUsers: v })}
                            disabled={!mcpField.value.enabled}
                            validate={(item) => {
                              if (!/^[a-zA-Z0-9-_]+$/.test(item)) {
                                return 'User IDs must contain only letters, numbers, dashes, and underscores.';
                              }
                              return null;
                            }}
                          />
                        </div>
                      ) : null
                    }
                  />

                  <div className="form-control mt-4">
                    <label className="label" htmlFor="allowed-tools">
                      <span className="label-text">Allowed Tools</span>
                    </label>
                    <Controller
                      name="guards.mcpGuard"
                      control={control}
                      render={({ field: mcpField }) => (
                        <CommaSeparatedInput
                          id="allowed-tools"
                          placeholder="e.g. calculator, weather"
                          value={mcpField.value.allowedTools}
                          onChange={(v) => mcpField.onChange({ ...mcpField.value, allowedTools: v })}
                          disabled={!mcpField.value.enabled}
                          validate={(item) => {
                            if (!/^[a-zA-Z0-9-_]+$/.test(item)) {
                              return 'Tool names must contain only letters, numbers, dashes, and underscores.';
                            }
                            return null;
                          }}
                        />
                      )}
                    />
                    <label className="label">
                      <span className="label-text-alt opacity-70">
                        Leave empty to allow all tools (if enabled)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Rate Limiter */}
              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title text-xl font-medium flex items-center gap-2 pr-12">
                  <RefreshCw className="w-5 h-5" /> Rate Limiter
                  <div className="ml-auto z-10" onClick={(e) => e.stopPropagation()}>
                    <Controller
                      name="guards.rateLimit.enabled"
                      control={control}
                      render={({ field }) => (
                        <Toggle
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="guards.rateLimit"
                      control={control}
                      render={({ field }) => (
                        <div
                          className={`form-control transition-all duration-200 ${!field.value.enabled ? 'opacity-50 pointer-events-none' : ''}`}
                          aria-disabled={!field.value.enabled}
                        >
                          <div className="pt-2">
                            <RangeSlider
                              label="Max Requests"
                              value={field.value.maxRequests}
                              onChange={(val) => field.onChange({ ...field.value, maxRequests: val })}
                              min={1}
                              max={1000}
                              step={1}
                              disabled={!field.value.enabled}
                              variant="primary"
                            />
                          </div>
                        </div>
                      )}
                    />
                    <Controller
                      name="guards.rateLimit"
                      control={control}
                      render={({ field }) => (
                        <div
                          className={`form-control transition-all duration-200 ${!field.value.enabled ? 'opacity-50 pointer-events-none' : ''}`}
                          aria-disabled={!field.value.enabled}
                        >
                          <Input
                            label="Window (seconds)"
                            type="number"
                            value={field.value.windowMs / 1000}
                            onChange={(e) => {
                              const seconds = Math.max(1, Math.min(3600, parseInt(e.target.value) || 0));
                              field.onChange({ ...field.value, windowMs: seconds * 1000 });
                            }}
                            disabled={!field.value.enabled}
                            min={1}
                            max={3600}
                            placeholder="60"
                            helperText={(() => {
                              const seconds = field.value.windowMs / 1000;
                              if (seconds < 60) return `${seconds} seconds`;
                              if (seconds === 60) return '1 minute';
                              if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${seconds % 60}s`;
                              return '1 hour';
                            })()}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Content Filter */}
              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title text-xl font-medium flex items-center gap-2 pr-12">
                  <AlertTriangle className="w-5 h-5" /> Content Filter
                  <div className="ml-auto z-10" onClick={(e) => e.stopPropagation()}>
                    <Controller
                      name="guards.contentFilter.enabled"
                      control={control}
                      render={({ field }) => (
                        <Toggle
                          color="error"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                  <div className="form-control mb-8">
                    <Controller
                      name="guards.contentFilter"
                      control={control}
                      render={({ field }) => (
                        <div
                          className={`pt-2 transition-all duration-200 ${!field.value.enabled ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <RangeSlider
                            label="Strictness"
                            value={
                              field.value.strictness === 'high'
                                ? 3
                                : field.value.strictness === 'medium'
                                ? 2
                                : 1
                            }
                            onChange={(val) => {
                              const level = val === 3 ? 'high' : val === 2 ? 'medium' : 'low';
                              field.onChange({ ...field.value, strictness: level });
                            }}
                            min={1}
                            max={3}
                            step={1}
                            disabled={!field.value.enabled}
                            variant="error"
                            showMarks={true}
                            showValue={false}
                            marks={[
                              { value: 1, label: 'Low' },
                              { value: 2, label: 'Medium' },
                              { value: 3, label: 'High' },
                            ]}
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div className="form-control mt-4">
                    <label className="label" htmlFor="blocked-terms">
                      <span className="label-text">Blocked Terms</span>
                    </label>
                    <Controller
                      name="guards.contentFilter"
                      control={control}
                      render={({ field }) => (
                        <CommaSeparatedInput
                          id="blocked-terms"
                          placeholder="e.g. secret, password, confidential"
                          value={field.value.blockedTerms}
                          onChange={(v) => field.onChange({ ...field.value, blockedTerms: v })}
                          disabled={!field.value.enabled}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-action">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={isPending}>
              {isPending && (
                <span className="loading loading-spinner loading-sm mr-1" aria-hidden="true" />
              )}
              {isEditing ? 'Save Changes' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// GuardsPage
// ---------------------------------------------------------------------------

const GuardsPage: React.FC = () => {
  const { addToast } = useToast();
  const { showStamp } = useSavedStamp();
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
    mutationFn: async (profile: GuardProfileFormValues) => {
      return apiService.post('/api/admin/guard-profiles', profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-profiles'] });
      showStamp();
      addToast('Profile created successfully', 'success');
      setEditingProfile(null);
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Failed to create profile', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, profile }: { id: string; profile: GuardProfileFormValues }) => {
      return apiService.put(`/api/admin/guard-profiles/${id}`, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-profiles'] });
      showStamp();
      addToast('Profile updated successfully', 'success');
      setEditingProfile(null);
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Failed to update profile', 'error');
    },
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
    },
  });

  const handleDuplicate = (profile: GuardProfile) => {
    setEditingProfile({ ...profile, id: undefined, name: `Copy of ${profile.name}` });
  };

  const confirmDelete = () => {
    if (deleteConfirm?.id) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const handleSave = (data: GuardProfileFormValues) => {
    if (editingProfile?.id) {
      updateMutation.mutate({ id: editingProfile.id, profile: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isMutationPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <PageHeader
        title="Guard Profiles"
        description="Manage security, access, and rate limit policies for your bots."
        actions={
          <Button
            color="primary"
            onClick={() => setEditingProfile({ guards: defaultGuards } as Partial<GuardProfile>)}
          >
            <Plus className="w-4 h-4 mr-2" /> New Profile
          </Button>
        }
      />

      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-base-200 rounded-box">
          <Shield className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-xl font-bold mb-2">No Guard Profiles</h3>
          <p className="text-base-content/70 mb-6">Create your first guard profile to secure your bots.</p>
          <Button
            color="primary"
            onClick={() => setEditingProfile({ guards: defaultGuards } as Partial<GuardProfile>)}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Profile
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
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
                  <div
                    className={`badge ${profile.guards.mcpGuard.enabled ? 'badge-primary badge-outline' : 'badge-ghost'}`}
                  >
                    {profile.guards.mcpGuard.enabled ? profile.guards.mcpGuard.type : 'Disabled'}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 opacity-70" /> Rate Limit
                  </span>
                  <div
                    className={`badge ${profile.guards.rateLimit?.enabled ? 'badge-primary badge-outline' : 'badge-ghost'}`}
                  >
                    {profile.guards.rateLimit?.enabled
                      ? `${profile.guards.rateLimit.maxRequests}/${profile.guards.rateLimit.windowMs / 1000}s`
                      : 'Disabled'}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 opacity-70" /> Content Filter
                  </span>
                  <div
                    className={`badge ${profile.guards.contentFilter?.enabled ? 'badge-error badge-outline' : 'badge-ghost'}`}
                  >
                    {profile.guards.contentFilter?.enabled
                      ? profile.guards.contentFilter.strictness
                      : 'Disabled'}
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
        <GuardProfileModal
          initialData={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSave={handleSave}
          isPending={isMutationPending}
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
