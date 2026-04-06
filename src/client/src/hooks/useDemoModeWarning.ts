/**
 * useDemoModeWarning — shows a toast warning when attempting to save settings in demo mode.
 *
 * Usage:
 *   const warnIfDemo = useDemoModeWarning();
 *
 *   const handleSave = async (values) => {
 *     if (warnIfDemo()) return;  // aborts save, shows warning
 *     // ...proceed with save
 *   };
 */

import { useCallback, useRef } from 'react';
import { apiService } from '../services/api';

interface DemoStatus {
  isDemoMode: boolean;
}

export function useDemoModeWarning(
  showToast: (type: 'warning' | 'info' | 'success' | 'error', title: string, message: string) => void
): () => boolean {
  const checkingRef = useRef(false);

  return useCallback(async () => {
    // Prevent double-check on rapid clicks
    if (checkingRef.current) return false;
    checkingRef.current = true;

    try {
      const status = await apiService.get<DemoStatus>('/api/demo/status');
      if (status?.isDemoMode) {
        showToast(
          'warning',
          'Demo Mode Active',
          'Changes you make are simulated and will not persist. Configure real credentials in Settings to save configuration.'
        );
        return true; // caller should abort save
      }
    } catch {
      // If demo status check fails, allow save to proceed (not a blocker).
    } finally {
      checkingRef.current = false;
    }
    return false;
  }, [showToast]);
}

export default useDemoModeWarning;
