import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useUrlParams from '../../hooks/useUrlParams';
import { apiService, type Persona as ApiPersona, type Bot } from '../../services/api';
import { useInfoToast, useSuccessToast, useErrorToast } from '../DaisyUI/ToastNotification';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { logger } from '../../utils/logger';

export interface Persona extends ApiPersona {
  assignedBotNames: string[];
  assignedBotIds: string[];
}

export function usePersonasLogic() {
  const infoToast = useInfoToast();
  const [bots, setBots] = useState<Bot[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [error, setError] = useState<string | null>(null);

  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const queryClient = useQueryClient();

  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    category: { type: 'string', default: 'all' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const selectedCategory = urlParams.category;
  const setSelectedCategory = (v: string) => setUrlParam('category', v);

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

  // Mutation loading state (for saves/deletes, not initial fetch)
  const [mutating, setMutating] = useState(false);

  const {
    data: configResponse,
    isLoading: botsLoading,
    error: botsError,
  } = useQuery<any>({
    queryKey: ['personasLogic', 'config'],
    queryFn: () => apiService.get('/api/config/global'),
  });

  const {
    data: personasResponse,
    isLoading: personasLoading,
    error: personasError,
  } = useQuery<ApiPersona[]>({
    queryKey: ['personasLogic', 'personas'],
    queryFn: () => apiService.get<ApiPersona[]>('/api/personas'),
  });

  const loading = botsLoading || personasLoading || mutating;

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['personasLogic'] });
    } catch (err: any) {
      setError('Failed to fetch data.');
      logger.error(err);
    }
  }, [queryClient]);

  useEffect(() => {
    if (botsLoading || personasLoading) return;

    if (botsError || personasError) {
      const msg = (botsError instanceof Error ? botsError.message : null)
        || (personasError instanceof Error ? personasError.message : null)
        || 'Failed to fetch data';
      setError(msg);
      return;
    }

    const botList = configResponse?.bots || [];
    const filledBots = botList.map((b: any) => ({
      ...b,
      id: b.id || b.BOT_ID || b.name,
      name: b.name || b.BOT_NAME || 'Unknown Bot',
    }));
    setBots(filledBots);

    const rawPersonas = personasResponse || [];
    const mappedPersonas = rawPersonas.map((p) => {
      const assignedIds = Array.isArray(p.bots) ? p.bots : [];
      const assignedNames = assignedIds.map((bid: string) => {
        const found = filledBots.find((b: any) => b.id === bid);
        return found ? found.name : bid;
      });
      return {
        ...p,
        assignedBotIds: assignedIds,
        assignedBotNames: assignedNames,
      };
    });
    setPersonas(mappedPersonas);
  }, [configResponse, personasResponse, botsLoading, personasLoading, botsError, personasError]);

  const bulkSelection = useBulkSelection(personas);
  const dragAndDrop = useDragAndDrop(personas, 'id');

  const filteredPersonas = useMemo(() => {
    let result = personas;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.prompt.toLowerCase().includes(q)
      );
    }
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }
    return result;
  }, [personas, searchQuery, selectedCategory]);

  dragAndDrop.items = filteredPersonas;

  const handlePersonaReorder = useCallback(async (reordered: Persona[]) => {
    try {
      setPersonas(reordered);
    } catch (_err) {
      errorToast('Failed to update persona order');
      await fetchData();
    }
  }, [errorToast, fetchData]);

  useEffect(() => {
    dragAndDrop.onReorder = handlePersonaReorder;
  }, [handlePersonaReorder]);

  const handleBulkDeletePersonas = async () => {
    if (bulkSelection.selectedIds.size === 0) return;
    try {
      setMutating(true);
      const promises = Array.from(bulkSelection.selectedIds).map((id) =>
        apiService.delete(`/api/personas/${id}`)
      );
      await Promise.all(promises);
      successToast(`Deleted ${bulkSelection.selectedIds.size} personas`);
      bulkSelection.clearSelection();
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete selected personas');
      errorToast('Failed to delete selected personas');
    } finally {
      setMutating(false);
    }
  };

  const openCreateModal = () => {
    setEditingPersona(null);
    setPersonaName('');
    setPersonaDescription('');
    setPersonaPrompt('');
    setSelectedBotIds([]);
    setPersonaCategory('general');
    setIsViewMode(false);
    setShowCreateModal(true);
  };

  const openCloneModal = (persona: Persona) => {
    setCloningPersonaId(persona.id);
    setEditingPersona(null);
    setPersonaName(`${persona.name} (Copy)`);
    setPersonaDescription(persona.description || '');
    setPersonaPrompt(persona.prompt);
    setSelectedBotIds(persona.assignedBotIds);
    setPersonaCategory(persona.category || 'general');
    setIsViewMode(false);
    setShowCreateModal(true);
  };

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      successToast('Prompt copied to clipboard');
    } catch (_err) {
      errorToast('Failed to copy prompt');
    }
  };

  const openEditModal = (persona: Persona) => {
    if (persona.isEnvLocked) {
      infoToast('Persona is locked by environment variable and cannot be edited.', 'Locked Persona');
      return;
    }
    setEditingPersona(persona);
    setPersonaName(persona.name);
    setPersonaDescription(persona.description || '');
    setPersonaPrompt(persona.prompt);
    setSelectedBotIds(persona.assignedBotIds);
    setPersonaCategory(persona.category || 'general');
    setIsViewMode(false);
    setShowEditModal(true);
  };

  const openViewModal = (persona: Persona) => {
    setEditingPersona(persona);
    setPersonaName(persona.name);
    setPersonaDescription(persona.description || '');
    setPersonaPrompt(persona.prompt);
    setSelectedBotIds(persona.assignedBotIds);
    setPersonaCategory(persona.category || 'general');
    setIsViewMode(true);
    setShowEditModal(true);
  };

  const handleSavePersona = async () => {
    if (!personaName.trim()) {
      errorToast('Persona name is required');
      return;
    }
    if (!personaPrompt.trim()) {
      errorToast('System prompt is required');
      return;
    }

    try {
      setMutating(true);
      const payload: Partial<ApiPersona> = {
        name: personaName.trim(),
        description: personaDescription.trim() || undefined,
        prompt: personaPrompt.trim(),
        bots: selectedBotIds,
        category: personaCategory,
      };

      if (editingPersona) {
        if (editingPersona.isEnvLocked) {
          throw new Error('Cannot edit a locked persona');
        }
        await apiService.put(`/api/personas/${editingPersona.id}`, payload);
        successToast('Persona updated successfully');
        setShowEditModal(false);
      } else {
        await apiService.post('/api/personas', payload);
        successToast('Persona created successfully');
        setShowCreateModal(false);
        if (cloningPersonaId) {
            setCloningPersonaId(null);
        }
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save persona');
      errorToast('Failed to save persona');
    } finally {
      setMutating(false);
    }
  };

  const handleDeletePersona = async (personaId: string) => {
    try {
      setMutating(true);
      await apiService.delete(`/api/personas/${personaId}`);
      successToast('Persona deleted successfully');
      setShowDeleteModal(false);
      setDeletingPersona(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete persona');
      errorToast('Failed to delete persona');
    } finally {
      setMutating(false);
    }
  };

  const stats = useMemo(() => [
    { label: 'Total Personas', value: personas.length, color: 'text-primary' },
    { label: 'Env Locked', value: personas.filter(p => p.isEnvLocked).length, color: 'text-warning' },
    { label: 'Categories', value: new Set(personas.map(p => p.category)).size, color: 'text-info' },
  ], [personas]);

  return {
    bots,
    personas,
    loading,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    showDeleteModal,
    setShowDeleteModal,
    deletingPersona,
    setDeletingPersona,
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
    bulkSelection,
    dragAndDrop,
    filteredPersonas,
    stats,
    fetchData,
    openCreateModal,
    openCloneModal,
    openEditModal,
    openViewModal,
    handleSavePersona,
    handleDeletePersona,
    handleBulkDeletePersonas,
    handleCopyPrompt,
  };
}
