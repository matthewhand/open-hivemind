import { useState, useCallback } from 'react';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';

export interface OptimisticAction<T> {
  // Action type
  type: 'create' | 'update' | 'delete';
  // The temporary/optimistic item to add/update
  optimisticItem: T;
  // The original item for rollback (undefined for creation)
  originalItem?: T;
  // The API call to execute
  apiCall: () => Promise<any>;
  // Optional success message
  successMessage?: string;
  // Custom rollback message (overrides default)
  rollbackMessage?: string;
  // Callback when success, useful for setting returned IDs or resolving parent state
  onSuccess?: (result: any) => void;
  // Callback when error
  onError?: (error: any) => void;
}

export function useOptimisticList<T extends { id: string }>(initialData: T[] = []) {
  const [items, setItems] = useState<T[]>(initialData);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  // Helper to check if an item is currently being updated
  const isUpdating = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  // Main execution function
  const executeOptimistic = useCallback(
    async (action: OptimisticAction<T>) => {
      const { type, optimisticItem, originalItem, apiCall, successMessage, rollbackMessage, onSuccess, onError } = action;
      const targetId = optimisticItem.id;

      // 1. Mark as pending
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });

      // 2. Apply optimistic update to UI
      setItems((prev) => {
        if (type === 'create') {
          return [...prev, optimisticItem];
        } else if (type === 'update') {
          return prev.map((item) => (item.id === targetId ? optimisticItem : item));
        } else if (type === 'delete') {
          return prev.filter((item) => item.id !== targetId);
        }
        return prev;
      });

      // 3. Execute API call
      try {
        const result = await apiCall();

        // 4a. Success: Callback for external state (like exchanging temp ID)
        if (onSuccess) {
           onSuccess(result);
        } else if (type === 'create' && result?.data?.bot?.id) {
           // Default ID swap if response format matches our standard API
           setItems((prev) => prev.map((item) => (item.id === targetId ? result.data.bot : item)));
        } else if (type === 'update' && result?.data?.bot) {
           setItems((prev) => prev.map((item) => (item.id === targetId ? result.data.bot : item)));
        }

        if (successMessage) {
          showSuccess(successMessage);
        }

        return { success: true, result };
      } catch (error: any) {
        // 4b. Failure: Rollback
        setItems((prev) => {
          if (type === 'create') {
            return prev.filter((item) => item.id !== targetId);
          } else if (type === 'update' && originalItem) {
            return prev.map((item) => (item.id === targetId ? originalItem : item));
          } else if (type === 'delete' && originalItem) {
            return [...prev, originalItem]; // Note: this adds it to the end, which might mess up sort order depending on list.
          }
          return prev;
        });

        // Explicit rollback notification
        const msg = rollbackMessage || error?.message || `Failed to ${type} item. Changes rolled back.`;
        showError('Action Failed', msg);

        if (onError) {
            onError(error);
        }

        return { success: false, error };
      } finally {
        // Clear pending state
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
    },
    [showSuccess, showError]
  );

  return {
    items,
    setItems, // Expose for initial data loading from useEffect
    isUpdating,
    executeOptimistic,
  };
}
