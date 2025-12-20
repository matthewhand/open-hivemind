import React, { useState, useEffect } from 'react';
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
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

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
            if (!response.ok) throw new Error('Failed to fetch guardrail profiles');
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

            const method = editingProfile ? 'PUT' : 'POST';
            const url = editingProfile
                ? `/api/config/guardrails`
                : '/api/config/guardrails';

            if (editingProfile) {
                // For PUT, we need to update entire profiles array
                const updated = profiles.map(p => p.key === editingProfile.key ? profileData : p);
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profiles: updated }),
                });
                if (!response.ok) throw new Error('Failed to update profile');
            } else {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData),
                });
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to create profile');
                }
            }

            setSnackbar({ open: true, message: `Profile ${editingProfile ? 'updated' : 'created'} successfully`, severity: 'success' });
            setEditDialogOpen(false);
            fetchProfiles();
        } catch (err) {
            setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Operation failed', severity: 'error' });
        }
    };

    const handleDelete = async (key: string) => {
        if (!confirm(`Delete profile "${key}"?`)) return;
        try {
            const response = await fetch(`/api/config/guardrails/${key}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete profile');
            setSnackbar({ open: true, message: 'Profile deleted', severity: 'success' });
            fetchProfiles();
        } catch (err) {
            setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Delete failed', severity: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ShieldCheckIcon className="w-7 h-7" />
                    Guardrail Profiles
                </h2>
                <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={fetchProfiles}>
                        <ArrowPathIcon className="w-5 h-5 mr-2" />Refresh
                    </button>
                    <button className="btn btn-primary" onClick={openCreateDialog}>
                        <PlusIcon className="w-5 h-5 mr-2" />Add Profile
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map(profile => (
                    <div key={profile.key} className="card bg-base-200 shadow-sm">
                        <div className="card-body">
                            <h3 className="card-title">{profile.name}</h3>
                            <p className="text-sm text-base-content/70">{profile.description || 'No description'}</p>
                            <div className="flex gap-2 mt-2">
                                <div className={`badge ${profile.mcpGuard.enabled ? 'badge-success' : 'badge-ghost'}`}>
                                    {profile.mcpGuard.enabled ? 'Enabled' : 'Disabled'}
                                </div>
                                <div className="badge badge-outline">{profile.mcpGuard.type}</div>
                            </div>
                            <div className="card-actions justify-end mt-4">
                                <button className="btn btn-ghost btn-sm" onClick={() => openEditDialog(profile)}>
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(profile.key)}>
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editDialogOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">{editingProfile ? 'Edit' : 'Create'} Guardrail Profile</h3>
                        <div className="py-4 space-y-4">
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
                        </div>
                        <div className="modal-action">
                            <button className="btn" onClick={() => setEditDialogOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {snackbar.open && (
                <div className="toast toast-bottom toast-center z-50">
                    <div className={`alert ${snackbar.severity === 'success' ? 'alert-success' : 'alert-error'}`}>
                        <span>{snackbar.message}</span>
                        <button className="btn btn-sm btn-ghost" onClick={() => setSnackbar({ ...snackbar, open: false })}>✕</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuardrailProfileManager;
