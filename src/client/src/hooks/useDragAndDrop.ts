import { useState, useCallback, useRef } from 'react';

export interface UseDragAndDropOptions<T> {
  items: T[];
  idAccessor: (item: T) => string;
  onReorder: (reorderedItems: T[]) => void;
}

export interface UseDragAndDropReturn<T> {
  dragIndex: number | null;
  dropIndex: number | null;
  isDragging: boolean;
  onDragStart: (index: number) => (e: React.DragEvent) => void;
  onDragOver: (index: number) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (index: number) => (e: React.DragEvent) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  getItemStyle: (index: number) => React.CSSProperties;
}

/**
 * Generic drag-and-drop reordering hook using the HTML5 Drag and Drop API.
 * Also provides onMoveUp / onMoveDown for mobile arrow-button fallback.
 */
export function useDragAndDrop<T>({
  items,
  idAccessor: _idAccessor,
  onReorder,
}: UseDragAndDropOptions<T>): UseDragAndDropReturn<T> {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const _dragCounter = useRef(0);

  const isDragging = dragIndex !== null;

  const onDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      setDragIndex(index);
      dragCounter.current = 0;
    },
    [],
  );

  const onDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropIndex(index);
    },
    [],
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      onReorder(updated);
    },
    [items, onReorder],
  );

  const onDrop = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
      reorder(fromIndex, index);
      setDragIndex(null);
      setDropIndex(null);
    },
    [dragIndex, reorder],
  );

  const onDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropIndex(null);
  }, []);

  const onMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      reorder(index, index - 1);
    },
    [reorder],
  );

  const onMoveDown = useCallback(
    (index: number) => {
      if (index >= items.length - 1) return;
      reorder(index, index + 1);
    },
    [items.length, reorder],
  );

  const getItemStyle = useCallback(
    (index: number): React.CSSProperties => {
      if (dragIndex === index) {
        return { opacity: 0.4, transition: 'opacity 150ms' };
      }
      if (dropIndex === index && dragIndex !== null && dragIndex !== index) {
        return {
          borderTop: '2px solid oklch(var(--p))',
          transition: 'border 150ms',
        };
      }
      return {};
    },
    [dragIndex, dropIndex],
  );

  return {
    dragIndex,
    dropIndex,
    isDragging,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    onMoveUp,
    onMoveDown,
    getItemStyle,
  };
}
