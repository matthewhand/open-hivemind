import { Copy, Edit2, Plus, Search, Settings, Trash2, Users } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/DaisyUI/Alert';
import PageHeader from '../../components/DaisyUI/PageHeader';
import Button from '../../components/DaisyUI/Button';
import EmptyState from '../../components/DaisyUI/EmptyState';
import { Badge } from '../../components/DaisyUI/Badge';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import { useSuccessToast, useErrorToast, useInfoToast } from '../../components/DaisyUI/ToastNotification';
import SearchFilterBar from '../../components/SearchFilterBar';
import Card from '../../components/DaisyUI/Card';
import DetailDrawer from '../../components/DaisyUI/DetailDrawer';
import { ConfirmModal } from '../../components/DaisyUI/Modal';
import Tabs from '../../components/DaisyUI/Tabs';
import { PersonaModal } from '../../components/Personas/PersonaModal';
import { PersonaSettingsTab } from './PersonaSettingsTab';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { usePersonaActions } from './hooks/usePersonaActions';
import { usePersonasData, type Persona } from './hooks/usePersonasData';
import { PersonaList } from './PersonaList';
import { PersonaStats } from './PersonaStats';
import { useSavedStamp } from '../../contexts/SavedStampContext';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'general', label: 'General Assistants' },
  { id: 'development', label: 'Software Development' },
  { id: 'creative', label: 'Creative & Writing' },
  { id: 'analysis', label: 'Data Analysis' },
  { id: 'support', label: 'Customer Support' },
];

