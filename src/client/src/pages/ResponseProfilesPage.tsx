import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import StatsCards from '../components/DaisyUI/StatsCards';
import EmptyState from '../components/DaisyUI/EmptyState';
import ConfigKeyValueCard from '../components/DaisyUI/ConfigKeyValueCard';
import { SkeletonTableLayout } from '../components/DaisyUI/Skeleton';
import SearchFilterBar from '../components/SearchFilterBar';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import {
  MessageSquare as ResponseIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  XCircle as XIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
  Search,
  RefreshCw,
  Zap,
  Shield,
  Clock,
  Users,
} from 'lucide-react';
import { apiService } from '../services/api';
import useUrlParams from '../hooks/useUrlParams';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useSavedStamp } from '../contexts/SavedStampContext';
import Input from '../components/DaisyUI/Input';
import Toggle from '../components/DaisyUI/Toggle';

interface ResponseProfile {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  isBuiltIn?: boolean;
  swarmMode?: SwarmMode;
  settings: Record<string, number | boolean | string>;
}

type SwarmMode = 'exclusive' | 'broadcast' | 'rotating' | 'priority' | 'collaborative';

const SWARM_MODES: { value: SwarmMode; label: string; icon: string; description: string }[] = [
  { value: 'exclusive', label: 'Exclusive (First Bot Wins)', icon: '🏆', description: 'First bot to decide to respond claims the message. Others skip.' },
  { value: 'broadcast', label: 'Broadcast (All Respond)', icon: '📡', description: 'All bots independently decide whether to respond. Multiple replies possible.' },
  { value: 'rotating', label: 'Rotating (Round Robin)', icon: '🔄', description: 'Bots take turns. Only the designated bot for this cycle responds.' },
  { value: 'priority', label: 'Priority (Ranked)', icon: '🎯', description: 'Bots ranked by priority. Highest priority bot that wants to respond gets it.' },
  { value: 'collaborative', label: 'Collaborative (Combine)', icon: '🤝', description: 'Multiple bots contribute tokens to a single combined response.' },
];

const SETTING_GROUPS = [
  {
    title: 'Timing & Delays',
    icon: <Clock className="w-4 h-4" />,
    keys: [
      'MESSAGE_DELAY_MULTIPLIER',
      'MESSAGE_MIN_DELAY',
      'MESSAGE_MAX_DELAY',
      'MESSAGE_COMPOUNDING_DELAY_BASE_MS',
      'MESSAGE_COMPOUNDING_DELAY_MAX_MS',
    ]
  },
  {
    title: 'Reading Simulation',
    icon: <Zap className="w-4 h-4" />,
    keys: [
      'MESSAGE_READING_DELAY_BASE_MS',
      'MESSAGE_READING_DELAY_PER_CHAR_MS',
      'MESSAGE_READING_DELAY_MIN_MS',
      'MESSAGE_READING_DELAY_MAX_MS',
    ]
  },
  {
    title: 'Engagement Logic',
    icon: <Shield className="w-4 h-4" />,
    keys: [
      'MESSAGE_ONLY_WHEN_SPOKEN_TO',
      'MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS',
      'MESSAGE_UNSOLICITED_BASE_CHANCE',
      'MESSAGE_UNSOLICITED_ADDRESSED',
      'MESSAGE_UNSOLICITED_UNADDRESSED',
      'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS',
    ]
  },
  {
    title: 'Behavior Modifiers',
    icon: <ConfigIcon className="w-4 h-4" />,
    keys: [
      'MESSAGE_SHORT_LENGTH_PENALTY',
      'MESSAGE_BOT_RESPONSE_MODIFIER',
      'MESSAGE_OTHERS_TYPING_WINDOW_MS',
      'MESSAGE_OTHERS_TYPING_MAX_WAIT_MS',
      'MESSAGE_RATE_LIMIT_PER_CHANNEL',
    ]
  }
];

