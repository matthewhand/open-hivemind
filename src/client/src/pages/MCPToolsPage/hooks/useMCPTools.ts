import { useState } from 'react';
import type { AlertState, MCPTool, ToolResult, RecentToolUsage, ToolExecutionRecord } from '../types';
import type { Dispatch, SetStateAction } from 'react';
import { useToolRegistry } from './useToolRegistry';
import { useToolExecution } from './useToolExecution';
import { useToolHistory } from './useToolHistory';

interface UseMCPToolsResult {
  alert: AlertState | null;
  setAlert: (alert: AlertState | null) => void;
  // registry
  tools: MCPTool[];
  filteredTools: MCPTool[];
  loading: boolean;
  urlParams: { search: string; category: string; server: string; view: string; sortBy: string };
  setUrlParam: (key: 'search' | 'category' | 'server' | 'view' | 'sortBy', value: string) => void;
  favorites: string[];
  recentlyUsed: RecentToolUsage[];
  usageCounts: Record<string, number>;
  setUsageCounts: Dispatch<SetStateAction<Record<string, number>>>;
  setRecentlyUsed: Dispatch<SetStateAction<RecentToolUsage[]>>;
  handleToggleTool: (toolId: string) => Promise<void>;
  handleToggleFavorite: (id: string) => void;
  // execution
  selectedTool: MCPTool | null;
  setSelectedTool: Dispatch<SetStateAction<MCPTool | null>>;
  initialArgs: Record<string, unknown> | undefined;
  isRunning: boolean;
  selectedResult: ToolResult | null;
  setSelectedResult: Dispatch<SetStateAction<ToolResult | null>>;
  showResultModal: boolean;
  setShowResultModal: Dispatch<SetStateAction<boolean>>;
  recentResults: ToolResult[];
  setRecentResults: Dispatch<SetStateAction<ToolResult[]>>;
  handleRunTool: (tool: MCPTool, args?: Record<string, unknown>) => void;
  handleExecuteTool: (tool: MCPTool, args: Record<string, unknown>) => Promise<void>;
  // history
  showHistory: boolean;
  setShowHistory: Dispatch<SetStateAction<boolean>>;
  executionHistory: ToolExecutionRecord[];
  loadingHistory: boolean;
  fetchHistory: () => Promise<void>;
}

export function useMCPTools(): UseMCPToolsResult {
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