const PersonasPage: React.FC = () => {
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const infoToast = useInfoToast();
  const { showStamp } = useSavedStamp();
  const isMobile = useIsBelowBreakpoint('md');
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  const {
    bots,
    personas,
    error: dataError,
    fetchData,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredPersonas,
    filteredPersonaIds,
    loading: dataLoading,
    setPersonas,
  } = usePersonasData();

  const bulk = useBulkSelection(filteredPersonaIds);

  const {
    bulkDeleting,
    handlePersonaReorder,
    handleBulkDeletePersonas,
    openCreateModal,
    openEditModal,
    openCloneModal,
    handleCopyPrompt,
    handleDeletePersona,
    // Modal state and form state for rendering PersonaModal
    showCreateModal,
    showEditModal,
    showDeleteModal,
    setShowDeleteModal,
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
    personaCategory,
    setPersonaCategory,
    selectedBotIds,
    setSelectedBotIds,
    handleSavePersona: savePersona,
    confirmDelete,
    deletingPersona,
    closeModals,
    avatarStyle,
    setAvatarStyle,
    responseBehavior,
    setResponseBehavior,
  } = usePersonaActions(
    personas,
    setPersonas as any,
    bots,
    fetchData,
    successToast,
    errorToast,
    infoToast,
    bulk,
    showStamp
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = useCallback(() => {
    savePersona(setSaving, (msg) => setError(msg));
  }, [savePersona]);

  const handleConfirmDelete = useCallback(() => {
    confirmDelete(setDeleting, (msg) => setError(msg));
  }, [confirmDelete]);

  const { onDragStart, onDragOver, onDragEnd, onDrop, getItemStyle } = useDragAndDrop({
    items: filteredPersonas,
    idAccessor: (p) => p.id,
    onReorder: handlePersonaReorder,
  });

  const activeTab = searchParams.get('tab') || 'profiles';
  const handleTabChange = (tabId: string) => {
    setSearchParams(tabId === 'profiles' ? {} : { tab: tabId }, { replace: true });
  };

  if (dataLoading) return <SkeletonPage variant="cards" statsCount={3} showFilters />;

  const displayError = error || dataError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personas"
        description="Define and manage persona presets for your bots."
        icon={Users}
        gradient="primary"
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" /> Create Persona
          </Button>
        }
      />

      {displayError && <Alert status="error" message={displayError} onClose={() => setError(null)} />}

      <Tabs
        variant="lifted"
        activeTab={activeTab}
        onChange={handleTabChange}
        tabs={[
          {
            id: 'profiles',
            label: 'Profiles',
            icon: <Users className="w-4 h-4" />,
            content: (
              <div className="space-y-6">
                <PersonaStats personas={personas} />

                <Card className="shadow-xl border border-base-200">
                  <SearchFilterBar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search personas by name or description..."
                  >
                    {/* Category filter hidden — roadmap: user-defined categories */}
                  </SearchFilterBar>

                  {!displayError && filteredPersonas.length > 0 && (
                    <PersonaList
                      filteredPersonas={filteredPersonas}
                      filteredPersonaIds={filteredPersonaIds}
                      bulk={bulk}
                      bulkDeleting={bulkDeleting}
                      handleBulkDeletePersonas={handleBulkDeletePersonas}
                      openEditModal={openEditModal}
                      openCloneModal={openCloneModal}
                      handleCopyPrompt={handleCopyPrompt}
                      onSelectPersona={setSelectedPersona}
                      isMobile={isMobile}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      onDrop={onDrop}
                      getItemStyle={getItemStyle}
                    />
                  )}
                  {!displayError && filteredPersonas.length === 0 && (
                    <EmptyState
                      icon={Search}
                      variant="noResults"
                      title={personas.length === 0 ? 'No personas yet' : 'No personas found'}
                      description={
                        personas.length === 0
                          ? 'Create your first persona to get started.'
                          : 'No personas match your search. Try adjusting your search or filters.'
                      }
                      actionLabel={personas.length === 0 ? 'Create Persona' : 'Clear Filters'}
                      onAction={personas.length === 0 ? openCreateModal : () => setSearchQuery('')}
                    />
                  )}
                </Card>
              </div>
            ),
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: <Settings className="w-4 h-4" />,
            content: (
              <PersonaSettingsTab
                personas={personas}
                onSaved={() => successToast('Persona settings saved')}
              />
            ),
          },
        ]}
      />

      <DetailDrawer
        isOpen={!!selectedPersona}
        onClose={() => setSelectedPersona(null)}
        title={selectedPersona?.name || 'Persona Details'}
        renderDock={
          selectedPersona && (
            <>
              <button
                className="text-info hover:bg-info/10 transition-colors"
                onClick={() => {
                  setSelectedPersona(null);
                  openEditModal(selectedPersona);
                }}
                title="Edit Persona"
              >
                <Edit2 className="w-5 h-5" />
                <span className="dock-label text-[10px]">Edit</span>
              </button>
              <button
                className="text-secondary hover:bg-secondary/10 transition-colors"
                onClick={() => {
                  setSelectedPersona(null);
                  openCloneModal(selectedPersona);
                }}
                title="Clone Persona"
              >
                <Copy className="w-5 h-5" />
                <span className="dock-label text-[10px]">Clone</span>
              </button>
              <button
                className="text-error hover:bg-error/10 transition-colors"
                onClick={() => handleDeletePersona(selectedPersona.id, (msg) => setError(msg))}
                title="Delete Persona"
              >
                <Trash2 className="w-5 h-5" />
                <span className="dock-label text-[10px]">Delete</span>
              </button>
            </>
          )
        }
      >
        {selectedPersona && (
          <div className="space-y-6">
            {/* Assigned Bots */}
            {(selectedPersona.assignedBotNames?.length ?? 0) > 0 && (
              <Card className="bg-base-200">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-base-content/60 mb-2">
                  Assigned Bots
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPersona.assignedBotNames?.map((name) => (
                    <Badge key={name} variant="primary" size="sm">
                      {name}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* System Prompt */}
            {selectedPersona.systemPrompt && (
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wide text-base-content/60 mb-2">
                  System Prompt
                </h4>
                <div className="bg-base-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap break-words font-mono text-base-content/80">
                    {selectedPersona.systemPrompt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Create / Edit / Clone Persona Modal */}
      <PersonaModal
        isOpen={showCreateModal || showEditModal}
        onClose={closeModals}
        isViewMode={false}
        editingPersona={editingPersona as any}
        cloningPersonaId={cloningPersonaId}
        personaName={personaName}
        setPersonaName={setPersonaName}
        personaDescription={personaDescription}
        setPersonaDescription={setPersonaDescription}
        personaPrompt={personaPrompt}
        setPersonaPrompt={setPersonaPrompt}
        personaCategory={personaCategory}
        setPersonaCategory={setPersonaCategory}
        selectedBotIds={selectedBotIds}
        setSelectedBotIds={setSelectedBotIds}
        bots={bots as any}
        loading={saving}
        onSave={handleSave}
        avatarStyle={avatarStyle}
        onAvatarStyleChange={setAvatarStyle}
        responseBehavior={responseBehavior}
        onResponseBehaviorChange={setResponseBehavior}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal && !!deletingPersona}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingPersona(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Persona"
        message={
          deletingPersona
            ? `Are you sure you want to delete "${deletingPersona.name}"? Any bots assigned to this persona will be reset to the default persona.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="error"
        loading={deleting}
      />
    </div>
  );
};

export default PersonasPage;
