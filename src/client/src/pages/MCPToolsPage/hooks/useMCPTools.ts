import { useState } from 'react';
import type { AlertState } from '../types';
import { useToolRegistry } from './useToolRegistry';
import { useToolExecution } from './useToolExecution';
import { useToolHistory } from './useToolHistory';

export function useMCPTools() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const registry = useToolRegistry({ setAlert });
  const execution = useToolExecution({
    setAlert,
    setUsageCounts: registry.setUsageCounts,
    setRecentlyUsed: registry.setRecentlyUsed
  });
  const history = useToolHistory({ setAlert });

  return {
    alert,
    setAlert,
    ...registry,
    ...execution,
    ...history
  };
}
