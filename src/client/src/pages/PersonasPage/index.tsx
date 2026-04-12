import { Copy, Edit2, Filter, Plus, Settings, Trash2, Users } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/DaisyUI/Alert';
import { Badge } from '../../components/DaisyUI/Badge';
import Button from '../../components/DaisyUI/Button';
import Select from '../../components/DaisyUI/Select';
import PageHeader from '../../components/DaisyUI/PageHeader';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import { useSuccessToast, useErrorToast, useInfoToast } from '../../components/DaisyUI/ToastNotification';
import SearchFilterBar from '../../components/SearchFilterBar';
import Tooltip from '../../components/DaisyUI/Tooltip';
import Join from '../../components/DaisyUI/Join';
import Card from '../../components/DaisyUI/Card';
import DetailDrawer from '../../components/DaisyUI/DetailDrawer';
import Divider from '../../components/DaisyUI/Divider';
import Select from '../../components/DaisyUI/Select';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import Tabs from '../../components/DaisyUI/Tabs';
import Toggle from '../../components/DaisyUI/Toggle';
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
import { useSavedStamp } from '../../contexts/SavedStampContext';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'general', label: 'General Assistants' },
  { id: 'development', label: 'Software Development' },
  { id: 'creative', label: 'Creative & Writing' },
  { id: 'analysis', label: 'Data Analysis' },
  { id: 'support', label: 'Customer Support' },
];

/** Persona Settings tab (placeholder — no settings API yet) */
const PersonaSettingsTab: React.FC<{ personas: Persona[] }> = ({ personas }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="shadow-md border border-base-200">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Persona Defaults</h3>
        </div>

        <div className="space-y-4">
          {/* Default persona selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Default Persona</span>
            </label>
            <Select
              disabled
              value=""
              options={[
                { value: '', label: 'Select a default persona...' },
                ...personas.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                The persona assigned to new bots by default.
              </span>
            </label>
          </div>

          {/* Response behavior defaults */}
          <Divider>Response Behavior</Divider>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 pointer-events-none">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Temperature</span>
              </label>
              <input
                type="range"
                className="range range-primary range-sm"
                min={0}
                max={100}
                value={70}
                readOnly
              />
              <span className="text-xs text-base-content/50 mt-1">0.7</span>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Max Tokens</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                value={2048}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-info/10 rounded-lg text-info text-sm">
          Persona settings coming soon. These controls will be connected in a future release.
        </div>
      </Card>

      {/* Advanced toggle */}
      <Card className="shadow-md border border-base-200">
        <Toggle
          label="Advanced"
          checked={showAdvanced}
          onChange={() => setShowAdvanced((v) => !v)}
          color="primary"
        />
        {showAdvanced && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            <Divider>Advanced Persona Settings</Divider>
            <div className="form-control opacity-50 pointer-events-none">
              <label className="label">
                <span className="label-text">Persona Ordering</span>
              </label>
              <Select
                disabled
                value="alphabetical"
                options={[
                  { value: 'alphabetical', label: 'Alphabetical' },
                  { value: 'custom', label: 'Custom Order' },
                  { value: 'most-used', label: 'Most Used First' },
                ]}
              />
            </div>
            <div className="form-control opacity-50 pointer-events-none">
              <label className="label">
                <span className="label-text">Auto-Assignment Rules</span>
              </label>
              <Select
                disabled
                value="none"
                options={[
                  { value: 'none', label: 'No Auto-Assignment' },
                  { value: 'round-robin', label: 'Round Robin' },
                  { value: 'category-match', label: 'Category Match' },
                ]}
              />
            </div>
            <div className="p-4 bg-info/10 rounded-lg text-info text-sm">
              Advanced persona settings coming soon.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

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
      {displayError && <Alert type="error" message={displayError} onClose={() => setError(null)} />}

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
              </div>
            ),
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: <Settings className="w-4 h-4" />,
            content: <PersonaSettingsTab personas={personas} />,
          },
        ]}
      />

      <PersonaStats personas={personas} />

      <Card className="shadow-xl border border-base-200">
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search personas by name or description..."
          >
            <div className="flex gap-2">
              <Join>
                <Tooltip content="Filter by Category">
                  <Button variant="primary" size="sm" className="btn-square join-item pointer-events-none" aria-label="Filter by category" tabIndex={-1}>
                    <Filter className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Select
                  size="sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={CATEGORIES.map((cat) => ({ label: cat.label, value: cat.id }))}
                  className="join-item"
                />
              </Join>
            </div>

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
    </div>
  );
};

export default PersonasPage;
