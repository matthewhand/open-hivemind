import { Copy, Edit2, Filter, Plus, Trash2, Users } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { Alert } from '../../components/DaisyUI/Alert';
import { Badge } from '../../components/DaisyUI/Badge';
import Button from '../../components/DaisyUI/Button';
import { ConfirmModal } from '../../components/DaisyUI/Modal';
import Card from '../../components/DaisyUI/Card';
import DetailDrawer from '../../components/DaisyUI/DetailDrawer';
import Divider from '../../components/DaisyUI/Divider';
import Join from '../../components/DaisyUI/Join';
import PageHeader from '../../components/DaisyUI/PageHeader';
import Select from '../../components/DaisyUI/Select';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import { useSuccessToast, useErrorToast, useInfoToast } from '../../components/DaisyUI/ToastNotification';
import Tooltip from '../../components/DaisyUI/Tooltip';
import SearchFilterBar from '../../components/SearchFilterBar';
import { PersonaModal } from '../../components/Personas/PersonaModal';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { usePersonaActions } from './hooks/usePersonaActions';
import { usePersonasData, type Persona } from './hooks/usePersonasData';
import { PersonaList } from './PersonaList';
import { PersonaStats } from './PersonaStats';

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
  const isMobile = useIsBelowBreakpoint('md');
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
    handleDeletePersona,
    // Modal state and form state for rendering PersonaModal
    showCreateModal,
    showEditModal,
    showDeleteModal,
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
    bulk
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

  if (dataLoading) return <SkeletonPage variant="cards" statsCount={3} showFilters />;

  const displayError = error || dataError;

  return (
    <div className="space-y-6">
      {displayError && <Alert status="error" message={displayError} onClose={() => setError(null)} />}

      <PageHeader
        title="Persona Management"
        description="Create and manage specialized identities for your AI agents."
        icon={<Users className="w-8 h-8 text-primary" />}
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" /> Create Persona
          </Button>
        }
      />

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
              onSelectPersona={setSelectedPersona}
              isMobile={isMobile}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              getItemStyle={getItemStyle}
            />
          )}
      </Card>

      {/* Persona Detail Drawer */}
      <DetailDrawer
        isOpen={!!selectedPersona}
        onClose={() => setSelectedPersona(null)}
        title={selectedPersona?.name}
        subtitle={selectedPersona?.description}
        renderDock={
          selectedPersona && (
            <>
              {!selectedPersona.isBuiltIn && (
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
              )}
              <button
                className="text-primary hover:bg-primary/10 transition-colors"
                onClick={() => {
                  setSelectedPersona(null);
                  openCloneModal(selectedPersona);
                }}
                title="Duplicate Persona"
              >
                <Copy className="w-5 h-5" />
                <span className="dock-label text-[10px]">Duplicate</span>
              </button>
              {!selectedPersona.isBuiltIn && (
                <button
                  className="text-error hover:bg-error/10 transition-colors"
                  onClick={() => {
                    setSelectedPersona(null);
                    handleDeletePersona(selectedPersona.id, (msg) => setError(msg));
                  }}
                  title="Delete Persona"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="dock-label text-[10px]">Delete</span>
                </button>
              )}
            </>
          )
        }
      >
        {selectedPersona && (
          <div className="space-y-6">
            {/* Category & Status */}
            <div className="flex flex-wrap gap-2">
              {selectedPersona.category && (
                <Badge variant="neutral">{selectedPersona.category}</Badge>
              )}
              {selectedPersona.isBuiltIn && (
                <Badge variant="info">Built-in</Badge>
              )}
            </div>

            {/* Assigned Bots */}
            {(selectedPersona.assignedBotNames?.length ?? 0) > 0 && (
              <Card className="bg-base-200">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-base-content/60 mb-2">Assigned Bots</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPersona.assignedBotNames?.map((name) => (
                    <Badge key={name} variant="primary" size="sm">{name}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* System Prompt */}
            {selectedPersona.systemPrompt && (
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wide text-base-content/60 mb-2">System Prompt</h4>
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
        editingPersona={editingPersona}
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
        onClose={() => { setShowDeleteModal(false); setDeletingPersona(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete Persona"
        message={deletingPersona ? `Are you sure you want to delete "${deletingPersona.name}"? Any bots assigned to this persona will be reset to the default persona.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="error"
        loading={deleting}
      />
    </div>
  );
};

export default PersonasPage;
