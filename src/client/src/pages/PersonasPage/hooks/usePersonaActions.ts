import { useCallback, useState } from 'react';
import { apiService } from '../../../services/api';
import { type ApiPersona, type Bot, type Persona } from './usePersonasData';

export const usePersonaActions = (
  personas: Persona[],
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>,
  bots: Bot[],
  fetchData: () => Promise<void>,
  successToast: (title?: string, message?: string) => void,
  errorToast: (title?: string, message?: string) => void,
  infoToast: (title?: string, message?: string) => void,
  bulk: any,
  showStamp?: () => void
) => {
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPersona, setDeletingPersona] = useState<Persona | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [cloningPersonaId, setCloningPersonaId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [personaCategory, setPersonaCategory] = useState<ApiPersona['category']>('general');

  const handlePersonaReorder = useCallback(
    async (reordered: Persona[]) => {
      setPersonas(reordered);
      try {
        const ids = reordered.map((p) => p.id);
        await apiService.put('/api/personas/reorder', { ids });
      } catch {
        /* persist error ignored */
      }
    },
    [setPersonas]
  );

  const handleBulkDeletePersonas = async () => {
    if (bulk.selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(bulk.selectedIds);
      for (const id of ids) {
        const persona = personas.find((p) => p.id === id);
        if (persona) {
          const updates = (persona.assignedBotIds || []).map((botId) =>
            apiService.updateBot(botId, {
              persona: 'default',
              systemInstruction: 'You are a helpful assistant.',
            })
          );
          await Promise.allSettled(updates);
          await apiService.deletePersona(id as any);
        }
      }
      await fetchData();
      bulk.clearSelection();
      successToast('Selected personas deleted');
    } catch (err) {
      errorToast('Error', 'Failed to delete some personas');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      successToast('Copied!', 'System prompt copied to clipboard');
    } catch (err) {
      errorToast('Error', 'Failed to copy to clipboard');
    }
  };

  const handleSavePersona = async (
    setLoading: (l: boolean) => void,
    setError: (e: string) => void
  ) => {
    if (!personaName.trim()) return;

    setLoading(true);
    try {
      let savedPersona: ApiPersona;

      const personaData = {
        name: personaName,
        description: personaDescription || 'Custom Persona',
        category: personaCategory,
        systemPrompt: personaPrompt,
        traits: [],
      };

      if (cloningPersonaId) {
        savedPersona = await apiService.clonePersona(cloningPersonaId as any, {
          name: personaName,
          description: personaDescription,
          category: personaCategory as any,
          systemPrompt: personaPrompt,
        });
      } else if (editingPersona) {
        savedPersona = await apiService.updatePersona(editingPersona.id as any, personaData as any);
      } else {
        savedPersona = await apiService.createPersona(personaData as any);
      }

      const newPersonaId = savedPersona.id;
      const updates: Promise<any>[] = [];

      const botsById = new Map(bots.map((b: any) => [b.id, b]));

      for (const botId of selectedBotIds) {
        const bot = botsById.get(botId);
        if (bot && bot.persona !== newPersonaId) {
          updates.push(
            apiService.updateBot(botId, {
              persona: newPersonaId,
              systemInstruction: personaPrompt,
            })
          );
        }
      }

      if (editingPersona) {
        const originallyAssigned = editingPersona.assignedBotIds || [];
        const toUnassign = originallyAssigned.filter((id) => !selectedBotIds.includes(id));

        for (const botId of toUnassign) {
          updates.push(
            apiService.updateBot(botId, {
              persona: 'default',
              systemInstruction: 'You are a helpful assistant.',
            })
          );
        }
      }

      await Promise.all(updates);
      await fetchData();

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingPersona(null);
      setCloningPersonaId(null);
      successToast(
        'Success',
        editingPersona && !cloningPersonaId
          ? 'Persona updated successfully'
          : 'Persona created successfully'
      );
      showStamp?.();
    } catch (err: any) {
      errorToast('Save Failed', 'Failed to save persona changes');
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
    setPersonaCategory(persona.category as any);
    setPersonaPrompt(persona.systemPrompt);
    setSelectedBotIds([]);
    setEditingPersona(null);
    setCloningPersonaId(persona.id);
    setIsViewMode(false);
    setShowCreateModal(true);
  };

  const openEditModal = (persona: Persona) => {
    if (persona.isBuiltIn) {
      infoToast('Built-in Persona', 'Cannot edit built-in personas directly. Clone them instead.');
      return;
    }
    setPersonaName(persona.name);
    setPersonaDescription(persona.description);
    setPersonaCategory(persona.category as any);
    setPersonaPrompt(persona.systemPrompt);
    setSelectedBotIds(persona.assignedBotIds || []);
    setEditingPersona(persona);
    setCloningPersonaId(null);
    setIsViewMode(false);
    setShowEditModal(true);
  };

  const openViewModal = (persona: Persona) => {
    setPersonaName(persona.name);
    setPersonaDescription(persona.description);
    setPersonaCategory(persona.category as any);
    setPersonaPrompt(persona.systemPrompt);
    setSelectedBotIds(persona.assignedBotIds || []);
    setEditingPersona(persona);
    setIsViewMode(true);
    setShowEditModal(true);
  };

  const handleDeletePersona = (personaId: string, setError: (e: string) => void) => {
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) return;
    if (persona.isBuiltIn) {
      setError('Cannot delete built-in personas');
      return;
    }
    setDeletingPersona(persona);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (setLoading: (l: boolean) => void, setError: (e: string) => void) => {
    if (!deletingPersona) return;
    setLoading(true);
    try {
      const updates = (deletingPersona.assignedBotIds || []).map((botId) =>
        apiService.updateBot(botId, {
          persona: 'default',
          systemInstruction: 'You are a helpful assistant.',
        })
      );
      await Promise.all(updates);
      await apiService.deletePersona(deletingPersona.id as any);
      await fetchData();
      setShowDeleteModal(false);
      setDeletingPersona(null);
    } catch (err) {
      setError('Failed to delete persona');
    } finally {
      setLoading(false);
    }
  };

  return {
    bulkDeleting,
    handlePersonaReorder,
    handleBulkDeletePersonas,
    handleCopyPrompt,
    handleSavePersona,
    handleDeletePersona,
    confirmDelete,
    openCreateModal,
    openCloneModal,
    openEditModal,
    openViewModal,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    showDeleteModal,
    setShowDeleteModal,
    deletingPersona,
    editingPersona,
    cloningPersonaId,
    isViewMode,
    personaName,
    setPersonaName,
    personaDescription,
    setPersonaDescription,
    personaPrompt,
    setPersonaPrompt,
    selectedBotIds,
    setSelectedBotIds,
    personaCategory,
    setPersonaCategory,
  };
};
