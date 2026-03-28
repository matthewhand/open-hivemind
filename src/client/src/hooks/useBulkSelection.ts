import { useState, useCallback, useRef } from 'react';

export interface BulkSelectionResult {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  toggleItem: (id: string, event?: React.MouseEvent) => void;
  toggleAll: (allIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

/**
 * Hook for managing bulk selection of list items.
 * Supports individual toggle, select-all/deselect-all, and shift+click range selection.
 */
export function useBulkSelection(orderedIds: string[]): BulkSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  const isAllSelected = orderedIds.length > 0 && orderedIds.every(id => selectedIds.has(id));

  const toggleItem = useCallback((id: string, event?: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);

      // Shift+click range selection
      if (event?.shiftKey && lastClickedRef.current !== null) {
        const lastIndex = orderedIds.indexOf(lastClickedRef.current);
        const currentIndex = orderedIds.indexOf(id);
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          for (let i = start; i <= end; i++) {
            next.add(orderedIds[i]);
          }
          return next;
        }
      }

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    lastClickedRef.current = id;
  }, [orderedIds]);

  const toggleAll = useCallback((allIds: string[]) => {
    setSelectedIds(prev => {
      const allSelected = allIds.length > 0 && allIds.every(id => prev.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedRef.current = null;
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    isAllSelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.size,
  };
}

export default useBulkSelection;
