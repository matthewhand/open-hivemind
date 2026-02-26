/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Badge, Button, Modal, Input, Select, Alert, Loading, Checkbox, Tooltip } from './DaisyUI';
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon as CheckAllIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  useGetConfigQuery,
  useCreateBotMutation,
  useCloneBotMutation,
  useDeleteBotMutation,
} from '../store/slices/apiSlice';
import { useLlmStatus } from '../hooks/useLlmStatus';

interface UIBot {
  name: string;
  messageProvider: string;
  llmProvider: string;
  status?: 'online' | 'offline' | 'error' | 'starting' | 'processing';
  lastActivity?: string;
  config?: Record<string, unknown>;
}

type ToastSeverity = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: string;
  message: string;
  severity: ToastSeverity;
}

const STATUS_META: Record<NonNullable<UIBot['status']>, { variant: 'success' | 'neutral' | 'error' | 'warning'; label: string; icon: React.ReactNode }> = {
  online: { variant: 'success', label: 'Online', icon: <CheckCircleIcon className="w-4 h-4" aria-hidden="true" /> },
  offline: { variant: 'neutral', label: 'Offline', icon: null },
  error: { variant: 'error', label: 'Error', icon: <XCircleIcon className="w-4 h-4" aria-hidden="true" /> },
  starting: { variant: 'warning', label: 'Starting', icon: <ClockIcon className="w-4 h-4" aria-hidden="true" /> },
  processing: { variant: 'warning', label: 'Processing', icon: <ArrowPathIcon className="w-4 h-4" aria-hidden="true" /> },
};