const ResponseProfilesPage: React.FC = () => {
  const errorToast = useErrorToast();
  const { showStamp } = useSavedStamp();
  const [profiles, setProfiles] = useState<ResponseProfile[]>([]);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [formModal, setFormModal] = useState<{
    isOpen: boolean; isEdit: boolean; profile: ResponseProfile | null;
  }>({ isOpen: false, isEdit: false, profile: null });
  
  const [formData, setFormData] = useState<Partial<ResponseProfile>>({
    name: '',
    key: '',
    description: '',
    swarmMode: 'exclusive',
    settings: {}
  });

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/api/config/response-profiles') as any;
      setProfiles(res.data || res.profiles || []);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to load response profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // Auto-refresh on WebSocket broadcast
  const { configVersion, lastConfigChange } = useWebSocket();
  useEffect(() => {
    if (lastConfigChange?.type === 'response-profiles') {
      fetchProfiles();
    }
  }, [configVersion, lastConfigChange, fetchProfiles]);

  const handleAddProfile = () => {
    setFormData({ name: '', key: '', description: '', swarmMode: 'exclusive', settings: {} });
    setFormModal({ isOpen: true, isEdit: false, profile: null });
  };

  const handleEditProfile = (profile: ResponseProfile) => {
    setFormData({ ...profile, settings: { ...profile.settings } });
    setFormModal({ isOpen: true, isEdit: true, profile });
  };

  const handleDeleteProfile = async (key: string) => {
    setConfirmModal({
      isOpen: true, title: 'Delete Profile', message: `Are you sure you want to delete the response profile "${key}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.delete(`/api/config/response-profiles/${key}`);
          fetchProfiles();
          showStamp();
        } catch (err: unknown) { errorToast('Delete Failed', `Failed to delete: ${(err instanceof Error ? err.message : String(err))}`); }
      },
    });
  };

  const handleFormSubmit = async () => {
    try {
      let key: string;
      if (formModal.isEdit) {
        key = formModal.profile!.key;
      } else {
        key = (formData.name ?? '')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/^-+|-+$/g, ''); // strip leading/trailing hyphens
        if (!key) {
          setError('Profile name must contain at least one letter or digit');
          return;
        }
      }

      const payload = { ...formData, key };

      if (formModal.isEdit) {
        await apiService.put(`/api/config/response-profiles/${key}`, payload);
      } else {
        await apiService.post('/api/config/response-profiles', payload);
      }
      
      setFormModal({ isOpen: false, isEdit: false, profile: null });
      showStamp();
      fetchProfiles();
    } catch (err: unknown) { 
      errorToast('Save Failed', `Failed to save profile: ${(err instanceof Error ? err.message : String(err))}`); 
    }
  };

  const toggleExpand = (key: string) => setExpandedProfile(expandedProfile === key ? null : key);

  const filteredProfiles = useMemo(() =>
    profiles.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.key.toLowerCase().includes(searchQuery.toLowerCase())
    ), [profiles, searchQuery]);

  const stats = [
    { id: 'total', title: 'Total Profiles', value: profiles.length, icon: 'message-square', color: 'primary' as const },
    { id: 'builtin', title: 'Built-in', value: profiles.filter(p => p.isBuiltIn).length, icon: 'shield', color: 'secondary' as const },
    { id: 'custom', title: 'Custom', value: profiles.filter(p => !p.isBuiltIn).length, icon: 'edit', color: 'accent' as const },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ResponseIcon className="w-6 h-6 text-primary" />
            Response Profiles
          </h1>
          <p className="text-base-content/60 text-sm mt-1">Tune how bots engage in conversations and simulate human social behavior</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProfiles} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" onClick={handleAddProfile}>
            <AddIcon className="w-4 h-4 mr-2" /> Create Profile
          </Button>
        </div>
      </div>

      <StatsCards stats={stats} isLoading={loading} />

      {error && <Alert status="error" icon={<XIcon />} message={error} onClose={() => setError(null)} />}

      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search response profiles..."
      />

      {loading ? (
        <SkeletonTableLayout rows={5} columns={3} />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState 
          icon={ResponseIcon} 
          title="No Response Profiles" 
          description="Create a profile to control bot social dynamics and response timing." 
          actionLabel="Create Profile" 
          onAction={handleAddProfile} 
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(profile.key)}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${profile.isBuiltIn ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    <ResponseIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {profile.name}
                      {profile.isBuiltIn && <Badge variant="secondary" size="xs">Built-in</Badge>}
                      <span className="text-xs font-normal opacity-50 px-2 py-0.5 bg-base-200 rounded-full font-mono">{profile.key}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm opacity-60">{profile.description || 'No description provided'}</p>
                      {(() => {
                        const currentMode = profile.swarmMode || (profile.settings?.SWARM_MODE as string) || 'exclusive';
                        const modeInfo = SWARM_MODES.find(m => m.value === currentMode);
                        if (modeInfo) {
                          return (
                            <Badge variant="ghost" size="xs" className="flex items-center gap-1">
                              <span>{modeInfo.icon}</span>
                              <span className="truncate max-w-[120px]">{modeInfo.label.split('(')[0].trim()}</span>
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => handleEditProfile(profile)}><EditIcon className="w-4 h-4" /></Button>
                  {!profile.isBuiltIn && (
                    <Button size="sm" variant="outline" className="text-error hover:bg-error/10" onClick={() => handleDeleteProfile(profile.key)}>
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)}>
                    {expandedProfile === profile.key ? <ExpandIcon className="w-4 h-4" /> : <CollapseIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {expandedProfile === profile.key && (
                <div className="px-4 pb-4">
                  <div className="divider my-0"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {Object.entries(profile.settings).map(([k, v]) => (
                      <ConfigKeyValueCard key={k} configKey={k} value={v} />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, isEdit: false, profile: null })}
        title={formModal.isEdit ? 'Edit Response Profile' : 'Create Response Profile'}
        size="lg"
        actions={[
          { label: 'Cancel', onClick: () => setFormModal({ isOpen: false, isEdit: false, profile: null }), variant: 'ghost' },
          { label: formModal.isEdit ? 'Update' : 'Create', onClick: handleFormSubmit, variant: 'primary', disabled: !formData.name?.trim() },
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-bold">Profile Name</span></label>
              <Input
                placeholder="e.g. Cautious Lurker"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text font-bold">Description</span></label>
              <Input
                placeholder="Briefly describe this behavior..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          {/* Swarm Orchestration Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2 opacity-70 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              Swarm Orchestration
            </h4>
            <div className="bg-base-200/30 p-4 rounded-xl space-y-3">
              <p className="text-xs opacity-70">Choose how bots coordinate when deciding to respond to messages.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SWARM_MODES.map(mode => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, swarmMode: mode.value }))}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      formData.swarmMode === mode.value
                        ? 'border-primary bg-primary/10'
                        : 'border-base-300 hover:border-base-content/20'
                    }`}
                  >
                    <span className="text-xl">{mode.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{mode.label}</div>
                      <div className="text-xs opacity-60 leading-tight">{mode.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divider">Profile Settings</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {SETTING_GROUPS.map(group => (
              <div key={group.title} className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2 opacity-70 uppercase tracking-wider">
                  {group.icon}
                  {group.title}
                </h4>
                <div className="space-y-3 bg-base-200/30 p-4 rounded-xl">
                  {group.keys.map(key => {
                    // Derive boolean/number type from the existing default value or
                    // well-known key suffixes — avoids hardcoding individual names.
                    const existingValue = formData.settings?.[key];
                    const isBool =
                      typeof existingValue === 'boolean' ||
                      (existingValue === undefined &&
                        (key.endsWith('_ADDRESSED') ||
                          key.endsWith('_UNADDRESSED') ||
                          key.endsWith('_SPOKEN_TO') ||
                          key.endsWith('_ENABLED') ||
                          key.endsWith('_ACTIVE')));
                    return (
                      <div key={key} className="form-control">
                        <label className="label cursor-pointer flex justify-between">
                          <span className="label-text text-xs font-mono">{key.replace('MESSAGE_', '')}</span>
                          {isBool ? (
                            <Toggle 
                              checked={!!formData.settings?.[key]} 
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                settings: { ...prev.settings, [key]: e.target.checked }
                              }))}
                            />
                          ) : (
                            <Input 
                              type="number"
                              className="input-xs w-24 text-right"
                              step={key.includes('MULTIPLIER') || key.includes('CHANCE') ? 0.01 : 1}
                              value={formData.settings?.[key] ?? ''}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (!isFinite(parsed)) return; // reject Infinity / NaN
                                setFormData(prev => ({
                                  ...prev,
                                  settings: { ...prev.settings, [key]: parsed },
                                }));
                              }}
                            />
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={confirmModal.onConfirm} 
        confirmVariant="error" 
      />
    </div>
  );
};

export default ResponseProfilesPage;
