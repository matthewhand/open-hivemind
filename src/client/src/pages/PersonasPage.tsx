/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Plus, Edit2, Trash2, Sparkles, RefreshCw, Info, AlertTriangle, Shield, Copy, Search, X, Eye } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Modal,
  PageHeader,
  StatsCards,
  LoadingSpinner,
  EmptyState,
  ToastNotification,
} from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import type { Persona as ApiPersona, Bot } from '../services/api';
import { apiService } from '../services/api';

// Extend UI Persona type to include assigned bots for display
interface Persona extends ApiPersona {
  assignedBotNames: string[];
  assignedBotIds: string[]; // Bot IDs are strings in API but let's check Bot type
}

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'creative', label: 'Creative' },
  { value: 'technical', label: 'Technical' },
  { value: 'educational', label: 'Educational' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'professional', label: 'Professional' },
];

const PersonasPage: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]); // Bot type from API
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const successToast = ToastNotification.useSuccessToast();
  const errorToast = ToastNotification.useErrorToast();

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPersona, setDeletingPersona] = useState<Persona | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [cloningPersonaId, setCloningPersonaId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // Form State
  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]); // Bot IDs are strings in new API
  const [personaCategory, setPersonaCategory] = useState<ApiPersona['category']>('general');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [configResponse, personasResponse] = await Promise.all([
        apiService.getConfig(),
        apiService.getPersonas(),
      ]);

      const botList = configResponse.bots || [];
      const filledBots = botList.map((b: any) => ({
        ...b,
        id: b.id || b.name, // Fallback to name if ID missing (shouldn't happen for active bots)
      }));
      setBots(filledBots);

      const mappedPersonas = personasResponse.map(p => {
        // Find assigned bots
        // Match by persona ID stored in bot.persona OR matches persona name (legacy)
        const assigned = filledBots.filter((b: any) =>
          b.persona === p.id || b.persona === p.name,
        );
        return {
          ...p,
          assignedBotNames: assigned.map((b: any) => b.name),
          assignedBotIds: assigned.map((b: any) => b.id),
        };
      });

      setPersonas(mappedPersonas);
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

  // Derive filtered personas
  const filteredPersonas = useMemo(() => {
    return personas.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [personas, searchQuery, selectedCategory]);

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      successToast('Copied!', 'System prompt copied to clipboard');
    } catch (err) {
      console.error('Failed to copy', err);
      errorToast('Error', 'Failed to copy to clipboard');
    }
  };

  const handleSavePersona = async () => {
    if (!personaName.trim()) { return; }

    setLoading(true);
    try {
      let savedPersona: ApiPersona;

      const personaData = {
        name: personaName,
        description: personaDescription || 'Custom Persona',
        category: personaCategory,
        systemPrompt: personaPrompt,
        traits: [], // Traits not yet exposed in simple UI
      };

      if (cloningPersonaId) {
        savedPersona = await apiService.clonePersona(cloningPersonaId, {
          name: personaName,
          description: personaDescription,
          category: personaCategory,
          systemPrompt: personaPrompt,
        });
      } else if (editingPersona) {
        savedPersona = await apiService.updatePersona(editingPersona.id, personaData);
      } else {
        savedPersona = await apiService.createPersona(personaData);
      }

      // Handle Bot Assignments
      const updates = [];
      const newPersonaId = savedPersona.id;

      // 1. Assign to selected bots
      for (const botId of selectedBotIds) {
        // Only update if not already assigned
        const bot = bots.find((b: any) => b.id === botId);
        if (bot && bot.persona !== newPersonaId) {
          updates.push(apiService.updateBot(botId, {
            persona: newPersonaId,
            systemInstruction: personaPrompt, // Ensure prompt sync
          }));
        }
      }

      // 2. Unassign from deselected bots (only if editing)
      if (editingPersona) {
        const originallyAssigned = editingPersona.assignedBotIds;
        const toUnassign = originallyAssigned.filter(id => !selectedBotIds.includes(id));

        for (const botId of toUnassign) {
          updates.push(apiService.updateBot(botId, {
            persona: 'default', // Revert to default
            systemInstruction: 'You are a helpful assistant.', // Default prompt
          }));
        }
      }

      await Promise.all(updates);
      await fetchData();

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingPersona(null);
      setCloningPersonaId(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save persona changes');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setPersonaName('');
    setPersonaDescription('');
    setPersonaCategory('general');
    setPersonaPrompt('You are a helpful assistant.');
    setSelectedBotIds([]);
    setEditingPersona(null);
    setCloningPersonaId(null);
    setIsViewMode(false);
    setShowCreateModal(true);
  };

  const openCloneModal = (persona: Persona) => {
    setPersonaName(`Copy of ${persona.name}`);
    setPersonaDescription(persona.description);
    setPersonaCategory(persona.category);
    setPersonaPrompt(persona.systemPrompt);
    setSelectedBotIds([]); // Don't copy assignments by default
    setEditingPersona(null);
    setCloningPersonaId(persona.id);
    setIsViewMode(false);
    setShowCreateModal(true); // Reuse create modal
  };

  const openEditModal = (persona: Persona) => {
    if (persona.isBuiltIn) {
      alert('Cannot edit built-in personas directly. Clone them instead.');
      return;
    }
    setPersonaName(persona.name);
    setPersonaDescription(persona.description);
    setPersonaCategory(persona.category);
    setPersonaPrompt(persona.systemPrompt);
    setSelectedBotIds(persona.assignedBotIds);
    setEditingPersona(persona);
    setCloningPersonaId(null);
    setIsViewMode(false);
    setShowEditModal(true);
  };

  const openViewModal = (persona: Persona) => {
    setPersonaName(persona.name);
    setPersonaDescription(persona.description);
    setPersonaCategory(persona.category);
    setPersonaPrompt(persona.systemPrompt);
    setSelectedBotIds(persona.assignedBotIds);
    setEditingPersona(persona);
    setIsViewMode(true);
    setShowEditModal(true);
  };

  const handleDeletePersona = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) { return; }
    if (persona.isBuiltIn) {
      setError('Cannot delete built-in personas');
      return;
    }
    setDeletingPersona(persona);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingPersona) { return; }
    setLoading(true);
    try {
      // 1. Revert bots
      const updates = deletingPersona.assignedBotIds.map(botId =>
        apiService.updateBot(botId, { persona: 'default', systemInstruction: 'You are a helpful assistant.' }),
      );
      await Promise.all(updates);

      // 2. Delete persona
      await apiService.deletePersona(deletingPersona.id);

      await fetchData();
      setShowDeleteModal(false);
      setDeletingPersona(null);
    } catch (err) {
      setError('Failed to delete persona');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { id: 'total', title: 'Total Personas', value: personas.length, icon: '✨', color: 'primary' as const },
    { id: 'active', title: 'Assigned Bots', value: personas.reduce((acc, p) => acc + p.assignedBotNames.length, 0), icon: '🤖', color: 'secondary' as const },
    { id: 'custom', title: 'Custom Personas', value: personas.filter(p => !p.isBuiltIn).length, icon: 'user', color: 'accent' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert
          status="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Personas (Beta)"
        description="Manage AI personalities and system prompts"
        icon={Sparkles}
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
              <Plus className="w-4 h-4" /> Create Persona
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={loading} />

      {/* Info Banner */}
      <div className="alert alert-info shadow-sm">
        <Info className="w-5 h-5" />
        <div>
          <h3 className="font-bold text-xs opacity-70 uppercase tracking-wider">Note</h3>
          <div className="text-sm">Personas define the personality and base instructions for your bots. You can assign the same persona to multiple bots. Changes here update all assigned bots.</div>
        </div>
      </div>

      {/* Filters */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search personas..."
        filters={[
          {
            key: 'category',
            value: selectedCategory,
            onChange: setSelectedCategory,
            options: categoryOptions,
            className: "w-full sm:w-1/3 md:w-1/4"
          }
        ]}
      />

      {/* Persona List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : personas.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No personas configured"
          description="Create your first persona to get started"
          actionLabel="Create Persona"
          actionIcon={Plus}
          onAction={openCreateModal}
          variant="noData"
        />
      ) : filteredPersonas.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No personas found"
          description="Try adjusting your search or filters"
          actionLabel="Clear Filters"
          onAction={() => { setSearchQuery(''); setSelectedCategory('all'); }}
          variant="noResults"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPersonas.map(persona => (
            <Card key={persona.id} data-testid="persona-card" className={`hover:shadow-md transition-all flex flex-col h-full ${persona.isBuiltIn ? 'border-l-4 border-l-primary/30' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${persona.isBuiltIn ? 'bg-primary/10 text-primary' : 'bg-base-200'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{persona.name}</h3>
                      {persona.isBuiltIn && <Badge size="small" variant="neutral" style="outline">Built-in</Badge>}
                    </div>
                    <p className="text-xs text-base-content/60">{persona.category}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex-1">
                <p className="text-sm text-base-content/70 mb-3">{persona.description}</p>
                <div className="bg-base-200/50 p-3 rounded-lg mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-base-content/40 uppercase">System Prompt</h4>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-primary"
                        onClick={() => handleCopyPrompt(persona.systemPrompt)}
                        title="Copy System Prompt"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <div className="tooltip tooltip-left" data-tip="The core instructions that define the AI's behavior">
                        <Info className="w-3 h-3 text-base-content/30 cursor-help" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-base-content/80 line-clamp-3 italic font-mono text-xs">
                    "{persona.systemPrompt}"
                  </p>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-base-content/50 uppercase">Assigned Bots</h4>
                  <div className="tooltip tooltip-left" data-tip="Bots currently using this persona">
                    <Info className="w-3 h-3 text-base-content/30 cursor-help" />
                  </div>
                </div>

                {persona.assignedBotNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {persona.assignedBotNames.slice(0, 3).map(botName => (
                      <Badge key={botName} variant="secondary" size="small" style="outline">
                        {botName}
                      </Badge>
                    ))}
                    {persona.assignedBotNames.length > 3 && (
                      <Badge variant="ghost" size="small" style="outline">
                        +{persona.assignedBotNames.length - 3} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-base-content/40 italic">No bots assigned</span>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-base-200 mt-auto gap-2">
                <Button variant="ghost" size="sm" onClick={() => openViewModal(persona)} title="View Details">
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openCloneModal(persona)} title="Clone Persona">
                  <Copy className="w-4 h-4 mr-1" /> Clone
                </Button>
                {!persona.isBuiltIn && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(persona)}>
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePersona(persona.id)}
                      className="text-error hover:bg-error/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => { setShowCreateModal(false); setShowEditModal(false); }}
        title={isViewMode ? `View Persona: ${editingPersona?.name}` : (editingPersona ? `Edit Persona: ${editingPersona.name}` : (cloningPersonaId ? 'Clone Persona' : 'Create New Persona'))}
        size="lg"
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                Persona Name
                <div className="tooltip tooltip-right" data-tip="A unique name for this persona">
                  <Info className="w-3 h-3 text-base-content/40" />
                </div>
              </span>
            </label>
            <Input
              placeholder="e.g. Friendly Helper"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              disabled={isViewMode || (!!editingPersona && editingPersona.isBuiltIn)}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <Input
              placeholder="Short description of this persona"
              value={personaDescription}
              onChange={(e) => setPersonaDescription(e.target.value)}
              disabled={isViewMode}
            />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Category</span></label>
            <select
              className="select select-bordered"
              value={personaCategory}
              onChange={(e) => setPersonaCategory(e.target.value as any)}
              disabled={isViewMode}
            >
              <option value="general">General</option>
              <option value="customer_service">Customer Service</option>
              <option value="creative">Creative</option>
              <option value="technical">Technical</option>
              <option value="educational">Educational</option>
              <option value="entertainment">Entertainment</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                System Prompt
                <div className="tooltip tooltip-right" data-tip="The core instruction set that governs the AI's behavior, tone, and capabilities.">
                  <Info className="w-3 h-3 text-base-content/40" />
                </div>
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered h-32 font-mono text-sm leading-relaxed"
              value={personaPrompt}
              onChange={(e) => setPersonaPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              disabled={isViewMode}
            />
          </div>

          <div className="divider">Assignments</div>

          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                Assign to Bots
                <div className="tooltip tooltip-right" data-tip="Select which bots should use this persona. They will be updated immediately upon saving.">
                  <Info className="w-3 h-3 text-base-content/40" />
                </div>
              </span>
              <span className="label-text-alt text-base-content/60">Optional</span>
            </label>
            <div className="bg-base-200 rounded-box p-2 max-h-40 overflow-y-auto">
              {bots.length === 0 ? <div className="p-2 text-sm opacity-50">No bots available</div> :
                bots.map((bot: any) => {
                  const isEnvLocked = bot.envOverrides?.persona;
                  return (
                    <label
                      key={bot.id}
                      className={`cursor-pointer label justify-start gap-3 rounded-lg ${isEnvLocked || isViewMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
                      title={isEnvLocked ? "Persona is locked by environment variable" : ""}
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
                          Current: {bot.persona ? (
                            personas.find(p => p.id === bot.persona || p.name === bot.persona)?.name || bot.persona
                          ) : 'default'}
                        </span>
                      </div>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
              {isViewMode ? 'Close' : 'Cancel'}
            </Button>
            {!isViewMode && (
              <Button variant="primary" onClick={handleSavePersona} disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : (editingPersona ? 'Save Changes' : (cloningPersonaId ? 'Clone Persona' : 'Create Persona'))}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingPersona(null); }}
        title="Delete Persona"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-error/10 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-error" />
            <div>
              <h3 className="font-bold">Are you sure?</h3>
              <p className="text-sm text-base-content/70">
                Delete <strong>"{deletingPersona?.name}"</strong>?
              </p>
            </div>
          </div>
          {deletingPersona && deletingPersona.assignedBotNames.length > 0 && (
            <div className="alert alert-warning">
              <Info className="w-4 h-4" />
              <span>
                {deletingPersona.assignedBotNames.length} bot(s) will be reverted to default:
                <strong className="ml-1">{deletingPersona.assignedBotNames.join(', ')}</strong>
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => { setShowDeleteModal(false); setDeletingPersona(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="btn-error"
              onClick={confirmDelete}
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Delete Persona'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PersonasPage;
