import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Plus, Edit2, Trash2, Shield, RefreshCw, Info, AlertTriangle, Cpu, Search, Eye } from 'lucide-react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Input,
    Modal,
    PageHeader,
    StatsCards,
    LoadingSpinner,
    EmptyState,
    ToastNotification,
} from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import type { MemoryProfile, Bot } from '../services/api';
import { apiService } from '../services/api';

// Extend UI MemoryProfile type to include assigned bots for display
interface UIMemoryProfile extends MemoryProfile {
    assignedBotNames: string[];
    assignedBotIds: string[];
}

const providerOptions = [
    { value: 'all', label: 'All Providers' },
    { value: 'mem0', label: 'Mem0' },
    { value: 'mem4ai', label: 'mem4ai' },
    { value: 'memvault', label: 'MemVault' },
];

const MemoryPage: React.FC = () => {
    const [bots, setBots] = useState<Bot[]>([]);
    const [profiles, setProfiles] = useState<UIMemoryProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const successToast = ToastNotification.useSuccessToast();
    const errorToast = ToastNotification.useErrorToast();

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<string>('all');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingProfile, setDeletingProfile] = useState<UIMemoryProfile | null>(null);
    const [editingProfile, setEditingProfile] = useState<UIMemoryProfile | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);

    // Form State
    const [profileName, setProfileName] = useState('');
    const [profileProvider, setProfileProvider] = useState<MemoryProfile['provider']>('mem0');
    const [profileApiKey, setProfileApiKey] = useState('');
    const [profileEndpoint, setProfileEndpoint] = useState('');
    const [profileNamespace, setProfileNamespace] = useState('');
    const [profileTtl, setProfileTtl] = useState(0);
    const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);

    // Testing State
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [configResponse, memoryResponse] = await Promise.all([
                apiService.getConfig(),
                apiService.getMemoryProfiles(),
            ]);

            const botList = configResponse.bots || [];
            const filledBots = botList.map((b: any) => ({
                ...b,
                id: b.id || b.name,
            }));
            setBots(filledBots);

            const mappedProfiles = memoryResponse.map((p: MemoryProfile) => {
                const assigned = filledBots.filter((b: any) => b.memoryProfile === p.id);
                return {
                    ...p,
                    assignedBotNames: assigned.map((b: any) => b.name),
                    assignedBotIds: assigned.map((b: any) => b.id),
                };
            });

            setProfiles(mappedProfiles);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch data';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derive filtered profiles
    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesProvider = selectedProvider === 'all' || p.provider === selectedProvider;
            return matchesSearch && matchesProvider;
        });
    }, [profiles, searchQuery, selectedProvider]);

    const handleSaveProfile = async () => {
        if (!profileName.trim()) { return; }

        setLoading(true);
        try {
            let savedProfile: MemoryProfile;

            const profileData: Partial<MemoryProfile> = {
                name: profileName,
                provider: profileProvider,
                apiKey: profileApiKey,
                endpoint: profileEndpoint,
                apiUrl: profileEndpoint, // both for legacy reasons if needed
                namespace: profileNamespace,
                scope: profileNamespace, // unified into namespace conceptually
                ttlDays: profileTtl,
            };

            if (editingProfile) {
                savedProfile = await apiService.updateMemoryProfile(editingProfile.id, profileData);
            } else {
                savedProfile = await apiService.createMemoryProfile(profileData);
            }

            // Handle Bot Assignments
            const updates = [];
            const newProfileId = savedProfile.id;

            for (const botId of selectedBotIds) {
                const bot = bots.find((b: any) => b.id === botId);
                if (bot && bot.memoryProfile !== newProfileId) {
                    updates.push(apiService.updateBot(botId, { memoryProfile: newProfileId }));
                }
            }

            if (editingProfile) {
                const originallyAssigned = editingProfile.assignedBotIds;
                const toUnassign = originallyAssigned.filter(id => !selectedBotIds.includes(id));
                for (const botId of toUnassign) {
                    updates.push(apiService.updateBot(botId, { memoryProfile: '' }));
                }
            }

            await Promise.all(updates);
            await fetchData();

            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingProfile(null);
            successToast('Success', 'Memory profile saved successfully');
        } catch (err) {
            console.error(err);
            setError('Failed to save memory profile');
            errorToast('Error', 'Failed to save memory profile');
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setTestResult(null);
        try {
            const data = await apiService.request<{ success: boolean, message: string }>('/api/admin/memory-profiles/test', {
                method: 'POST',
                body: JSON.stringify({
                    provider: profileProvider,
                    apiKey: profileApiKey,
                    endpoint: profileEndpoint,
                    namespace: profileNamespace
                })
            });
            setTestResult(data);
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Connection test failed to reach server'
            });
        } finally {
            setTestingConnection(false);
        }
    };

    const openCreateModal = () => {
        setProfileName('');
        setProfileProvider('mem0');
        setProfileApiKey('');
        setProfileEndpoint('');
        setProfileNamespace('');
        setProfileTtl(0);
        setSelectedBotIds([]);
        setEditingProfile(null);
        setIsViewMode(false);
        setTestResult(null);
        setShowCreateModal(true);
    };

    const openEditModal = (profile: UIMemoryProfile) => {
        setProfileName(profile.name);
        setProfileProvider(profile.provider);
        setProfileApiKey(profile.apiKey || '');
        setProfileEndpoint(profile.endpoint || profile.apiUrl || '');
        setProfileNamespace(profile.namespace || profile.scope || '');
        setProfileTtl(profile.ttlDays || 0);
        setSelectedBotIds(profile.assignedBotIds);
        setEditingProfile(profile);
        setIsViewMode(false);
        setTestResult(null);
        setShowEditModal(true);
    };

    const openViewModal = (profile: UIMemoryProfile) => {
        setProfileName(profile.name);
        setProfileProvider(profile.provider);
        setProfileApiKey(profile.apiKey ? '****************' : '');
        setProfileEndpoint(profile.endpoint || profile.apiUrl || '');
        setProfileNamespace(profile.namespace || profile.scope || '');
        setProfileTtl(profile.ttlDays || 0);
        setSelectedBotIds(profile.assignedBotIds);
        setEditingProfile(profile);
        setIsViewMode(true);
        setTestResult(null);
        setShowEditModal(true);
    };

    const handleDeleteProfile = (profileId: string) => {
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;
        setDeletingProfile(profile);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingProfile) return;
        setLoading(true);
        try {
            const updates = deletingProfile.assignedBotIds.map(botId =>
                apiService.updateBot(botId, { memoryProfile: '' }),
            );
            await Promise.all(updates);

            await apiService.deleteMemoryProfile(deletingProfile.id);

            await fetchData();
            setShowDeleteModal(false);
            setDeletingProfile(null);
            successToast('Success', 'Memory profile deleted successfully');
        } catch (err) {
            setError('Failed to delete memory profile');
            errorToast('Error', 'Failed to delete memory profile');
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'Database', color: 'primary' as const },
        { id: 'active', title: 'Assigned Bots', value: profiles.reduce((acc, p) => acc + p.assignedBotNames.length, 0), icon: '🤖', color: 'secondary' as const },
        { id: 'hits', title: 'Total API Hits', value: profiles.reduce((acc, p) => acc + (p.hitCount || 0), 0), icon: 'activity', color: 'accent' as const },
    ];

    return (
        <div className="space-y-6">
            {error && (
                <Alert
                    status="error"
                    message={error}
                    onClose={() => setError(null)}
                />
            )}

            <PageHeader
                title="Memory Systems (Beta)"
                description="Configure long-term agentic memory protocols (Mem0, mem4ai, MemVault)"
                icon={Database}
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={fetchData}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                        <Button
                            variant="primary"
                            onClick={openCreateModal}
                        >
                            <Plus className="w-4 h-4" /> Add Memory
                        </Button>
                    </div>
                }
            />

            <StatsCards stats={stats} isLoading={loading} />

            <div className="alert alert-info shadow-sm">
                <Info className="w-5 h-5" />
                <div>
                    <h3 className="font-bold text-xs opacity-70 uppercase tracking-wider">Note</h3>
                    <div className="text-sm">Bots armed with Memory Profiles can remember past facts and references over long timelines. Attach profiles in the specific bot settings.</div>
                </div>
            </div>

            <SearchFilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search memory profiles..."
                filters={[
                    {
                        key: 'provider',
                        value: selectedProvider,
                        onChange: setSelectedProvider,
                        options: providerOptions,
                        className: "w-full sm:w-1/3 md:w-1/4"
                    }
                ]}
            />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            ) : profiles.length === 0 ? (
                <EmptyState
                    icon={Database}
                    title="No memory profiles configured"
                    description="Create your first memory profile to enable long-term recall"
                    actionLabel="Add Memory"
                    actionIcon={Plus}
                    onAction={openCreateModal}
                    variant="noData"
                />
            ) : filteredProfiles.length === 0 ? (
                <EmptyState
                    icon={Search}
                    title="No profiles found"
                    description="Try adjusting your search or filters"
                    actionLabel="Clear Filters"
                    onAction={() => { setSearchQuery(''); setSelectedProvider('all'); }}
                    variant="noResults"
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProfiles.map(profile => (
                        <Card key={profile.id} data-testid="profile-card" className="hover:shadow-md transition-all flex flex-col h-full">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-base-200">
                                        <Database className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{profile.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Badge size="small" variant="neutral" style="outline" className="uppercase">{profile.provider}</Badge>
                                            <span className="text-xs text-base-content/50 flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3" /> {profile.hitCount || 0} hits
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 flex-1">
                                {(profile.namespace || profile.scope) && (
                                    <p className="text-sm text-base-content/70 mb-3">Namespace: <span className="font-mono">{profile.namespace || profile.scope}</span></p>
                                )}
                                <div className="flex items-center justify-between mb-2 mt-4">
                                    <h4 className="text-xs font-medium text-base-content/50 uppercase">Assigned Bots</h4>
                                </div>

                                {profile.assignedBotNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {profile.assignedBotNames.slice(0, 3).map(botName => (
                                            <Badge key={botName} variant="secondary" size="small" style="outline">
                                                {botName}
                                            </Badge>
                                        ))}
                                        {profile.assignedBotNames.length > 3 && (
                                            <Badge variant="ghost" size="small">
                                                +{profile.assignedBotNames.length - 3} more
                                            </Badge>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-sm text-base-content/40 italic">No bots assigned</span>
                                )}
                            </div>

                            <div className="flex items-center justify-end pt-3 border-t border-base-200 mt-auto gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openViewModal(profile)} title="View Details">
                                    <Eye className="w-4 h-4 mr-1" /> View
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEditModal(profile)}>
                                    <Edit2 className="w-4 h-4" /> Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                    className="text-error hover:bg-error/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showCreateModal || showEditModal}
                onClose={() => { setShowCreateModal(false); setShowEditModal(false); }}
                title={isViewMode ? `View Memory: ${editingProfile?.name}` : (editingProfile ? `Edit Memory: ${editingProfile.name}` : 'Create New Memory')}
                size="lg"
            >
                <div className="space-y-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Profile Name</span>
                        </label>
                        <Input
                            placeholder="e.g. Sales Team DB"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            disabled={isViewMode}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Protocol / Provider</span></label>
                        <select
                            className="select select-bordered"
                            value={profileProvider}
                            onChange={(e) => setProfileProvider(e.target.value as any)}
                            disabled={isViewMode || !!editingProfile}
                        >
                            <option value="mem0">Mem0</option>
                            <option value="mem4ai">mem4ai</option>
                            <option value="memvault">MemVault</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">API Key</span>
                        </label>
                        <Input
                            type="password"
                            placeholder="sk-..."
                            value={profileApiKey}
                            onChange={(e) => setProfileApiKey(e.target.value)}
                            disabled={isViewMode}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text flex items-center gap-2">
                                Endpoint / Base URL
                                <div className="tooltip tooltip-right" data-tip="Optional. If self-hosting your memory graph database">
                                    <Info className="w-3 h-3 text-base-content/40" />
                                </div>
                            </span>
                        </label>
                        <Input
                            placeholder="https://api.mem0.ai"
                            value={profileEndpoint}
                            onChange={(e) => setProfileEndpoint(e.target.value)}
                            disabled={isViewMode}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text flex items-center gap-2">
                                Namespace / Scope
                                <div className="tooltip tooltip-right" data-tip="Isolate memories. Separate documents into their own collection sandbox.">
                                    <Info className="w-3 h-3 text-base-content/40" />
                                </div>
                            </span>
                        </label>
                        <Input
                            placeholder="e.g. org-123 or user-456"
                            value={profileNamespace}
                            onChange={(e) => setProfileNamespace(e.target.value)}
                            disabled={isViewMode}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text flex items-center gap-2">
                                Memory Retention (Days)
                                <div className="tooltip tooltip-right" data-tip="How many days to keep memories before they expire. 0 = Keep forever.">
                                    <Info className="w-3 h-3 text-base-content/40" />
                                </div>
                            </span>
                        </label>
                        <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={profileTtl}
                            onChange={(e) => setProfileTtl(parseInt(e.target.value) || 0)}
                            disabled={isViewMode}
                        />
                    </div>

                    <div className="divider">Assignments</div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Assign to Bots</span>
                            <span className="label-text-alt text-base-content/60">Optional</span>
                        </label>
                        <div className="bg-base-200 rounded-box p-2 max-h-40 overflow-y-auto">
                            {bots.length === 0 ? <div className="p-2 text-sm opacity-50">No bots available</div> :
                                bots.map((bot: any) => {
                                    const isEnvLocked = !!bot.envOverrides?.memoryProfile;
                                    return (
                                        <label
                                            key={bot.id}
                                            className={`cursor-pointer label justify-start gap-3 rounded-lg ${isEnvLocked || isViewMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
                                            title={isEnvLocked ? "Memory is locked by environment variable" : ""}
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm checkbox-primary"
                                                checked={selectedBotIds.includes(bot.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) { setSelectedBotIds([...selectedBotIds, bot.id]); }
                                                    else { setSelectedBotIds(selectedBotIds.filter(id => id !== bot.id)); }
                                                }}
                                                disabled={!!isEnvLocked || isViewMode}
                                            />
                                            <div className="flex flex-col">
                                                <span className="label-text font-medium flex items-center gap-2">
                                                    {bot.name}
                                                    {isEnvLocked && <Shield className="w-3 h-3 text-warning" />}
                                                </span>
                                                <span className="text-xs opacity-50">
                                                    Current: {bot.memoryProfile ? (
                                                        profiles.find(p => p.id === bot.memoryProfile)?.name || 'Unknown'
                                                    ) : 'None'}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Test Connection Result */}
                    {testResult && (
                        <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'} shadow-sm mt-4`}>
                            {testResult.success ? <Shield className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            <span>{testResult.message}</span>
                        </div>
                    )}

                    <div className="flex justify-between mt-6">
                        <div>
                            {!isViewMode && (
                                <Button
                                    variant="ghost"
                                    buttonStyle="outline"
                                    onClick={handleTestConnection}
                                    disabled={testingConnection || !profileApiKey || !profileProvider}
                                >
                                    {testingConnection ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4 mr-1" />} Test Connection
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                                {isViewMode ? 'Close' : 'Cancel'}
                            </Button>
                            {!isViewMode && (
                                <Button variant="primary" onClick={handleSaveProfile} disabled={loading}>
                                    {loading ? <LoadingSpinner size="sm" /> : (editingProfile ? 'Save Changes' : 'Create Profile')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setDeletingProfile(null); }}
                title="Delete Memory Profile"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-error/10 rounded-lg">
                        <AlertTriangle className="w-8 h-8 text-error" />
                        <div>
                            <h3 className="font-bold">Are you sure?</h3>
                            <p className="text-sm text-base-content/70">
                                Delete <strong>"{deletingProfile?.name}"</strong>? This will detach it from any bots.
                            </p>
                        </div>
                    </div>
                    {deletingProfile && deletingProfile.assignedBotNames.length > 0 && (
                        <div className="alert alert-warning">
                            <Info className="w-4 h-4" />
                            <span>
                                {deletingProfile.assignedBotNames.length} bot(s) will lose their memory capability:
                                <strong className="ml-1">{deletingProfile.assignedBotNames.join(', ')}</strong>
                            </span>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => { setShowDeleteModal(false); setDeletingProfile(null); }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="btn-error"
                            onClick={confirmDelete}
                            disabled={loading}
                        >
                            {loading ? <LoadingSpinner size="sm" /> : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MemoryPage;
