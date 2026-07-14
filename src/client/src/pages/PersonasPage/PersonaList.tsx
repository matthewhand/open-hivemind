import { Copy, GitFork, Trash2 } from 'lucide-react';
import React from 'react';
import BulkActionBar from '../../components/BulkActionBar';
import Button from '../../components/DaisyUI/Button';
import Checkbox from '../../components/DaisyUI/Checkbox';
import Card from '../../components/DaisyUI/Card';
import { Badge } from '../../components/DaisyUI/Badge';
import PersonaAvatar from '../../components/PersonaAvatar';
import { type Persona } from './hooks/usePersonasData';

interface PersonaListProps {
  filteredPersonas: Persona[];
  filteredPersonaIds: string[];
  bulk: any;
  bulkDeleting: boolean;
  handleBulkDeletePersonas: () => void;
  openEditModal: (persona: Persona) => void;
  openCloneModal: (persona: Persona) => void;
  handleCopyPrompt: (text: string) => Promise<void>;
  onSelectPersona: (persona: Persona) => void;
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
  openCloneModal,
  handleCopyPrompt,
  onSelectPersona,
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
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4" role="list">
        {filteredPersonas.map((persona, index) => {
          const isCustom = !persona.isBuiltIn;
          const isSelected = bulk.selectedIds.has(persona.id);
          return (
            <li
              key={persona.id}
              data-testid="persona-card"
              role="listitem"
              className="relative"
              draggable={!isMobile}
              onDragStart={onDragStart(index)}
              onDragOver={onDragOver(index)}
              onDragEnd={onDragEnd}
              onDrop={onDrop(index)}
              style={getItemStyle(index)}
            >
              <Card
                className="shadow-sm border border-base-200 h-full hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectPersona(persona)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* Checkbox only for custom personas */}
                    {isCustom && (
                      <Checkbox
                        variant="primary"
                        size="sm"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          bulk.toggleItem(persona.id);
                        }}
                        aria-label={`Select ${persona.name}`}
                      />
                    )}
                    {/* Spacer for built-in personas to keep alignment */}
                    {!isCustom && <span className="w-5 flex-shrink-0" />}
                    <PersonaAvatar seed={persona.name} style={(persona as any).avatarStyle || 'bottts'} size={40} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Card.Title tag="h2" className="text-lg font-bold">{persona.name}</Card.Title>
                      <p className="text-sm text-base-content/70 line-clamp-2">{persona.description}</p>
                      {/* Category badge hidden — roadmap: user-defined categories */}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {persona.isBuiltIn && <Badge variant="ghost" size="sm">Built-in</Badge>}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Copy System Prompt"
                        aria-label={`Copy ${persona.name} system prompt`}
                        onClick={(e) => { e.stopPropagation(); handleCopyPrompt(persona.systemPrompt); }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Duplicate Persona"
                        aria-label={`Duplicate ${persona.name}`}
                        onClick={(e) => { e.stopPropagation(); openCloneModal(persona); }}
                      >
                        <GitFork className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openEditModal(persona); }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
};