const BotManager: React.FC = () => {
  const { data, isLoading, isFetching, refetch } = useGetConfigQuery();
  const [createBot, { isLoading: isCreating }] = useCreateBotMutation();
  const [cloneBot, { isLoading: isCloning }] = useCloneBotMutation();
  const [deleteBot, { isLoading: isDeleting }] = useDeleteBotMutation();

  const rawBots: UIBot[] = useMemo(() => (data?.bots ?? []) as UIBot[], [data]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkCloneDialogOpen, setBulkCloneDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedBotName, setSelectedBotName] = useState<string | null>(null);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());

  const [botName, setBotName] = useState('');
  const [messageProvider, setMessageProvider] = useState('discord');
  const [llmProvider, setLlmProvider] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [newBotName, setNewBotName] = useState('');
  const [bulkClonePrefix, setBulkClonePrefix] = useState('');
  const [bulkCloneSuffix, setBulkCloneSuffix] = useState('_copy');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMessageProvider, setFilterMessageProvider] = useState<string>('all');
  const [filterLlmProvider, setFilterLlmProvider] = useState<string>('all');
  const [toast, setToast] = useState<Toast | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { status: llmStatus } = useLlmStatus();
  const defaultLlmConfigured = llmStatus?.defaultConfigured ?? false;

  const mutationInFlight = isCreating || isCloning || isDeleting;
  const selectedBot = useMemo(() => rawBots.find(bot => bot.name === selectedBotName) ?? null, [rawBots, selectedBotName]);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'info') => {
    setToast({ id: `${Date.now()}`, message, severity });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const resetForm = () => {
    setBotName('');
    setMessageProvider('discord');
    setLlmProvider('');
    setDiscordToken('');
    setOpenaiApiKey('');
    setNewBotName('');
    setSelectedBotName(null);
  };

  const toggleSelection = (name: string) => {
    setSelectedBots(prev => {
      const next = new Set(prev);
      if (next.has(name)) {next.delete(name);} else {next.add(name);}
      return next;
    });
  };

  const selectAll = () => setSelectedBots(new Set(filteredBots.map(b => b.name)));
  const clearSelection = () => setSelectedBots(new Set());

  const filteredBots = useMemo(() => {
    return rawBots
      .filter(bot =>
        searchQuery.trim() === '' ||
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.messageProvider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.llmProvider?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .filter(bot => filterStatus === 'all' || bot.status === filterStatus)
      .filter(bot => filterMessageProvider === 'all' || bot.messageProvider === filterMessageProvider)
      .filter(bot => filterLlmProvider === 'all' || bot.llmProvider === filterLlmProvider);
  }, [rawBots, searchQuery, filterStatus, filterMessageProvider, filterLlmProvider]);

  const handleCreateBot = async () => {
    if (!botName.trim()) {
      showToast('Bot name is required', 'error');
      return;
    }
    try {
      const config: Record<string, unknown> = {};
      if (messageProvider === 'discord' && discordToken.trim()) {config.discord = { token: discordToken.trim() };}
      if (llmProvider === 'openai' && openaiApiKey.trim()) {config.openai = { apiKey: openaiApiKey.trim() };}
      await createBot({ name: botName.trim(), messageProvider, ...(llmProvider ? { llmProvider } : {}), config }).unwrap();
      showToast(`Bot '${botName}' created`, 'success');
      setCreateDialogOpen(false);
      resetForm();
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create bot', 'error');
    }
  };

  const handleCloneBot = async () => {
    if (!selectedBot || !newBotName.trim()) {
      showToast('New bot name is required', 'error');
      return;
    }
    try {
      await cloneBot({ name: selectedBot.name, newName: newBotName.trim() }).unwrap();
      showToast(`Bot '${selectedBot.name}' cloned as '${newBotName}'`, 'success');
      setCloneDialogOpen(false);
      resetForm();
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to clone bot', 'error');
    }
  };

  const handleDeleteBot = async () => {
    if (!selectedBot) {return;}
    try {
      await deleteBot(selectedBot.name).unwrap();
      showToast(`Bot '${selectedBot.name}' deleted`, 'success');
      setDeleteDialogOpen(false);
      setSelectedBotName(null);
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete bot', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBots.size === 0) {return;}
    let successCount = 0;
    for (const name of selectedBots) {
      try {
        await deleteBot(name).unwrap();
        successCount++;
      } catch {
        showToast(`Failed to delete ${name}`, 'error');
      }
    }
    showToast(`Deleted ${successCount} bot(s)`, 'success');
    setBulkDeleteDialogOpen(false);
    clearSelection();
    await refetch();
  };

  const handleBulkClone = async () => {
    if (selectedBots.size === 0) {return;}
    let successCount = 0;
    for (const name of selectedBots) {
      const newNameComputed = `${bulkClonePrefix}${name}${bulkCloneSuffix}`.trim();
      if (!newNameComputed || newNameComputed === name) {continue;}
      try {
        await cloneBot({ name, newName: newNameComputed }).unwrap();
        successCount++;
      } catch { }
    }
    showToast(`Cloned ${successCount} bot(s)`, 'success');
    setBulkCloneDialogOpen(false);
    clearSelection();
    await refetch();
  };

  const openCloneDialog = (name: string) => {
    setSelectedBotName(name);
    setNewBotName(`${name}_copy`);
    setCloneDialogOpen(true);
  };

  const openDeleteDialog = (name: string) => {
    setSelectedBotName(name);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key.toLowerCase() === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        selectAll();
      }
      if (e.key === 'Escape') {clearSelection();}
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedBots]);

  const renderStatusBadge = (bot: UIBot) => {
    const status = bot.status ?? 'offline';
    const meta = STATUS_META[status] || STATUS_META.offline;
    return (
      <Badge variant={meta.variant} size="sm">
        {meta.icon}
        {meta.label}
      </Badge>
    );
  };

  if (isLoading && rawBots.length === 0) {
    return (
      <div className="flex justify-center items-center py-16">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="ml-4">Loading bots...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Bot Instance Manager</h1>
          <div className="flex flex-wrap gap-2">
            {(isFetching || (isLoading && rawBots.length > 0)) && <span className="loading loading-spinner loading-sm"></span>}
            <Button variant="secondary" buttonStyle="outline" onClick={() => { refetch(); showToast('Configuration refreshed', 'info'); }}>
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {selectedBots.size > 0 && (
              <>
                <Button variant="warning" buttonStyle="outline" onClick={() => setBulkCloneDialogOpen(true)} disabled={mutationInFlight}>
                  <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                  Clone ({selectedBots.size})
                </Button>
                <Button variant="error" buttonStyle="outline" onClick={() => setBulkDeleteDialogOpen(true)} disabled={mutationInFlight}>
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete ({selectedBots.size})
                </Button>
              </>
            )}
            <Button variant="primary" onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Bot
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search bots (/ to focus)"
                  aria-label="Search bots"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="sm" aria-label="Filter by status" options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'online', label: 'Online' },
                  { value: 'offline', label: 'Offline' },
                  { value: 'starting', label: 'Starting' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'error', label: 'Error' },
                ]} />
                <Select value={filterMessageProvider} onChange={(e) => setFilterMessageProvider(e.target.value)} size="sm" aria-label="Filter by message provider" options={[
                  { value: 'all', label: 'All Msg' },
                  { value: 'discord', label: 'Discord' },
                  { value: 'slack', label: 'Slack' },
                  { value: 'mattermost', label: 'Mattermost' },
                ]} />
                <Select value={filterLlmProvider} onChange={(e) => setFilterLlmProvider(e.target.value)} size="sm" aria-label="Filter by LLM provider" options={[
                  { value: 'all', label: 'All LLM' },
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'flowise', label: 'Flowise' },
                  { value: 'openwebui', label: 'OpenWebUI' },
                ]} />
                <Tooltip content="Select All">
                  <Button size="sm" variant="ghost" className="btn-circle" onClick={selectAll} disabled={filteredBots.length === 0} aria-label="Select all bots">
                    <CheckAllIcon className="w-5 h-5" />
                  </Button>
                </Tooltip>
                {selectedBots.size > 0 && <Button size="sm" onClick={clearSelection} aria-label="Clear selection">Clear</Button>}
              </div>
            </div>
            <p className="text-xs text-base-content/70">Keyboard: / focus • Ctrl+A select all • Esc clear</p>
          </div>
        </Card>

        {/* Bot Grid */}
        {filteredBots.length === 0 ? (
          <Alert status="info" message={rawBots.length === 0 ? 'No bots configured yet. Use the Create Bot button to get started.' : 'No bots match your filters / search.'} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBots.map((bot) => {
              const isSelected = selectedBots.has(bot.name);
              return (
                <Card key={bot.name} className={`relative transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                  {mutationInFlight && <div className="absolute top-0 left-0 w-full h-1 bg-primary/20"><div className="h-full bg-primary w-1/2 animate-pulse"></div></div>}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold truncate flex-1" title={bot.name}>🤖 {bot.name}</h3>
                    <Checkbox checked={isSelected} onChange={() => toggleSelection(bot.name)} aria-label={`Select bot ${bot.name}`} />
                  </div>
                  {renderStatusBadge(bot)}
                  <div className="flex gap-2 my-2">
                    <Badge variant="primary" size="sm" style="outline">{bot.messageProvider}</Badge>
                    <Badge variant="secondary" size="sm" style="outline">{bot.llmProvider}</Badge>
                  </div>
                  {bot.lastActivity && <p className="text-xs text-base-content/60">Last: {new Date(bot.lastActivity).toLocaleString()}</p>}
                  <div className="flex gap-2 mt-3">
                    <Tooltip content="Clone Bot">
                      <Button size="sm" variant="ghost" className="btn-circle" onClick={() => openCloneDialog(bot.name)} disabled={mutationInFlight} aria-label={`Clone bot ${bot.name}`}>
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete Bot">
                      <Button size="sm" variant="ghost" className="btn-circle text-error" onClick={() => openDeleteDialog(bot.name)} disabled={mutationInFlight} aria-label={`Delete bot ${bot.name}`}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Bot Modal */}
      <Modal isOpen={createDialogOpen} onClose={() => { setCreateDialogOpen(false); resetForm(); }} title="Create New Bot">
        <div className="space-y-4 py-4">
          <Input label="Bot Name *" value={botName} onChange={(e) => setBotName(e.target.value)} />
          <div className="form-control"><label className="label"><span className="label-text">Message Provider</span></label><Select value={messageProvider} onChange={(e) => setMessageProvider(e.target.value)} options={[{ value: 'discord', label: 'Discord' }, { value: 'slack', label: 'Slack' }, { value: 'mattermost', label: 'Mattermost' }]} /></div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">LLM Provider {defaultLlmConfigured ? '(optional)' : '*'}</span>
            </label>
            <Select
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
              options={[
                ...(defaultLlmConfigured ? [{ value: '', label: 'Use default LLM' }] : []),
                { value: 'openai', label: 'OpenAI' },
                { value: 'flowise', label: 'Flowise' },
                { value: 'openwebui', label: 'OpenWebUI' },
              ]}
            />
            {!defaultLlmConfigured && (
              <div className="alert alert-warning mt-3">
                <span>No default LLM is configured. Configure one or select an LLM for this bot.</span>
                <a className="btn btn-xs btn-outline ml-auto" href="/admin/integrations/llm" target="_blank" rel="noreferrer">
                  Configure LLM
                </a>
              </div>
            )}
          </div>
          {messageProvider === 'discord' && <Input label="Discord Bot Token" type="password" value={discordToken} onChange={(e) => setDiscordToken(e.target.value)} />}
          {llmProvider === 'openai' && <Input label="OpenAI API Key" type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)} />}
        </div>
        <div className="modal-action">
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }} variant="ghost">Cancel</Button>
          <Button onClick={handleCreateBot} variant="primary" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create'}</Button>
        </div>
      </Modal>

      {/* Clone Bot Modal */}
      <Modal isOpen={cloneDialogOpen} onClose={() => { setCloneDialogOpen(false); resetForm(); }} title="Clone Bot">
        <div className="py-4">
          <p className="mb-4 text-sm">Clone bot "{selectedBot?.name}" with a new name:</p>
          <Input label="New Bot Name" value={newBotName} onChange={(e) => setNewBotName(e.target.value)} />
        </div>
        <div className="modal-action">
          <Button onClick={() => { setCloneDialogOpen(false); resetForm(); }} variant="ghost">Cancel</Button>
          <Button onClick={handleCloneBot} variant="primary" disabled={isCloning}>{isCloning ? 'Cloning...' : 'Clone'}</Button>
        </div>
      </Modal>

      {/* Delete Bot Modal */}
      <Modal isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} title="Delete Bot">
        <div className="py-4">
          <p className="mb-2">Are you sure you want to delete bot "{selectedBot?.name}"?</p>
          <p className="text-sm text-base-content/70">This action cannot be undone.</p>
        </div>
        <div className="modal-action">
          <Button onClick={() => setDeleteDialogOpen(false)} variant="ghost">Cancel</Button>
          <Button onClick={handleDeleteBot} variant="primary" className="btn-error" disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal isOpen={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)} title={`Delete ${selectedBots.size} Bot(s)`}>
        <div className="py-4">
          <p className="text-sm mb-2">You are about to permanently delete the following bots:</p>
          <ul className="list-disc list-inside max-h-48 overflow-auto bg-base-200 p-3 rounded-box mb-4">
            {Array.from(selectedBots).map(name => <li key={name} className="text-sm">{name}</li>)}
          </ul>
          <Alert status="warning" message="This action cannot be undone." />
        </div>
        <div className="modal-action">
          <Button onClick={() => setBulkDeleteDialogOpen(false)} variant="ghost">Cancel</Button>
          <Button onClick={handleBulkDelete} variant="primary" className="btn-error" disabled={mutationInFlight}>{mutationInFlight ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>

      {/* Bulk Clone Modal */}
      <Modal isOpen={bulkCloneDialogOpen} onClose={() => setBulkCloneDialogOpen(false)} title={`Bulk Clone ${selectedBots.size} Bot(s)`}>
        <div className="space-y-4 py-4">
          <Alert status="info" message="A new name will be generated for each selected bot: prefix + originalName + suffix" />
          <Input label="Prefix" value={bulkClonePrefix} onChange={(e) => setBulkClonePrefix(e.target.value)} placeholder="(optional)" />
          <Input label="Suffix" value={bulkCloneSuffix} onChange={(e) => setBulkCloneSuffix(e.target.value)} />
          <div>
            <p className="text-xs text-base-content/70 mb-2">Preview:</p>
            <ul className="list-disc list-inside max-h-32 overflow-auto bg-base-200 p-3 rounded-box text-sm">
              {Array.from(selectedBots).slice(0, 6).map(name => <li key={name}>{name} → {`${bulkClonePrefix}${name}${bulkCloneSuffix}`}</li>)}
              {selectedBots.size > 6 && <li className="text-base-content/60">...and {selectedBots.size - 6} more</li>}
            </ul>
          </div>
        </div>
        <div className="modal-action">
          <Button onClick={() => setBulkCloneDialogOpen(false)} variant="ghost">Cancel</Button>
          <Button onClick={handleBulkClone} variant="primary" disabled={mutationInFlight}>{mutationInFlight ? 'Cloning...' : 'Clone'}</Button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${toast.severity === 'success' ? 'alert-success' : toast.severity === 'error' ? 'alert-error' : toast.severity === 'warning' ? 'alert-warning' : 'alert-info'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default BotManager;
