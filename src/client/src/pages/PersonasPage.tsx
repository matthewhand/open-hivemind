/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  Eye,
  GripVertical,
  Info,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useUrlParams from '../hooks/useUrlParams';
import { Alert } from '../components/DaisyUI/Alert';
import Badge from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';
import Card from '../components/DaisyUI/Card';
import Input from '../components/DaisyUI/Input';
import EmptyState from '../components/DaisyUI/EmptyState';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import Modal from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import ToastNotification, { useInfoToast } from '../components/DaisyUI/ToastNotification';
import SearchFilterBar from '../components/SearchFilterBar';
import { apiService, type Persona as ApiPersona, type Bot } from '../services/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useBulkSelection } from '../hooks/useBulkSelection';
import BulkActionBar from '../components/BulkActionBar';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useIsBelowBreakpoint } from '../hooks/useBreakpoint';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/DaisyUI/Pagination';

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

// Character limit for truncating system prompts
const PROMPT_CHAR_LIMIT = 150;

const PersonasPage: React.FC = () => {
  const infoToast = useInfoToast();
  const [bots, setBots] = useState<Bot[]>([]); // Bot type from API
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const successToast = ToastNotification.useSuccessToast();
  const errorToast = ToastNotification.useErrorToast();

  // Filter State (URL-persisted)
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    category: { type: 'string', default: 'all' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const selectedCategory = urlParams.category;
  const setSelectedCategory = (v: string) => setUrlParam('category', v);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPersona, setDeletingPersona] = useState<Persona | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [cloningPersonaId, setCloningPersonaId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  // Form State
  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]); // Bot IDs are strings in new API
  const [personaCategory, setPersonaCategory] = useState<ApiPersona['category']>('general');

  // Cached queries for config and personas
  const {
    data: configResponse,
    loading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useApiQuery<any>('/api/config', { ttl: 30_000 });

  const {
    data: personasResponse,
    loading: personasLoading,
    error: personasError,
    refetch: refetchPersonas,
  } = useApiQuery<ApiPersona[]>('/api/personas', { ttl: 30_000 });

  // Derive bots and personas from cached responses
  useEffect(() => {
    const botList = configResponse?.bots || [];
    const filledBots = botList.map((b: any) => ({
      ...b,
      id: b.id || b.name,
    }));
    setBots(filledBots);

    const rawPersonas = personasResponse || [];
    const mappedPersonas = rawPersonas.map((p) => {
      const assigned = filledBots.filter((b: any) => b.persona === p.id || b.persona === p.name);
      return {
        ...p,
        assignedBotNames: assigned.map((b: any) => b.name),
        assignedBotIds: assigned.map((b: any) => b.id),
      };
    });
    setPersonas(mappedPersonas);
  }, [configResponse, personasResponse]);

  // Sync loading/error state
  useEffect(() => {
    setLoading(configLoading || personasLoading);
  }, [configLoading, personasLoading]);

  useEffect(() => {
    const err = configError || personasError;
    setError(err ? err.message : null);
  }, [configError, personasError]);

  const fetchData = useCallback(async () => {
    await Promise.all([refetchConfig(), refetchPersonas()]);
  }, [refetchConfig, refetchPersonas]);

  // Derive filtered personas
  const filteredPersonas = useMemo(() => {
    return personas.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [personas, searchQuery, selectedCategory]);

  // Pagination
  const pagination = usePagination(filteredPersonas, {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  });

  // Bulk selection
  const filteredPersonaIds = useMemo(() => filteredPersonas.filter(p => !p.isBuiltIn).map(p => p.id), [filteredPersonas]);
  const bulk = useBulkSelection(filteredPersonaIds);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const isMobile = useIsBelowBreakpoint('md');

  const handlePersonaReorder = useCallback(async (reordered: Persona[]) => {
    setPersonas(reordered);
    try {
      const ids = reordered.map(p => p.id);
      await apiService.put('/api/personas/reorder', { ids });
    } catch { /* persist error ignored */ }
  }, []);

  const {
    onDragStart: onPersonaDragStart,
    onDragOver: onPersonaDragOver,
    onDragEnd: onPersonaDragEnd,
    onDrop: onPersonaDrop,
    onMoveUp: onPersonaMoveUp,
    onMoveDown: onPersonaMoveDown,
    getItemStyle: getPersonaItemStyle,
  } = useDragAndDrop({
    items: pagination.paginatedItems,
    idAccessor: (p) => p.id,
    onReorder: handlePersonaReorder,
  });

  const handleBulkDeletePersonas = async () => {
    if (bulk.selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(bulk.selectedIds);
      // Revert bots for each persona, then delete
      for (const id of ids) {
        const persona = personas.find(p => p.id === id);
        if (persona) {
          const updates = persona.assignedBotIds.map((botId) =>
            apiService.updateBot(botId, { persona: 'default', systemInstruction: 'You are a helpful assistant.' })
          );
          await Promise.allSettled(updates);
          await apiService.deletePersona(id);
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
      // errorToast shown below
      errorToast('Error', 'Failed to copy to clipboard');
    }
  };

  const togglePromptExpansion = (personaId: string) => {
    setExpandedPrompts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(personaId)) {
        newSet.delete(personaId);
      } else {
        newSet.add(personaId);
      }
      return newSet;
    });
  };

  const handleSavePersona = async () => {
    if (!personaName.trim()) {
      return;
    }

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

      // ⚡ Bolt Optimization: Replace O(N*M) nested loop search with O(N+M) map lookup
      const botsById = new Map(bots.map((b: any) => [b.id, b]));

      // 1. Assign to selected bots
      for (const botId of selectedBotIds) {
        // Only update if not already assigned
        const bot = botsById.get(botId);
        if (bot && bot.persona !== newPersonaId) {
          updates.push(
            apiService.updateBot(botId, {
              persona: newPersonaId,
              systemInstruction: personaPrompt, // Ensure prompt sync
            })
          );
        }
      }

      // 2. Unassign from deselected bots (only if editing)
      if (editingPersona) {
        const originallyAssigned = editingPersona.assignedBotIds;
        const toUnassign = originallyAssigned.filter((id) => !selectedBotIds.includes(id));

        for (const botId of toUnassign) {
          updates.push(
            apiService.updateBot(botId, {
              persona: 'default', // Revert to default
              systemInstruction: 'You are a helpful assistant.', // Default prompt
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
    } catch (err) {
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
      infoToast('Built-in Persona', 'Cannot edit built-in personas directly. Clone them instead.');
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
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) {
      return;
    }
    if (persona.isBuiltIn) {
      setError('Cannot delete built-in personas');
      return;
    }
    setDeletingPersona(persona);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingPersona) {
      return;
    }
    setLoading(true);
    try {
      // 1. Revert bots
      const updates = deletingPersona.assignedBotIds.map((botId) =>
        apiService.updateBot(botId, {
          persona: 'default',
          systemInstruction: 'You are a helpful assistant.',
        })
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

  const stats = useMemo(() => {
    const active = personas.reduce((acc, p) => acc + p.assignedBotNames.length, 0);
    const custom = personas.reduce((acc, p) => acc + (p.isBuiltIn ? 0 : 1), 0);

    return [
      {
        id: 'total',
        title: 'Total Personas',
        value: personas.length,
        icon: '✨',
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: 'Assigned Bots',
        value: active,
        icon: '🤖',
        color: 'secondary' as const,
      },
      {
        id: 'custom',
        title: 'Custom Personas',
        value: custom,
        icon: 'user',
        color: 'accent' as const,
      },
    ];
  }, [personas]);

  // Loading skeleton component for persona cards
  const PersonaCardSkeleton = () => (
    <Card className="flex flex-col h-full animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 w-full">
          <div className="w-4 h-4 bg-base-300 rounded"></div>
          <div className="w-10 h-10 bg-base-300 rounded-full"></div>
          <div className="flex-1">
            <div className="h-5 bg-base-300 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-base-300 rounded w-1/3"></div>
          </div>
        </div>
      </div>
      <div className="mb-4 flex-1">
        <div className="h-4 bg-base-300 rounded w-full mb-2"></div>
        <div className="h-4 bg-base-300 rounded w-2/3 mb-3"></div>
        <div className="bg-base-200/50 p-3 rounded-lg mb-3">
          <div className="h-3 bg-base-300 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-base-300 rounded w-full mb-1"></div>
          <div className="h-3 bg-base-300 rounded w-5/6"></div>
        </div>
        <div className="h-3 bg-base-300 rounded w-1/4 mb-2"></div>
        <div className="flex gap-1">
          <div className="h-5 bg-base-300 rounded w-16"></div>
          <div className="h-5 bg-base-300 rounded w-16"></div>
        </div>
      </div>
      <div className="flex items-center justify-end pt-3 border-t border-base-200 gap-2">
        <div className="h-8 bg-base-300 rounded w-16"></div>
        <div className="h-8 bg-base-300 rounded w-16"></div>
        <div className="h-8 bg-base-300 rounded w-16"></div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Error Alert */}
      {error && <Alert status="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <PageHeader
        title="Personas (Beta)"
        description="Manage AI personalities and system prompts"
        icon={Sparkles}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={fetchData} disabled={loading} aria-busy={loading} className="min-h-[44px]">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="primary" onClick={openCreateModal} className="min-h-[44px]">
              <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Create</span><span className="hidden sm:inline"> Persona</span>
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
          <div className="text-sm">
            Personas define the personality and base instructions for your bots. You can assign the
            same persona to multiple bots. Changes here update all assigned bots.
          </div>
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
            className: 'w-full sm:w-1/3 md:w-1/4',
          },
        ]}
      />

      {/* Persona List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <PersonaCardSkeleton key={index} />
          ))}
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
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('all');
          }}
          variant="noResults"
        />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={bulk.isAllSelected}
              onChange={() => bulk.toggleAll(filteredPersonaIds)}
              aria-label="Select all personas"
            />
            <span className="text-xs text-base-content/60">Select all (custom only)</span>
          </div>
          <BulkActionBar
            selectedCount={bulk.selectedCount}
            onClearSelection={bulk.clearSelection}
            actions={[
              {
                key: 'delete',
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                variant: 'error',
                onClick: handleBulkDeletePersonas,
                loading: bulkDeleting,
              },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {pagination.paginatedItems.map((persona, index) => {
            const isExpanded = expandedPrompts.has(persona.id);
            const shouldTruncate = persona.systemPrompt.length > PROMPT_CHAR_LIMIT;
            const displayPrompt = shouldTruncate && !isExpanded
              ? `${persona.systemPrompt.slice(0, PROMPT_CHAR_LIMIT)}...`
              : persona.systemPrompt;

            return (
            <Card
              key={persona.id}
              data-testid="persona-card"
              draggable={!isMobile}
              onDragStart={onPersonaDragStart(index)}
              onDragOver={onPersonaDragOver(index)}
              onDragEnd={onPersonaDragEnd}
              onDrop={onPersonaDrop(index)}
              style={getPersonaItemStyle(index)}
              className={`hover:shadow-md transition-all flex flex-col h-full ${persona.isBuiltIn ? 'border-l-4 border-l-primary/30' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {isMobile ? (
                    <span className="flex flex-col">
                      <button
                        className="btn btn-ghost btn-xs btn-square p-0"
                        onClick={() => onPersonaMoveUp(index)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        className="btn btn-ghost btn-xs btn-square p-0"
                        onClick={() => onPersonaMoveDown(index)}
                        disabled={index === pagination.paginatedItems.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </span>
                  ) : (
                    <span
                      className="cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/70"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                  )}
                  {!persona.isBuiltIn && (
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={bulk.isSelected(persona.id)}
                      onChange={(e) => bulk.toggleItem(persona.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${persona.name}`}
                    />
                  )}
                  <div
                    className={`p-2 rounded-full ${persona.isBuiltIn ? 'bg-primary/10 text-primary' : 'bg-base-200'}`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{persona.name}</h3>
                      {persona.isBuiltIn && (
                        <Badge size="small" variant="neutral" style="outline">
                          Built-in
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-base-content/60">{persona.category}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex-1">
                <p className="text-sm text-base-content/70 mb-3">{persona.description}</p>
                <div className="bg-base-200/50 p-3 rounded-lg mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-base-content/40 uppercase">
                      System Prompt
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="tooltip" data-tip="Copy System Prompt">
                        <button
                          className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-primary"
                          onClick={() => handleCopyPrompt(persona.systemPrompt)}
                          aria-label="Copy System Prompt"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-base-content/80 italic font-mono text-xs">
                    "{displayPrompt}"
                  </p>
                  {shouldTruncate && (
                    <button
                      className="btn btn-ghost btn-xs mt-2 text-primary"
                      onClick={() => togglePromptExpansion(persona.id)}
                      aria-label={isExpanded ? "Show less" : "Read more"}
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-base-content/50 uppercase">
                    Assigned Bots
                  </h4>
                </div>

                {persona.assignedBotNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {persona.assignedBotNames.slice(0, 3).map((botName) => (
                      <Badge key={botName} variant="secondary" size="small" style="outline">
                        {botName}
                      </Badge>
                    ))}
                    {persona.assignedBotNames.length > 3 && (
                      <Badge variant="ghost" size="small">
                        +{persona.assignedBotNames.length - 3} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-base-content/40 italic">No bots assigned</span>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-base-200 mt-auto gap-2">
                <div className="tooltip" data-tip="View Details">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openViewModal(persona)}
                    aria-label={`View ${persona.name}`}
                  >
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                </div>
                <div className="tooltip" data-tip="Clone Persona">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openCloneModal(persona)}
                    aria-label={`Clone ${persona.name}`}
                  >
                    <Copy className="w-4 h-4 mr-1" /> Clone
                  </Button>
                </div>
                {!persona.isBuiltIn && (
                  <>
                    <div className="tooltip" data-tip="Edit Persona">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(persona)}
                        aria-label={`Edit ${persona.name}`}
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </Button>
                    </div>
                    <div className="tooltip" data-tip="Delete Persona">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePersona(persona.id)}
                        className="text-error hover:bg-error/10"
                        aria-label={`Delete ${persona.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          );
          })}
        </div>

        {/* Pagination */}
        {filteredPersonas.length > 10 && (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.currentPage}
              totalItems={filteredPersonas.length}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              style="extended"
              showPageSizeSelector={true}
              showItemsInfo={true}
            />
          </div>
        )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        title={
          isViewMode
            ? `View Persona: ${editingPersona?.name}`
            : editingPersona
              ? `Edit Persona: ${editingPersona.name}`
              : cloningPersonaId
                ? 'Clone Persona'
                : 'Create New Persona'
        }
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
            <label className="label">
              <span className="label-text">Category</span>
            </label>
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
                <div
                  className="tooltip tooltip-right"
                  data-tip="The core instruction set that governs the AI's behavior, tone, and capabilities."
                >
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
                <div
                  className="tooltip tooltip-right"
                  data-tip="Select which bots should use this persona. They will be updated immediately upon saving."
                >
                  <Info className="w-3 h-3 text-base-content/40" />
                </div>
              </span>
              <span className="label-text-alt text-base-content/60">Optional</span>
            </label>
            <div className="bg-base-200 rounded-box p-2 max-h-40 overflow-y-auto">
              {bots.length === 0 ? (
                <div className="p-2 text-sm opacity-50">No bots available</div>
              ) : (
                bots.map((bot: any) => {
                  const isEnvLocked = bot.envOverrides?.persona;
                  return (
                    <label
                      key={bot.id}
                      className={`cursor-pointer label justify-start gap-3 rounded-lg ${isEnvLocked || isViewMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
                      title={isEnvLocked ? 'Persona is locked by environment variable' : ''}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={selectedBotIds.includes(bot.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBotIds([...selectedBotIds, bot.id]);
                          } else {
                            setSelectedBotIds(selectedBotIds.filter((id) => id !== bot.id));
                          }
                        }}
                        disabled={!!isEnvLocked || isViewMode}
                      />
                      <div className="flex flex-col">
                        <span className="label-text font-medium flex items-center gap-2">
                          {bot.name}
                          {isEnvLocked && <Shield className="w-3 h-3 text-warning" />}
                        </span>
                        <span className="text-xs opacity-50">
                          Current:{' '}
                          {bot.persona
                            ? personas.find((p) => p.id === bot.persona || p.name === bot.persona)
                                ?.name || bot.persona
                            : 'default'}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
              }}
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </Button>
            {!isViewMode && (
              <Button variant="primary" onClick={handleSavePersona} disabled={loading} aria-busy={loading}>
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : editingPersona ? (
                  'Save Changes'
                ) : cloningPersonaId ? (
                  'Clone Persona'
                ) : (
                  'Create Persona'
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingPersona(null);
        }}
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
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingPersona(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="btn-error"
              onClick={confirmDelete}
              disabled={loading} aria-busy={loading}
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
