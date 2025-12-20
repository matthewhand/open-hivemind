import React, { useState, useEffect } from 'react';
import { Button, Modal, Card, Alert, Badge } from '../DaisyUI';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowPathIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

interface ResponseProfile {
    key: string;
    name: string;
    description?: string;
    enabled?: boolean;
    isBuiltIn?: boolean;
    settings: Record<string, number | boolean>;
}

const SETTING_GROUPS = {
    delays: {
        label: 'Delay Settings',
        keys: ['MESSAGE_DELAY_MULTIPLIER', 'MESSAGE_READING_DELAY_MAX_MS', 'MESSAGE_READING_DELAY_PER_CHAR_MS'],
    },
    engagement: {
        label: 'Engagement Settings',
        keys: ['MESSAGE_UNSOLICITED_BASE_CHANCE', 'MESSAGE_ONLY_WHEN_SPOKEN_TO'],
    },
};

const BOOLEAN_KEYS = ['MESSAGE_ONLY_WHEN_SPOKEN_TO'];

const ResponseProfileManager: React.FC = () => {
    const [profiles, setProfiles] = useState<ResponseProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ResponseProfile | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const [formData, setFormData] = useState({
        key: '',
        name: '',
        description: '',
        enabled: true,
        settings: {} as Record<string, number | boolean>,
    });

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/config/response-profiles');
            if (!response.ok) throw new Error('Failed to fetch profiles');
            const data = await response.json();
            setProfiles(data.profiles || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfiles(); }, []);

    const openCreateDialog = () => {
        setEditingProfile(null);
        setFormData({ key: '', name: '', description: '', enabled: true, settings: {} });
        setEditDialogOpen(true);
    };

    const openEditDialog = (profile: ResponseProfile) => {
        setEditingProfile(profile);
        setFormData({
            key: profile.key,
            name: profile.name,
            description: profile.description || '',
            enabled: profile.enabled !== false,
            settings: { ...profile.settings },
        });
        setEditDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const profileData: ResponseProfile = {
                key: formData.key.trim().toLowerCase().replace(/\s+/g, '-'),
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                enabled: formData.enabled,
                settings: formData.settings,
            };

            const method = editingProfile ? 'PUT' : 'POST';
            const url = editingProfile ? `/api/config/response-profiles/${editingProfile.key}` : '/api/config/response-profiles';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Operation failed');
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
            const response = await fetch(`/api/config/response-profiles/${key}`, { method: 'DELETE' });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Delete failed');
            }
            setToastMessage('Profile deleted');
            setToastType('success');
            fetchProfiles();
        } catch (err) {
            setToastMessage(err instanceof Error ? err.message : 'Delete failed');
            setToastType('error');
        }
    };

    const updateSetting = (key: string, value: number | boolean) => {
        setFormData(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-[200px]"><span className="loading loading-spinner loading-lg"></span></div>;
    }

    return (
        <Card title="Engagement Profiles" className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <ClockIcon className="w-7 h-7" />
                    <h2 className="text-2xl font-bold">Engagement Profiles</h2>
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
                            <h3 className="card-title">
                                {profile.name}
                                {profile.isBuiltIn && <Badge variant="warning" className="ml-2">Built-in</Badge>}
                            </h3>
                            <p className="text-sm text-base-content/70">{profile.description || 'No description'}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <Badge variant={profile.enabled !== false ? 'success' : 'secondary'}>
                                    {profile.enabled !== false ? 'Enabled' : 'Disabled'}
                                </Badge>
                                <Badge variant="neutral">{Object.keys(profile.settings).length} settings</Badge>
                            </div>
                            <div className="card-actions justify-end mt-4">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(profile)}><PencilIcon className="w-4 h-4" /></Button>
                                {!profile.isBuiltIn && (
                                    <Button variant="ghost" size="sm" className="text-error" onClick={() => handleDelete(profile.key)}><TrashIcon className="w-4 h-4" /></Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={editDialogOpen} onClose={() => setEditDialogOpen(false)} title={editingProfile ? 'Edit Engagement Profile' : 'Create Engagement Profile'}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Key</span></label>
                            <input type="text" className="input input-bordered" value={formData.key} onChange={e => setFormData({ ...formData, key: e.target.value })} disabled={!!editingProfile} placeholder="my-profile" />
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Name</span></label>
                            <input type="text" className="input input-bordered" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Description</span></label>
                        <textarea className="textarea textarea-bordered" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="form-control">
                        <label className="label cursor-pointer">
                            <span className="label-text">Enabled</span>
                            <input type="checkbox" className="toggle toggle-primary" checked={formData.enabled} onChange={e => setFormData({ ...formData, enabled: e.target.checked })} />
                        </label>
                    </div>

                    {Object.entries(SETTING_GROUPS).map(([groupKey, group]) => (
                        <div key={groupKey} className="collapse collapse-arrow bg-base-300">
                            <input type="checkbox" defaultChecked />
                            <div className="collapse-title font-medium">{group.label}</div>
                            <div className="collapse-content">
                                <div className="grid grid-cols-2 gap-3">
                                    {group.keys.map(key => (
                                        <div key={key} className="form-control">
                                            <label className="label py-1"><span className="label-text text-xs">{key.replace('MESSAGE_', '').replace(/_/g, ' ')}</span></label>
                                            {BOOLEAN_KEYS.includes(key) ? (
                                                <input type="checkbox" className="toggle toggle-sm" checked={formData.settings[key] === true} onChange={e => updateSetting(key, e.target.checked)} />
                                            ) : (
                                                <input type="number" className="input input-bordered input-sm" value={formData.settings[key] as number || ''} onChange={e => updateSetting(key, parseFloat(e.target.value) || 0)} placeholder="(default)" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="modal-action">
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save</Button>
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

export default ResponseProfileManager;
