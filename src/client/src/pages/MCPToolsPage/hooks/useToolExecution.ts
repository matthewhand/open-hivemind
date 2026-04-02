/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { apiService } from '../../../services/api';
import type { MCPTool, ToolResult, RecentToolUsage, AlertState } from '../types';

interface UseToolExecutionProps {
  setAlert: (alert: AlertState | null) => void;
  setUsageCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setRecentlyUsed: React.Dispatch<React.SetStateAction<RecentToolUsage[]>>;
}

export function useToolExecution({ setAlert, setUsageCounts, setRecentlyUsed }: UseToolExecutionProps) {
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [initialArgs, setInitialArgs] = useState<Record<string, any>>();
  const [isRunning, setIsRunning] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ToolResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [recentResults, setRecentResults] = useState<ToolResult[]>([]);

  const handleRunTool = (tool: MCPTool, args?: Record<string, any>) => {
    setSelectedTool(tool);
    setInitialArgs(args);
  };

  const handleExecuteTool = async (tool: MCPTool, args: Record<string, any>) => {
    setIsRunning(true);
    const start = Date.now();
    try {
      const json: any = await apiService.post(`/api/mcp/servers/${tool.serverName}/call-tool`, { toolName: tool.name, arguments: args });

      apiService.post('/api/mcp/tools/history', {
        id: crypto.randomUUID(),
        serverName: tool.serverName,
        toolName: tool.name,
        arguments: args,
        result: json.result,
        status: 'success',
        executedAt: new Date().toISOString(),
        duration: Date.now() - start
      }).catch(() => {});

      let validationWarnings: string[] = [];
      if (tool.outputSchema && Object.keys(tool.outputSchema).length > 0) {
        const output = json.result;
        const schema = tool.outputSchema;
        if (schema.type) {
            const outputType = Array.isArray(output) ? 'array' : typeof output;
            if (schema.type !== outputType && !(schema.type === 'object' && outputType === 'object')) {
              validationWarnings.push(`Expected type ${schema.type}, got ${outputType}`);
            }
        }
        if (schema.type === 'object' && schema.properties && schema.required) {
            (schema.required as string[]).forEach(prop => {
              if (!(prop in (output || {}))) validationWarnings.push(`Missing required property: ${prop}`);
            });
        }
      }

      const successResult: ToolResult = {
        timestamp: new Date().toISOString(),
        toolName: tool.name,
        serverName: tool.serverName,
        arguments: args,
        result: json.result,
        isError: false
      };

      setSelectedResult(successResult);
      setRecentResults(prev => [successResult, ...prev].slice(0, 20));
      setShowResultModal(true);

      if (validationWarnings.length > 0) {
        setAlert({ type: 'success', message: `Tool executed with schema validation warnings: ${validationWarnings.join(', ')}` });
      }

      setUsageCounts(prev => ({ ...prev, [tool.id]: (prev[tool.id] || 0) + 1 }));
      setRecentlyUsed(prev => [{ toolId: tool.id, timestamp: new Date().toISOString(), arguments: args }, ...prev.filter(r => r.toolId !== tool.id)].slice(0, 10));
    } catch (err: any) {
      const errorResult: ToolResult = {
        timestamp: new Date().toISOString(),
        toolName: tool.name,
        serverName: tool.serverName,
        arguments: args,
        error: { message: err.message },
        isError: true
      };
      setSelectedResult(errorResult);
      setRecentResults(prev => [errorResult, ...prev].slice(0, 20));
      setShowResultModal(true);
    } finally {
      setIsRunning(false);
      setSelectedTool(null);
    }
  };

  return {
    selectedTool,
    setSelectedTool,
    initialArgs,
    isRunning,
    selectedResult,
    showResultModal,
    setShowResultModal,
    recentResults,
    setRecentResults,
    handleRunTool,
    handleExecuteTool
  };
}
