import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Sparkles, Trash2 } from 'lucide-react';
import EmptyState from '../DaisyUI/EmptyState';
import { SkeletonPage } from '../DaisyUI/Skeleton';
import BulkActionBar from '../BulkActionBar';
import Checkbox from '../DaisyUI/Checkbox';
import { PersonaCard } from './PersonaCard';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';
import { Persona } from './usePersonasLogic';

interface PersonaListProps {
  logic: any;
}

export const PersonaList: React.FC<PersonaListProps> = ({ logic }) => {
  const isMobile = useIsBelowBreakpoint('md');
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = logic.filteredPersonas.length > 50;
  const gridRowVirtualizer = useVirtualizer({
    count: Math.ceil(logic.filteredPersonas.length / 3),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 450,
    overscan: 2,
    enabled: shouldVirtualize,
  });

  if (logic.loading) {
    return <SkeletonPage variant="list" statsCount={0} showFilters={false} />;
  }

  if (logic.personas.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No personas configured"
        description="Create your first persona to get started"
        actionLabel="Create Persona"
        actionIcon={Sparkles}
        onAction={logic.openCreateModal}
        variant="noData"
      />
    );
  }

  if (logic.filteredPersonas.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No personas found"
        description="Try adjusting your search or filters"
        actionLabel="Clear Filters"
        onAction={() => {
          logic.setSearchQuery('');
          logic.setSelectedCategory('all');
        }}
        variant="noResults"
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Checkbox
          className="checkbox checkbox-sm checkbox-primary"
          checked={logic.bulkSelection.isAllSelected}
          onChange={() => logic.bulkSelection.toggleAll(logic.filteredPersonaIds)}
          aria-label="Select all personas"
        />
        <span className="text-xs text-base-content/60">Select all (custom only)</span>
      </div>
      <BulkActionBar
        selectedCount={logic.bulkSelection.selectedCount}
        onClearSelection={logic.bulkSelection.clearSelection}
        actions={[
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4" />,
            variant: 'error',
            onClick: logic.handleBulkDeletePersonas,
            loading: logic.bulkDeleting,
          },
        ]}
      />
      {shouldVirtualize ? (
        <div ref={parentRef} className="overflow-auto" style={{ height: '800px' }}>
          <div
            style={{
              height: `${gridRowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {gridRowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * 3;
              const rowPersonas = logic.filteredPersonas.slice(startIndex, startIndex + 3);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-1">
                    {rowPersonas.map((persona: any, index: number) => {
                      const globalIndex = startIndex + index;
                      return (
                        <div
                          key={persona.id || `card-virtual-${globalIndex}`}
                          data-testid="persona-card"
                          draggable={!isMobile}
                          onDragStart={logic.dragAndDrop.onDragStart(globalIndex)}
                          onDragOver={logic.dragAndDrop.onDragOver(globalIndex)}
                          onDragEnd={logic.dragAndDrop.onDragEnd}
                          onDrop={logic.dragAndDrop.onDrop(globalIndex)}
                          style={logic.dragAndDrop.getItemStyle(globalIndex)}
                          className={`h-full ${persona.isBuiltIn ? 'border-l-4 border-l-primary/30' : ''}`}
                        >
                          <PersonaCard
                            persona={persona}
                            isSelected={logic.bulkSelection.isSelected(persona.id)}
                            onToggleSelection={(id: string) => logic.bulkSelection.toggleItem(id, { target: { checked: !logic.bulkSelection.isSelected(id) } } as any)}
                            onEdit={logic.openEditModal}
                            onView={logic.openViewModal}
                            onClone={logic.openCloneModal}
                            onDelete={(p: Persona) => { logic.setDeletingPersona(p); logic.setShowDeleteModal(true); }}
                            onCopyPrompt={logic.handleCopyPrompt}
                            dragHandleProps={isMobile ? {
                              onMoveUp: () => logic.dragAndDrop.onMoveUp(globalIndex),
                              onMoveDown: () => logic.dragAndDrop.onMoveDown(globalIndex),
                              disabledUp: globalIndex === 0,
                              disabledDown: globalIndex === logic.filteredPersonas.length - 1,
                              isMobile: true
                            } : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {logic.filteredPersonas.map((persona: any, index: number) => (
            <div
              key={persona.id || `card-${index}`}
              data-testid="persona-card"
              draggable={!isMobile}
              onDragStart={logic.dragAndDrop.onDragStart(index)}
              onDragOver={logic.dragAndDrop.onDragOver(index)}
              onDragEnd={logic.dragAndDrop.onDragEnd}
              onDrop={logic.dragAndDrop.onDrop(index)}
              style={logic.dragAndDrop.getItemStyle(index)}
              className={`h-full ${persona.isBuiltIn ? 'border-l-4 border-l-primary/30' : ''}`}
            >
              <PersonaCard
                persona={persona}
                isSelected={logic.bulkSelection.isSelected(persona.id)}
                onToggleSelection={(id: string) => logic.bulkSelection.toggleItem(id, { target: { checked: !logic.bulkSelection.isSelected(id) } } as any)}
                onEdit={logic.openEditModal}
                onView={logic.openViewModal}
                onClone={logic.openCloneModal}
                onDelete={(p: Persona) => { logic.setDeletingPersona(p); logic.setShowDeleteModal(true); }}
                onCopyPrompt={logic.handleCopyPrompt}
                dragHandleProps={isMobile ? {
                  onMoveUp: () => logic.dragAndDrop.onMoveUp(index),
                  onMoveDown: () => logic.dragAndDrop.onMoveDown(index),
                  disabledUp: index === 0,
                  disabledDown: index === logic.filteredPersonas.length - 1,
                  isMobile: true
                } : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};
