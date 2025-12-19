import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowPathIcon,
    ServerIcon,
    WrenchScrewdriverIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { Alert, Badge, Button, Modal, Loading } from '../DaisyUI';

interface MCPServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    timeout?: number;
    enabled?: boolean;
}

interface MCPServerProfile {
    key: string;
    name: string;
    description?: string;
    servers: MCPServerConfig[];
    category?: string;
    enabled: boolean;
}

const MCPProfileManager: React.FC = () => {
    const [profiles, setProfiles] = useState<MCPServerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<MCPServerProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isNewProfile, setIsNewProfile] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<MCPServerProfile>({
        key: '',
        name: '',
        description: '',
        servers: [],
        category: '',
        enabled: true
    });

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/config/mcp-profiles');
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch MCP profiles');
            }
            const data = await res.json();
            setProfiles(data.profiles || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNewProfile = () => {
        setFormData({
            key: '',
            name: '',
            description: '',
            servers: [],
            category: '',
            enabled: true
        });
        setIsNewProfile(true);
        setIsEditModalOpen(true);
    };

    const handleEditProfile = (profile: MCPServerProfile) => {
        setFormData({ ...profile });
        setSelectedProfile(profile);
        setIsNewProfile(false);
        setIsEditModalOpen(true);
    };

    const handleDeleteProfile = async (key: string) => {
        if (!confirm(`Delete MCP profile "${key}"?`)) return;

        try {
            const res = await fetch(`/api/config/mcp-profiles/${key}`, { method: 'DELETE' });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to delete profile');
            }
            await fetchProfiles();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            const url = isNewProfile
                ? '/api/config/mcp-profiles'
                : `/api/config/mcp-profiles/${selectedProfile?.key}`;
            const method = isNewProfile ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save profile');
            }

            setIsEditModalOpen(false);
            await fetchProfiles();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const addServer = () => {
        setFormData(prev => ({
            ...prev,
            servers: [...prev.servers, { name: '', command: '', args: [], enabled: true }]
        }));
    };

    const updateServer = (index: number, field: keyof MCPServerConfig, value: any) => {
        setFormData(prev => {
            const servers = [...prev.servers];
            servers[index] = { ...servers[index], [field]: value };
            return { ...prev, servers };
        });
    };

    const removeServer = (index: number) => {
        setFormData(prev => ({
            ...prev,
            servers: prev.servers.filter((_, i) => i !== index)
        }));
    };

    const getCategoryColor = (category?: string): string => {
        switch (category) {
            case 'development': return 'badge-primary';
            case 'research': return 'badge-secondary';
            case 'productivity': return 'badge-accent';
            case 'default': return 'badge-ghost';
            default: return 'badge-outline';
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">MCP Server Profiles</h2>
                    <p className="text-base-content/60">
                        Create reusable collections of MCP servers that can be assigned to multiple bots.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchProfiles} startIcon={<ArrowPathIcon className="w-5 h-5" />}>
                        Refresh
                    </Button>
                    <Button variant="primary" onClick={handleNewProfile} startIcon={<PlusIcon className="w-5 h-5" />}>
                        New Profile
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-4">
                    <Alert status="error" message={error} onClose={() => setError(null)} />
                </div>
            )}

            {profiles.length === 0 ? (
                <div className="text-center py-12">
                    <ServerIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                    <h3 className="text-lg font-semibold text-base-content/70">No MCP Profiles</h3>
                    <p className="text-base-content/50 mb-4">
                        Create your first MCP server profile to get started.
                    </p>
                    <Button variant="primary" onClick={handleNewProfile}>
                        Create Profile
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profiles.map(profile => (
                        <div
                            key={profile.key}
                            className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow"
                        >
                            <div className="card-body">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="card-title text-lg">
                                            {profile.name}
                                            {profile.enabled ? (
                                                <CheckCircleIcon className="w-5 h-5 text-success" />
                                            ) : (
                                                <XCircleIcon className="w-5 h-5 text-error" />
                                            )}
                                        </h3>
                                        <code className="text-xs text-base-content/50">{profile.key}</code>
                                    </div>
                                    {profile.category && (
                                        <Badge className={getCategoryColor(profile.category)}>
                                            {profile.category}
                                        </Badge>
                                    )}
                                </div>

                                {profile.description && (
                                    <p className="text-sm text-base-content/70 mt-2">
                                        {profile.description}
                                    </p>
                                )}

                                <div className="mt-4">
                                    <div className="flex items-center gap-2 text-sm text-base-content/60">
                                        <WrenchScrewdriverIcon className="w-4 h-4" />
                                        <span>{profile.servers.length} server(s)</span>
                                    </div>
                                    {profile.servers.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {profile.servers.slice(0, 3).map((server, idx) => (
                                                <div key={idx} className="text-xs bg-base-200 px-2 py-1 rounded">
                                                    {server.name}
                                                </div>
                                            ))}
                                            {profile.servers.length > 3 && (
                                                <div className="text-xs text-base-content/50">
                                                    +{profile.servers.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="card-actions justify-end mt-4">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditProfile(profile)}
                                        startIcon={<PencilIcon className="w-4 h-4" />}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-error"
                                        onClick={() => handleDeleteProfile(profile.key)}
                                        startIcon={<TrashIcon className="w-4 h-4" />}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit/Create Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={isNewProfile ? 'Create MCP Profile' : `Edit: ${selectedProfile?.name}`}
            >
                <div className="space-y-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Key (unique identifier)</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            value={formData.key}
                            onChange={e => setFormData(prev => ({ ...prev, key: e.target.value }))}
                            disabled={!isNewProfile}
                            placeholder="my-tools"
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Name</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="My Tools Profile"
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Description</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered"
                            value={formData.description || ''}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Profile description..."
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Category</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={formData.category || ''}
                            onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        >
                            <option value="">None</option>
                            <option value="default">Default</option>
                            <option value="development">Development</option>
                            <option value="research">Research</option>
                            <option value="productivity">Productivity</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label cursor-pointer">
                            <span className="label-text">Enabled</span>
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={formData.enabled}
                                onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                            />
                        </label>
                    </div>

                    <div className="divider">MCP Servers</div>

                    {formData.servers.map((server, idx) => (
                        <div key={idx} className="card bg-base-200 p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">Server #{idx + 1}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-error"
                                    onClick={() => removeServer(idx)}
                                >
                                    Remove
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    className="input input-bordered input-sm"
                                    placeholder="Name"
                                    value={server.name}
                                    onChange={e => updateServer(idx, 'name', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="input input-bordered input-sm"
                                    placeholder="Command"
                                    value={server.command}
                                    onChange={e => updateServer(idx, 'command', e.target.value)}
                                />
                            </div>
                            <input
                                type="text"
                                className="input input-bordered input-sm mt-2 w-full"
                                placeholder="Args (comma-separated)"
                                value={(server.args || []).join(', ')}
                                onChange={e => updateServer(idx, 'args', e.target.value.split(',').map(s => s.trim()))}
                            />
                        </div>
                    ))}

                    <Button variant="ghost" onClick={addServer} startIcon={<PlusIcon className="w-4 h-4" />}>
                        Add Server
                    </Button>

                    <div className="modal-action">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSaveProfile}
                            disabled={saving || !formData.key || !formData.name}
                        >
                            {saving ? 'Saving...' : 'Save Profile'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MCPProfileManager;
