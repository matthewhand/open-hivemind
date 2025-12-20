import React, { useState, useEffect } from 'react';
import { Button, Modal, Card, Alert, Badge } from '../DaisyUI';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowPathIcon,
    CpuChipIcon,
} from '@heroicons/react/24/outline';

interface ProviderProfile {
    key: string;
    name?: string;
    description?: string;
    provider: string;
    config: Record<string, unknown>;
}

const LLM_PROVIDERS = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'];

const LlmProfileManager: React.FC = () => {
    const [profiles, setProfiles] = useState<ProviderProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ProviderProfile | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const [formData, setFormData] = useState({
        key: '',
        name: '',
        description: '',
        provider: 'openai',
        configJson: '{}',
    });

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/config/llm-profiles');
            if (!response.ok) throw new Error('Failed to fetch profiles');
            const data = await response.json();
            setProfiles(data.profiles?.llm || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfiles(); }, []);

    const openCreateDialog = () => {
        setEditingProfile(null);
        setFormData({ key: '', name: '', description: '', provider: 'openai', configJson: '{}' });
        setEditDialogOpen(true);
    };

    const openEditDialog = (profile: ProviderProfile) => {
        setEditingProfile(profile);
        setFormData({
            key: profile.key,
            name: profile.name || '',
            description: profile.description || '',
            provider: profile.provider,
            configJson: JSON.stringify(profile.config || {}, null, 2),
        });
        setEditDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            let config: Record<string, unknown>;
            try {
                config = JSON.parse(formData.configJson);
            } catch {
                throw new Error('Invalid JSON in config');
            }

            const profileData: ProviderProfile = {
                key: formData.key.trim().toLowerCase().replace(/\s+/g, '-'),
                name: formData.name.trim() || undefined,
                description: formData.description.trim() || undefined,
                provider: formData.provider,
                config,
            };

            if (editingProfile) {
                const allProfiles = profiles.map(p => p.key === editingProfile.key ? profileData : p);
                const response = await fetch('/api/config/llm-profiles', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profiles: { llm: allProfiles } }),
                });
                if (!response.ok) throw new Error('Failed to update profile');
            } else {
                const response = await fetch('/api/config/llm-profiles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData),
                });
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to create profile');
                }
            }

            setToastMessage(`Profile ${editingProfile ? 'updated' : 'created'}`);
            setToastType('success');
            setEditDialogOpen(false);
            fetchProfiles();
        } catch (err) {
            setToastMessage(err instanceof Error ? err.message : 'Operation failed');
            setToastType('error');
        }
    };

    const handleDelete = async (key: string) => {
        if (!confirm(`Delete profile "${key}"?`)) return;
        try {
            const response = await fetch(`/api/config/llm-profiles/${key}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete profile');
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
        <Card title="LLM Profiles" className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <CpuChipIcon className="w-7 h-7" />
                    <h2 className="text-2xl font-bold">LLM Profiles</h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchProfiles} startIcon={<ArrowPathIcon className="w-5 h-5" />}>Refresh</Button>
                    <Button variant="primary" onClick={openCreateDialog} startIcon={<PlusIcon className="w-5 h-5" />}>Add Profile</Button>
                </div>
            </div>

            {error && <Alert status="error" message={error} onClose={() => setError(null)} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map(profile => (
                    <Card key={profile.key} className="bg-base-200 shadow-sm">
                        <div className="card-body">
                            <h3 className="card-title">{profile.name || profile.key}</h3>
                            <p className="text-sm text-base-content/70">{profile.description || 'No description'}</p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="primary">{profile.provider}</Badge>
                                <Badge variant="neutral">{Object.keys(profile.config || {}).length} config keys</Badge>
                            </div>
                            <div className="card-actions justify-end mt-4">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(profile)}><PencilIcon className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" className="text-error" onClick={() => handleDelete(profile.key)}><TrashIcon className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {profiles.length === 0 && !error && (
                <div className="text-center py-12 text-base-content/70">
                    <CpuChipIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No LLM profiles yet. Create one to get started.</p>
                </div>
            )}

            <Modal isOpen={editDialogOpen} onClose={() => setEditDialogOpen(false)} title={editingProfile ? 'Edit LLM Profile' : 'Create LLM Profile'}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Key</span></label>
                            <input type="text" className="input input-bordered" value={formData.key} onChange={e => setFormData({ ...formData, key: e.target.value })} disabled={!!editingProfile} placeholder="my-profile" />
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Provider</span></label>
                            <select className="select select-bordered" value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })}>
                                {LLM_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Name</span></label>
                        <input type="text" className="input input-bordered" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Friendly name" />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Description</span></label>
                        <textarea className="textarea textarea-bordered" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Configuration (JSON)</span></label>
                        <textarea className="textarea textarea-bordered font-mono text-sm" rows={8} value={formData.configJson} onChange={e => setFormData({ ...formData, configJson: e.target.value })} placeholder='{"model": "gpt-4", "temperature": 0.7}' />
                        <label className="label"><span className="label-text-alt">Provider-specific settings (model, temperature, etc.)</span></label>
                    </div>
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

export default LlmProfileManager;
