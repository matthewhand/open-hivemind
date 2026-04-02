/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { apiService } from '../../../services/api';
import type { ToolExecutionRecord, AlertState } from '../types';

interface UseToolHistoryProps {
  setAlert: (alert: AlertState | null) => void;
}

export function useToolHistory({ setAlert }: UseToolHistoryProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ToolExecutionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const json: any = await apiService.get('/api/mcp/tools/history?limit=50');
      setExecutionHistory(json.data || []);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load history' });
    } finally {
      setLoadingHistory(false);
    }
  };

  return {
    showHistory,
    setShowHistory,
    executionHistory,
    loadingHistory,
    fetchHistory
  };
}
