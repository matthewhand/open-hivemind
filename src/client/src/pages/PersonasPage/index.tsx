import { Filter, Plus, Users } from 'lucide-react';
import React, { useState } from 'react';
import Alert from '../../components/DaisyUI/Alert';
import PageHeader from '../../components/DaisyUI/PageHeader';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import { useSuccessToast, useErrorToast, useInfoToast } from '../../components/DaisyUI/ToastNotification';
import SearchFilterBar from '../../components/SearchFilterBar';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { usePersonaActions } from './hooks/usePersonaActions';
import { usePersonasData } from './hooks/usePersonasData';
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

  const { onDragStart, onDragOver, onDragEnd, onDrop, getItemStyle } = useDragAndDrop({
    items: filteredPersonas,
    idAccessor: (p) => p.id,
    onReorder: handlePersonaReorder,
  });

  if (dataLoading) return <SkeletonPage variant="cards" statsCount={3} showFilters />;

  const displayError = error || dataError;

  return (
    <div className="space-y-6">
      {displayError && <Alert type="error" message={displayError} onClose={() => setError(null)} />}

      <PageHeader
        title="Persona Management"
        description="Create and manage specialized identities for your AI agents."
        icon={<Users className="w-8 h-8 text-primary" />}
        actions={
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" /> Create Persona
          </button>
        }
      />

      <PersonaStats personas={personas} />

      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-4 sm:p-6">
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search personas by name or description..."
          >
            <div className="flex gap-2">
              <div className="join">
                <div className="tooltip" data-tip="Filter by Category">
                  <button className="btn btn-square btn-sm join-item pointer-events-none">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
                <select
                  className="select select-sm select-bordered join-item"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SearchFilterBar>

          {!displayError && filteredPersonas.length > 0 && (
            <PersonaList
              filteredPersonas={filteredPersonas}
              filteredPersonaIds={filteredPersonaIds}
              bulk={bulk}
              bulkDeleting={bulkDeleting}
              handleBulkDeletePersonas={handleBulkDeletePersonas}
              openEditModal={openEditModal}
              isMobile={isMobile}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              getItemStyle={getItemStyle}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonasPage;
