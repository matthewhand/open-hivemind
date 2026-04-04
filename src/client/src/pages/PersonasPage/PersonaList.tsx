import { Trash2 } from 'lucide-react';
import React from 'react';
import BulkActionBar from '../../components/BulkActionBar';
import Button from '../../components/DaisyUI/Button';
import Checkbox from '../../components/DaisyUI/Checkbox';
import Card from '../../components/DaisyUI/Card';
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
        <Checkbox
          variant="primary"
          size="sm"
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
            <Card className="shadow-sm border border-base-200 h-full hover:shadow-md transition-shadow">
                <Card.Title tag="h3" className="text-lg font-bold">{persona.name}</Card.Title>
                <p className="text-sm text-base-content/70 line-clamp-2">{persona.description}</p>
                <Button variant="primary" size="sm" onClick={() => openEditModal(persona)}>
                  Edit
                </Button>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
};
