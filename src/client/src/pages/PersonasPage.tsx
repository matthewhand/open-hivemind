import React, { useState, useEffect, useCallback } from 'react';
import { User, Plus, Edit2, Trash2, Sparkles, RefreshCw } from 'lucide-react';
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
  EmptyState
} from '../components/DaisyUI';

interface BotConfig {
  id: number;
  name: string;
  persona?: string;
  systemInstruction?: string;
  messageProvider?: string;
  llmProvider?: string;
}

interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  assignedBots: string[]; // Bot names
  assignedBotIds: number[]; // Bot IDs for updates
}

const API_BASE = '/api';

const PersonasPage: React.FC = () => {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  
  // Form State
  const [personaName, setPersonaName] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/config`);
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }

      const data = await response.json();
      const botList: BotConfig[] = data.bots || [];
      setBots(botList);

      // Extract unique personas from bots
      const personaMap = new Map<string, { bots: string[], ids: number[], prompt: string }>();
      
      botList.forEach((bot) => {
        const personaName = bot.persona || 'default';
        if (!personaMap.has(personaName)) {
          personaMap.set(personaName, { bots: [], ids: [], prompt: bot.systemInstruction || '' });
        }
        const entry = personaMap.get(personaName)!;
        entry.bots.push(bot.name);
        entry.ids.push(bot.id);
        // If we found a prompt and the entry didn't have one (or it was empty), update it
        if (bot.systemInstruction && !entry.prompt) {
          entry.prompt = bot.systemInstruction;
        }
      });

      const personaList: Persona[] = Array.from(personaMap.entries()).map(([name, data], index) => ({
        id: `persona-${index}`,
        name,
        systemPrompt: data.prompt || 'You are a helpful assistant.',
        assignedBots: data.bots,
        assignedBotIds: data.ids
      }));

      // Ensure default exists
      if (!personaMap.has('default')) {
        personaList.unshift({ 
          id: 'persona-default', 
          name: 'default', 
          systemPrompt: 'You are a helpful assistant.', 
          assignedBots: [], 
          assignedBotIds: [] 
        });
      }

      setPersonas(personaList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch personas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSavePersona = async () => {
    if (!personaName.trim()) return;
    
    // We are "saving" by updating all selected bots to have this persona and prompt
    // For bots NOT selected but currently having this persona, we revert them to default? 
    // Or just leave them? The UI implies "Assign to bots".
    // "Assignment" usually implies full control.
    // Strategy:
    // 1. Update ALL selected bots to have `persona: personaName` and `systemInstruction: personaPrompt`.
    // 2. If editing existing persona, find bots that WERE assigned but are NOW unassigned, and set them to 'default'.
    
    setLoading(true);
    try {
      const updates = [];
      
      // 1. Update selected bots
      for (const botId of selectedBotIds) {
        updates.push(fetch(`${API_BASE}/bots/${botId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            persona: personaName,
            systemInstruction: personaPrompt
          })
        }));
      }

      // 2. Handle unassigned bots (only if editing)
      if (editingPersona) {
        const botsToUnassign = editingPersona.assignedBotIds.filter(id => !selectedBotIds.includes(id));
        for (const botId of botsToUnassign) {
           updates.push(fetch(`${API_BASE}/bots/${botId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              persona: 'default',
              // We might want to reset prompt too, or leave it? 
              // Let's leave it or set to default prompt.
              systemInstruction: 'You are a helpful assistant.'
            })
          }));
        }
      }

      await Promise.all(updates);
      await fetchData();
      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingPersona(null);
    } catch (err) {
      setError('Failed to save persona changes');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setPersonaName('');
    setPersonaPrompt('You are a helpful assistant.');
    setSelectedBotIds([]);
    setEditingPersona(null);
    setShowCreateModal(true);
  };

  const openEditModal = (persona: Persona) => {
    setPersonaName(persona.name);
    setPersonaPrompt(persona.systemPrompt);
    setSelectedBotIds(persona.assignedBotIds);
    setEditingPersona(persona);
    setShowEditModal(true);
  };

  const handleDeletePersona = async (personaId: string) => {
      // Logic for delete: Set all assigned bots to 'default'
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;
      
      if (window.confirm(`Delete persona "${persona.name}"? This will revert ${persona.assignedBots.length} bots to default.`)) {
          setLoading(true);
          try {
              const updates = persona.assignedBotIds.map(botId => 
                  fetch(`${API_BASE}/bots/${botId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ persona: 'default', systemInstruction: 'You are a helpful assistant.' })
                  })
              );
              await Promise.all(updates);
              await fetchData();
          } catch(err) {
              setError('Failed to delete persona');
              setLoading(false);
          }
      }
  };

  const stats = [
    { id: 'total', title: 'Total Personas', value: personas.length, icon: '✨', color: 'primary' as const },
    { id: 'bots', title: 'Total Bots', value: bots.length, icon: '🤖', color: 'secondary' as const }
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
        title="Personas"
        description="Manage AI personalities and prompts"
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

      {/* Persona List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : personas.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No personas found"
          description="Create your first persona to get started"
          action={
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4" /> Create Persona
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {personas.map(persona => (
            <Card key={persona.id} className="hover:shadow-md transition-all flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-base-200">
                    <User className="w-5 h-5 text-base-content/70" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{persona.name}</h3>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex-1">
                 <div className="bg-base-200/50 p-3 rounded-lg mb-3">
                    <h4 className="text-xs font-bold text-base-content/40 uppercase mb-1">System Prompt</h4>
                    <p className="text-sm text-base-content/80 line-clamp-3 italic">
                        "{persona.systemPrompt}"
                    </p>
                 </div>

                <h4 className="text-xs font-medium text-base-content/50 mb-2 uppercase">Assigned Bots</h4>
                {persona.assignedBots.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {persona.assignedBots.map(botName => (
                      <Badge key={botName} variant="secondary" size="sm" style="outline">
                        {botName}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-base-content/40 italic">No bots assigned</span>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-base-200 mt-auto">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(persona)}>
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeletePersona(persona.id)}
                    disabled={persona.name === 'default'}
                    className="text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => { setShowCreateModal(false); setShowEditModal(false); }}
        title={editingPersona ? `Edit Persona: ${editingPersona.name}` : "Create New Persona"}
        size="lg"
      >
        <div className="space-y-4">
            <div className="form-control">
            <label className="label"><span className="label-text">Persona Name</span></label>
            <Input
                placeholder="my-persona"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                disabled={!!editingPersona && personaName === 'default'} // Cannot rename default
            />
            </div>

            <div className="form-control">
            <label className="label"><span className="label-text">System Prompt</span></label>
            <textarea
                className="textarea textarea-bordered h-32 font-mono text-sm leading-relaxed"
                value={personaPrompt}
                onChange={(e) => setPersonaPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
            />
            </div>

            {/* Info Alert about Persistence */}
            <div role="alert" className="alert alert-info py-2 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Personas are currently stored on bot instances. To save a new persona, it must be assigned to at least one bot.</span>
            </div>

            <div className="form-control">
                <label className="label"><span className="label-text">Assign to Bots</span></label>
                <div className="bg-base-200 rounded-box p-2 max-h-40 overflow-y-auto">
                    {bots.length === 0 ? <div className="p-2 text-sm opacity-50">No bots available</div> : 
                     bots.map(bot => (
                        <label key={bot.id} className="cursor-pointer label justify-start gap-3 hover:bg-base-300 rounded-lg">
                            <input 
                                type="checkbox" 
                                className="checkbox checkbox-sm checkbox-primary"
                                checked={selectedBotIds.includes(bot.id)}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedBotIds([...selectedBotIds, bot.id]);
                                    else setSelectedBotIds(selectedBotIds.filter(id => id !== bot.id));
                                }}
                            />
                            <span className="label-text flex-1">
                                {bot.name} 
                                <span className="text-xs opacity-50 ml-2">({bot.persona || 'default'})</span>
                            </span>
                        </label>
                    ))}
                </div>
                {selectedBotIds.length === 0 && !editingPersona && (
                    <div className="label">
                        <span className="label-text-alt text-warning">You must assign a newly created persona to at least one bot to save it.</span>
                    </div>
                )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>Cancel</Button>
                <Button variant="primary" onClick={handleSavePersona} disabled={loading || (!editingPersona && selectedBotIds.length === 0)}>
                    {loading ? <LoadingSpinner size="sm" /> : (editingPersona ? 'Save Changes' : 'Create Persona')}
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default PersonasPage;