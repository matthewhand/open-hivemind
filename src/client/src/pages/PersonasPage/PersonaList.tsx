import { Trash2 } from 'lucide-react';
import React from 'react';
import BulkActionBar from '../../components/BulkActionBar';
import { type Persona } from './hooks/usePersonasData';

interface PersonaListProps {
  filteredPersonas: Persona[];
  filteredPersonaIds: string[];
  bulk: any;
  bulkDeleting: boolean;
  handleBulkDeletePersonas: () => void;
  openEditModal: (persona: Persona) => void;
  isMobile: boolean;
  onDragStart: (index: number) => (e: React.DragEvent) => void;
  onDragOver: (index: number) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (index: number) => (e: React.DragEvent) => void;
  getItemStyle: (index: number) => React.CSSProperties;
}

export const PersonaList: React.FC<PersonaListProps> = ({
  filteredPersonas,
  filteredPersonaIds,
  bulk,
  bulkDeleting,
  handleBulkDeletePersonas,
  openEditModal,
  isMobile,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  getItemStyle,
}) => {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          className="checkbox checkbox-sm checkbox-primary"
          checked={bulk.isAllSelected}
          onChange={() => bulk.toggleAll(filteredPersonaIds)}
          aria-label="Select all personas"
        />
        <span className="text-xs text-base-content/60">Select all custom personas</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPersonas.map((persona, index) => (
          <div
            key={persona.id}
            className="relative"
            draggable={!isMobile}
            onDragStart={onDragStart(index)}
            onDragOver={onDragOver(index)}
            onDragEnd={onDragEnd}
            onDrop={onDrop(index)}
            style={getItemStyle(index)}
          >
            <div className="card bg-base-100 shadow-sm border border-base-200 h-full hover:shadow-md transition-shadow">
              <div className="card-body p-4 sm:p-5">
                <h3 className="card-title text-lg font-bold">{persona.name}</h3>
                <p className="text-sm text-base-content/70 line-clamp-2">{persona.description}</p>
                <button className="btn btn-primary btn-sm" onClick={() => openEditModal(persona)}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
