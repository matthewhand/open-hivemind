import React, { useState, useEffect } from 'react';
import { Badge, Alert, Loading, Button, Modal } from '../DaisyUI';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    ArrowPathIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

interface LlmProfile {
    key: string;
    name: string;
    description?: string;
    provider: string;
    config: Record<string, any>;
}

const LlmProfileManager: React.FC = () => {
    const [profiles, setProfiles] = useState<LlmProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState<LlmProfile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [formKey, setFormKey] = useState('');
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formProvider, setFormProvider] = useState('openai');
    const [formConfigJson, setFormConfigJson] = useState('{}');

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/config/llm-profiles');
            if (!res.ok) throw new Error('Failed to fetch LLM profiles');
            const data = await res.json();
            setProfiles(data.profiles?.llm || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (profile: LlmProfile) => {
        setEditingProfile(profile);
        setFormKey(profile.key);
        setFormName(profile.name);
        setFormDescription(profile.description || '');
        setFormProvider(profile.provider);
        setFormConfigJson(JSON.stringify(profile.config, null, 2));
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingProfile(null);
        setFormKey('');
        setFormName('');
        setFormDescription('');
        setFormProvider('openai');
        setFormConfigJson('{\n  "apiKey": "",\n  "model": "gpt-4"\n}');
        setIsModalOpen(true);
    };

    const handleDelete = async (key: string) => {
        if (!confirm(`Are you sure you want to delete profile "${key}"?`)) return;

        // Filter out the deleted profile
        const updatedProfiles = profiles.filter(p => p.key !== key);
        await saveProfiles(updatedProfiles);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            let configObj = {};
            try {
                configObj = JSON.parse(formConfigJson);
            } catch (e) {
                alert('Invalid JSON in Configuration field');
                setSaving(false);
                return;
            }

            const newProfile: LlmProfile = {
                key: formKey,
                name: formName,
                description: formDescription,
                provider: formProvider,
                config: configObj
            };

            let updatedProfiles = [...profiles];
            if (editingProfile) {
                // Update existing
                updatedProfiles = updatedProfiles.map(p => p.key === editingProfile.key ? newProfile : p);
            } else {
                // Add new (check for duplicates)
                if (profiles.some(p => p.key === newProfile.key)) {
                    alert('A profile with this key already exists');
                    setSaving(false);
                    return;
                }
                updatedProfiles.push(newProfile);
            }

            await saveProfiles(updatedProfiles);
            setIsModalOpen(false);
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const saveProfiles = async (newProfiles: LlmProfile[]) => {
        try {
            const res = await fetch('/api/config/llm-profiles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profiles: { llm: newProfiles } })
            });
            if (!res.ok) throw new Error('Failed to save profiles');
            await fetchProfiles();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">LLM Profiles</h2>
                    <p className="text-base-content/60">Manage reusable templates for LLM providers.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchProfiles} startIcon={<ArrowPathIcon className="w-5 h-5" />}>Refresh</Button>
                    <Button variant="primary" onClick={handleCreate} startIcon={<PlusIcon className="w-5 h-5" />}>Create Profile</Button>
                </div>
            </div>

            {error && (
                <div className="mb-4">
                    <Alert status="error" message={error} onClose={() => setError(null)} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map(profile => (
                    <div key={profile.key} className="card bg-base-100 shadow-xl border border-base-200">
                        <div className="card-body">
                            <div className="flex justify-between items-start">
                                <h3 className="card-title">{profile.name}</h3>
                                <Badge variant="secondary">{profile.provider}</Badge>
                            </div>
                            <p className="text-sm text-base-content/70 font-mono bg-base-200 p-1 rounded w-fit px-2">{profile.key}</p>
                            {profile.description && <p className="text-sm truncate">{profile.description}</p>}

                            <div className="card-actions justify-end mt-4">
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(profile)} startIcon={<PencilIcon className="w-4 h-4" />}>Edit</Button>
                                <Button size="sm" className="text-error" variant="ghost" onClick={() => handleDelete(profile.key)} startIcon={<TrashIcon className="w-4 h-4" />}>Delete</Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProfile ? 'Edit Profile' : 'Create Profile'}
            >
                <div className="flex flex-col gap-4">
                    <div className="form-control">
                        <label className="label"><span className="label-text">Profile Key</span></label>
                        <input
                            type="text"
                            className="input input-bordered"
                            value={formKey}
                            onChange={e => setFormKey(e.target.value)}
                            disabled={!!editingProfile}
                            placeholder="e.g. openai-gpt4"
                        />
                        <label className="label"><span className="label-text-alt">Unique identifier for this profile</span></label>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Name</span></label>
                        <input
                            type="text"
                            className="input input-bordered"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            placeholder="e.g. GPT-4 Production"
                        />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Description</span></label>
                        <input
                            type="text"
                            className="input input-bordered"
                            value={formDescription}
                            onChange={e => setFormDescription(e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Provider</span></label>
                        <select className="select select-bordered" value={formProvider} onChange={e => setFormProvider(e.target.value)}>
                            <option value="openai">OpenAI</option>
                            <option value="flowise">Flowise</option>
                            <option value="openwebui">OpenWebUI</option>
                            <option value="openswarm">OpenSwarm</option>
                            <option value="perplexity">Perplexity</option>
                            <option value="replicate">Replicate</option>
                            <option value="n8n">n8n</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Configuration (JSON)</span></label>
                        <textarea
                            className="textarea textarea-bordered h-40 font-mono text-xs"
                            value={formConfigJson}
                            onChange={e => setFormConfigJson(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="modal-action">
                        <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>Save</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LlmProfileManager;
