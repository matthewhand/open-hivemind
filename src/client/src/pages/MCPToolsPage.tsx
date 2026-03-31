/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  WrenchScrewdriverIcon as ToolIcon,
  PlayIcon as RunIcon,
  MagnifyingGlassIcon as SearchIcon,
  CodeBracketIcon,
  ListBulletIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import { Alert } from '../components/DaisyUI/Alert';
import Modal from '../components/DaisyUI/Modal';
import ToolResultModal from '../components/ToolResultModal';
import ToolResultHistory from '../components/ToolResultHistory';
import useUrlParams from '../hooks/useUrlParams';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { apiService } from '../services/api';
import Debug from 'debug';
import Toggle from '../components/DaisyUI/Toggle';
const debug = Debug('app:client:pages:MCPToolsPage');

interface MCPTool {
  id: string;
  name: string;
  serverId: string;
  serverName: string;
  description: string;
  category: string;
  inputSchema: any;
  outputSchema: any;
  usageCount: number;
  lastUsed?: string;
  enabled: boolean;
}

interface ToolExecutionRecord {
  id: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, any>;
  result: any;
  error?: string;
  status: 'success' | 'error';
  executedAt: string;
  duration: number;
  userId?: string;
}

interface ToolResult {
  timestamp: string;
  toolName: string;
  serverName: string;
  arguments: any;
  result?: any;
  error?: {
    message: string;
    stack?: string;
  };
  isError: boolean;
}

interface RecentToolUsage {
  toolId: string;
  timestamp: string;
  arguments?: Record<string, any>;
}

const MCPToolsPage: React.FC = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);

  // URL params for search and filters
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    category: { type: 'string', default: 'all' },
    server: { type: 'string', default: 'all' },
    view: { type: 'string', default: 'all' }, // 'all', 'favorites', 'recent'
    sortBy: { type: 'string', default: 'name' }, // 'name', 'usage', 'recent'
  });
  const searchTerm = urlParams.search;
  const setSearchTerm = (v: string) => setUrlParam('search', v);
  const categoryFilter = urlParams.category;
  const setCategoryFilter = (v: string) => setUrlParam('category', v);
  const serverFilter = urlParams.server;
  const setServerFilter = (v: string) => setUrlParam('server', v);
  const viewFilter = urlParams.view;
  const setViewFilter = (v: string) => setUrlParam('view', v);
  const sortBy = urlParams.sortBy;
  const setSortBy = (v: string) => setUrlParam('sortBy', v);

  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // LocalStorage-persisted state for favorites and recent usage
  const [favorites, setFavorites] = useLocalStorage<string[]>('mcp-tools-favorites', []);
  const [recentlyUsed, setRecentlyUsed] = useLocalStorage<RecentToolUsage[]>('mcp-tools-recently-used', []);
  const [usageCounts, setUsageCounts] = useLocalStorage<Record<string, number>>('mcp-tools-usage-counts', {});

  // Tool result modal and history state
  const [selectedResult, setSelectedResult] = useState<ToolResult | null>(null);
  const [resultHistory, setResultHistory] = useState<ToolResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        // Fetch servers and tools
        const json: any = await apiService.get('/api/mcp/servers');
        const servers = json.servers || json.data?.servers || [];

        // Fetch tool preferences
        const prefsJson: any = await apiService.get('/api/mcp/tools/preferences').catch(() => ({ success: true, data: {} }));
        const preferences = prefsJson.data || {};

        // Flatten structure: Server[] -> Tool[]
        const allTools: MCPTool[] = [];
        servers.forEach((server: any) => {
          if (server.tools && Array.isArray(server.tools)) {
            server.tools.forEach((t: any) => {
              const toolId = `${server.name}-${t.name}`;
              const preference = preferences[toolId];

              allTools.push({
                id: toolId,
                name: t.name,
                serverId: server.name,
                serverName: server.name,
                description: t.description || 'No description available',
                category: 'utility',
                inputSchema: t.inputSchema,
                outputSchema: t.outputSchema || t.output_schema || {},
                usageCount: usageCounts[toolId] || 0,
                lastUsed: recentlyUsed.find(r => r.toolId === toolId)?.timestamp,
                // Use preference if available, otherwise default based on connection
                enabled: preference ? preference.enabled : server.connected,
              });
            });
          }
        });

        setTools(allTools);
        setFilteredTools(allTools);
      } catch (err) {
        setAlert({ type: 'error', message: 'Failed to load tools from server' });
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [usageCounts, recentlyUsed]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...tools];

    // Apply view filter (all, favorites, recent)
    if (viewFilter === 'favorites') {
      filtered = filtered.filter(tool => favorites.includes(tool.id));
    } else if (viewFilter === 'recent') {
      const recentIds = recentlyUsed.map(r => r.toolId);
      filtered = filtered.filter(tool => recentIds.includes(tool.id));
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tool => tool.category === categoryFilter);
    }

    // Apply server filter
    if (serverFilter !== 'all') {
      filtered = filtered.filter(tool => tool.serverId === serverFilter);
    }

    // Apply sorting
    if (sortBy === 'usage') {
      filtered.sort((a, b) => b.usageCount - a.usageCount);
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return bTime - aTime;
      });
    } else {
      // Default: sort by name
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, categoryFilter, serverFilter, viewFilter, sortBy, favorites, recentlyUsed]);

  // Get recently used tools (last 5)
  const recentTools = useMemo(() => {
    const recentIds = recentlyUsed.slice(0, 5).map(r => r.toolId);
    return tools.filter(tool => recentIds.includes(tool.id))
      .sort((a, b) => {
        const aIndex = recentIds.indexOf(a.id);
        const bIndex = recentIds.indexOf(b.id);
        return aIndex - bIndex;
      });
  }, [tools, recentlyUsed]);

  // Get favorite tools
  const favoriteTools = useMemo(() => {
    return tools.filter(tool => favorites.includes(tool.id));
  }, [tools, favorites]);

  const categories = Array.from(new Set(tools.map(tool => tool.category)));
  const servers = Array.from(new Set(tools.map(tool => ({ id: tool.serverId, name: tool.serverName }))));

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      git: 'badge-primary',
      database: 'badge-secondary',
      filesystem: 'badge-info',
      network: 'badge-success',
      ai: 'badge-warning',
      utility: 'badge-ghost',
    };
    return colors[category] || 'badge-ghost';
  };

  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [runArgs, setRunArgs] = useState('{}');
  const [formArgs, setFormArgs] = useState<Record<string, any>>({});
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ToolExecutionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleToggleFavorite = (toolId: string) => {
    setFavorites(prev => {
      if (prev.includes(toolId)) {
        return prev.filter(id => id !== toolId);
      } else {
        return [...prev, toolId];
      }
    });
  };

  const handleOpenRunModal = (tool: MCPTool, prefillArgs?: Record<string, any>) => {
    setSelectedTool(tool);
    if (prefillArgs) {
      setRunArgs(JSON.stringify(prefillArgs, null, 2));
      setFormArgs(prefillArgs);
    } else {
      setRunArgs('{}');
      setFormArgs({});
    }
    setMode('form');
    setJsonError(null);
  };

  const handleQuickExecute = (tool: MCPTool) => {
    // Find last used arguments for this tool
    const lastUsage = recentlyUsed.find(r => r.toolId === tool.id);
    if (lastUsage?.arguments) {
      handleOpenRunModal(tool, lastUsage.arguments);
    } else {
      handleOpenRunModal(tool);
    }
  };

  const handleCloseRunModal = () => {
    if (isRunning) return;
    setSelectedTool(null);
    setRunArgs('{}');
    setFormArgs({});
    setJsonError(null);
  };

  const updateFormArg = (key: string, value: any) => {
    const newFormArgs = { ...formArgs, [key]: value };
    setFormArgs(newFormArgs);
    setRunArgs(JSON.stringify(newFormArgs, null, 2));
    setJsonError(null);
  };

  const validateOutputAgainstSchema = (output: any, schema: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!schema || Object.keys(schema).length === 0) {
      return { valid: true, errors: [] };
    }

    if (schema.type) {
      const outputType = Array.isArray(output) ? 'array' : typeof output;
      if (schema.type !== outputType && !(schema.type === 'object' && outputType === 'object')) {
        errors.push(`Expected type ${schema.type}, got ${outputType}`);
      }
    }

    if (schema.type === 'object' && schema.properties && schema.required) {
      const requiredProps = schema.required as string[];
      requiredProps.forEach(prop => {
        if (!(prop in (output || {}))) {
          errors.push(`Missing required property: ${prop}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;

    let args = {};
    try {
      args = JSON.parse(runArgs);
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON format');
      return;
    }

    setIsRunning(true);
    const startTime = Date.now();
    const executionId = crypto.randomUUID();

    try {
      const json: any = await apiService.post(`/api/mcp/servers/${selectedTool.serverName}/call-tool`, {
        toolName: selectedTool.name,
        arguments: args,
      });

      const duration = Date.now() - startTime;

      debug('Tool execution result:', json);

      // Log successful execution
      await apiService.post('/api/mcp/tools/history', {
        id: executionId,
        serverName: selectedTool.serverName,
        toolName: selectedTool.name,
        arguments: args,
        result: json.result,
        status: 'success',
        executedAt: new Date().toISOString(),
        duration,
      }).catch(logError => debug('Failed to log execution:', logError));

      // Validate output against schema if available
      let validationWarnings: string[] = [];
      if (selectedTool.outputSchema && Object.keys(selectedTool.outputSchema).length > 0) {
        const validation = validateOutputAgainstSchema(json.result, selectedTool.outputSchema);
        if (!validation.valid) {
          debug('Output schema validation warnings:', validation.errors);
          validationWarnings = validation.errors;
        }
      }

      // Create result object for modal and history
      const toolResult: ToolResult = {
        timestamp: new Date().toISOString(),
        toolName: selectedTool.name,
        serverName: selectedTool.serverName,
        arguments: args,
        result: json.result,
        isError: false,
      };

      // Add to history
      setResultHistory(prev => [toolResult, ...prev].slice(0, 50));

      // Show result modal
      setSelectedResult(toolResult);
      setShowResultModal(true);

      // Show validation warnings if any
      if (validationWarnings.length > 0) {
        setAlert({
          type: 'success',
          message: `Tool executed with schema validation warnings: ${validationWarnings.join(', ')}`
        });
      }

      // Update usage count and recently used
      const newUsageCount = (usageCounts[selectedTool.id] || 0) + 1;
      setUsageCounts(prev => ({
        ...prev,
        [selectedTool.id]: newUsageCount,
      }));

      setRecentlyUsed(prev => {
        const filtered = prev.filter(r => r.toolId !== selectedTool.id);
        return [
          { toolId: selectedTool.id, timestamp: new Date().toISOString(), arguments: args },
          ...filtered
        ].slice(0, 10); // Keep last 10 for better history
      });


      setTools(prev => prev.map(t =>
        t.id === selectedTool.id
          ? { ...t, usageCount: newUsageCount, lastUsed: new Date().toISOString() }
          : t,
      ));

      handleCloseRunModal();
    } catch (error: any) {
      // Create error result object
      const errorResult: ToolResult = {
        timestamp: new Date().toISOString(),
        toolName: selectedTool.name,
        serverName: selectedTool.serverName,
        arguments: args,
        error: {
          message: error.message,
          stack: error.stack,
        },
        isError: true,
      };

      // Add to history
      setResultHistory(prev => [errorResult, ...prev].slice(0, 50));

      // Show error in modal
      setSelectedResult(errorResult);
      setShowResultModal(true);

      handleCloseRunModal();
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleTool = async (toolId: string) => {
    try {
      const tool = tools.find(t => t.id === toolId);
      if (!tool) {
        setAlert({ type: 'error', message: 'Tool not found' });
        return;
      }

      const newEnabledState = !tool.enabled;

      // Call backend API to persist the change
      const res = await fetch(`/api/mcp/tools/${toolId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newEnabledState,
          serverName: tool.serverName,
          toolName: tool.name,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update tool status on server');
      }

      // Update local state after successful API call
      setTools(prev => prev.map(t =>
        t.id === toolId
          ? { ...t, enabled: newEnabledState }
          : t,
      ));
      setAlert({ type: 'success', message: `Tool ${newEnabledState ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update tool status' });
    }
  };

  const fetchExecutionHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/mcp/tools/history?limit=50');
      if (res.ok) {
        const json = await res.json();
        setExecutionHistory(json.data || []);
      } else {
        setAlert({ type: 'error', message: 'Failed to load execution history' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to load execution history' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    fetchExecutionHistory();
  };

  const renderFormFields = () => {
    if (!selectedTool || !selectedTool.inputSchema || !selectedTool.inputSchema.properties) {
      return (
        <div className="alert alert-info shadow-sm text-sm">
          No arguments required or schema not available.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(selectedTool.inputSchema.properties).map(([key, schema]: [string, any]) => {
          const isRequired = selectedTool.inputSchema.required?.includes(key);
          const type = schema.type;

          return (
            <div key={key} className="form-control">
              <label className="label">
                <span className="label-text font-medium flex gap-1">
                  {key}
                  {isRequired && <span className="text-error">*</span>}
                </span>
                <span className="label-text-alt opacity-70">{type}</span>
              </label>

              {type === 'boolean' ? (
                <Toggle
                  className="toggle toggle-primary"
                  checked={formArgs[key] || false}
                  onChange={(e) => updateFormArg(key, e.target.checked)}
                  disabled={isRunning}
                />
              ) : type === 'integer' || type === 'number' ? (
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder={`Enter ${key}...`}
                  value={formArgs[key] !== undefined && formArgs[key] !== null ? formArgs[key] : ''}
                  onChange={(e) => updateFormArg(key, e.target.value === '' ? undefined : Number(e.target.value))}
                  disabled={isRunning}
                />
              ) : (
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder={`Enter ${key}...`}
                  value={formArgs[key] || ''}
                  onChange={(e) => updateFormArg(key, e.target.value)}
                  disabled={isRunning}
                />
              )}

              {schema.description && (
                <label className="label">
                  <span className="label-text-alt text-base-content/60">{schema.description}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderToolCard = (tool: MCPTool, compact = false) => {
    const isFavorite = favorites.includes(tool.id);

    if (compact) {
      // Compact card for Recently Used and Favorites sections
      return (
        <div key={tool.id} className="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow">
          <div className="card-body p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ToolIcon className="w-4 h-4 text-base-content/70 flex-shrink-0" />
                  <h3 className="font-medium text-sm truncate">{tool.name}</h3>
                </div>
                <p className="text-xs text-base-content/60 line-clamp-2 mb-2">{tool.description}</p>
                <div className="flex gap-1 flex-wrap">
                  <div className="badge badge-xs">{tool.serverName}</div>
                  {tool.usageCount > 0 && (
                    <div className="badge badge-xs badge-ghost">{tool.usageCount}x</div>
                  )}
                </div>
              </div>
              <button
                className="btn btn-xs btn-ghost btn-circle"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(tool.id);
                }}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? (
                  <StarSolidIcon className="w-4 h-4 text-warning" />
                ) : (
                  <StarOutlineIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className="btn btn-xs btn-primary flex-1"
                onClick={() => handleQuickExecute(tool)}
                disabled={!tool.enabled}
              >
                <RunIcon className="w-3 h-3" />
                Run
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Full card for main grid
    return (
      <div key={tool.id} className="card bg-base-100 shadow-xl h-full">
        <div className="card-body">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-1">
              <ToolIcon className="w-5 h-5 text-base-content/70" />
              <h2 className="card-title text-lg">
                {tool.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-ghost btn-circle"
                onClick={() => handleToggleFavorite(tool.id)}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? (
                  <StarSolidIcon className="w-5 h-5 text-warning" />
                ) : (
                  <StarOutlineIcon className="w-5 h-5" />
                )}
              </button>
              <div className={`badge ${tool.enabled ? 'badge-success' : 'badge-ghost'}`}>
                {tool.enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>

          <p className="text-sm text-base-content/70 mb-4">
            {tool.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <div className={`badge ${getCategoryColor(tool.category)}`}>
              {tool.category}
            </div>
            <div className="badge badge-outline">{tool.serverName}</div>
            {tool.outputSchema && Object.keys(tool.outputSchema).length > 0 && (
              <div className="badge badge-info badge-outline" title="Has output schema">
                Schema
              </div>
            )}
          </div>

          <div className="text-xs space-y-1 mb-4">
            <p><strong>Usage:</strong> {tool.usageCount} times</p>
            {tool.lastUsed && (
              <p className="text-base-content/50">
                Last used: {new Date(tool.lastUsed).toLocaleString()}
              </p>
            )}
          </div>

          <div className="card-actions justify-between mt-auto">
            <button
              className={`btn btn-sm ${tool.enabled ? 'btn-error btn-outline' : 'btn-success btn-outline'}`}
              onClick={() => handleToggleTool(tool.id)}
            >
              {tool.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleOpenRunModal(tool)}
              disabled={!tool.enabled}
            >
              <RunIcon className="w-4 h-4 mr-1" />
              Run Tool
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Ref for virtualizer parent
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer for main grid (only when there are many items)
  const shouldVirtualize = filteredTools.length > 50;
  const gridRowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredTools.length / 3), // 3 columns
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Estimated card height
    overscan: 2,
    enabled: shouldVirtualize,
  });

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonGrid count={6} showImage={false} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            MCP Tools
          </h1>
          <p className="text-base-content/70">
            Browse and manage tools available from your MCP servers
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleShowHistory}
        >
          <ClockIcon className="w-4 h-4 mr-1" />
          Execution History
        </button>
      </div>

      {alert && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {/* Recently Used Section */}
      {recentTools.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="w-5 h-5 text-base-content/70" />
            <h2 className="text-lg font-semibold">Recently Used</h2>
            <div className="badge badge-ghost">{recentTools.length}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {recentTools.map(tool => renderToolCard(tool, true))}
          </div>
        </div>
      )}

      {/* Favorites Section */}
      {favoriteTools.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <StarSolidIcon className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold">Favorites</h2>
            <div className="badge badge-ghost">{favoriteTools.length}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {favoriteTools.map(tool => renderToolCard(tool, true))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs tabs-boxed mb-4 bg-base-200">
        <button
          className={`tab ${viewFilter === 'all' ? 'tab-active' : ''}`}
          onClick={() => setViewFilter('all')}
        >
          All Tools
        </button>
        <button
          className={`tab ${viewFilter === 'favorites' ? 'tab-active' : ''}`}
          onClick={() => setViewFilter('favorites')}
        >
          Favorites {favorites.length > 0 && `(${favorites.length})`}
        </button>
        <button
          className={`tab ${viewFilter === 'recent' ? 'tab-active' : ''}`}
          onClick={() => setViewFilter('recent')}
        >
          Recently Used {recentTools.length > 0 && `(${recentTools.length})`}
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="form-control w-full md:w-auto md:flex-1 max-w-md">
          <div className="input-group">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search tools..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon className="w-5 h-5 absolute left-3 top-3 text-base-content/50" />
            </div>
          </div>
        </div>

        <select
          className="select select-bordered w-full md:w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered w-full md:w-auto"
          value={serverFilter}
          onChange={(e) => setServerFilter(e.target.value)}
        >
          <option value="all">All Servers</option>
          {servers.map(server => (
            <option key={server.id} value={server.id}>
              {server.name}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered w-full md:w-auto"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort: Name (A-Z)</option>
          <option value="usage">Sort: Usage Count</option>
          <option value="recent">Sort: Recently Used</option>
        </select>
      </div>

      <p className="text-sm text-base-content/70 mb-4">
        Showing {filteredTools.length} of {tools.length} tools
      </p>

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
              const rowTools = filteredTools.slice(startIndex, startIndex + 3);

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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                    {rowTools.map((tool) => (
                      <div key={tool.id}>
                        {renderToolCard(tool, false)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => renderToolCard(tool, false))}
        </div>
      )}

      {filteredTools.length === 0 && !loading && (
        <div className="text-center mt-12">
          <h3 className="text-lg font-medium text-base-content/70">
            No tools found
          </h3>
          <p className="text-sm text-base-content/50 mt-1">
            Try adjusting your search criteria or add more MCP servers
          </p>
        </div>
      )}

      {selectedTool && (
        <Modal
          isOpen={!!selectedTool}
          onClose={handleCloseRunModal}
          title={`Run Tool: ${selectedTool.name}`}
          actions={[
            {
              label: 'Cancel',
              onClick: handleCloseRunModal,
              variant: 'ghost',
              disabled: isRunning,
            },
            {
              label: isRunning ? 'Running...' : 'Run Tool',
              onClick: handleExecuteTool,
              variant: 'primary',
              loading: isRunning,
              disabled: isRunning,
            },
          ]}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <p className="text-base-content/70 text-sm flex-1">
                {selectedTool.description}
              </p>

              <div className="join">
                <button
                  className={`join-item btn btn-sm ${mode === 'form' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('form')}
                  title="Form Builder"
                  aria-label="Form Builder"
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
                <button
                  className={`join-item btn btn-sm ${mode === 'json' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('json')}
                  title="Raw JSON"
                  aria-label="Raw JSON"
                >
                  <CodeBracketIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Input Schema</span>
              </label>
              <div className="mockup-code bg-base-300 text-xs p-0 min-h-0">
                <pre className="p-4 overflow-x-auto">
                  <code>{JSON.stringify(selectedTool.inputSchema, null, 2)}</code>
                </pre>
              </div>
            </div>

            {selectedTool.outputSchema && Object.keys(selectedTool.outputSchema).length > 0 && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Output Schema</span>
                </label>
                <div className="mockup-code bg-base-300 text-xs p-0 min-h-0">
                  <pre className="p-4 overflow-x-auto">
                    <code>{JSON.stringify(selectedTool.outputSchema, null, 2)}</code>
                  </pre>
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Expected output format returned by this tool
                  </span>
                </label>
              </div>
            )}

            {mode === 'form' ? (
              <div className="bg-base-200 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-sm uppercase opacity-50">Arguments Form</span>
                </div>
                {renderFormFields()}
              </div>
            ) : (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Arguments (JSON)</span>
                </label>
                <textarea
                  className={`textarea textarea-bordered h-32 font-mono text-sm ${jsonError ? 'textarea-error' : ''}`}
                  value={runArgs}
                  onChange={(e) => {
                    setRunArgs(e.target.value);
                    if (jsonError) setJsonError(null);
                    try {
                      setFormArgs(JSON.parse(e.target.value));
                    } catch { }
                  }}
                  placeholder="{}"
                  disabled={isRunning}
                />
                {jsonError && (
                  <label className="label">
                    <span className="label-text-alt text-error">{jsonError}</span>
                  </label>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Execution History Modal */}
      {showHistory && (
        <Modal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          title="Tool Execution History"
          size="xl"
        >
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : executionHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-base-content/70">No execution history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Tool</th>
                      <th>Server</th>
                      <th>Duration</th>
                      <th>Executed At</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executionHistory.map((record) => (
                      <tr key={record.id}>
                        <td>
                          {record.status === 'success' ? (
                            <div className="flex items-center gap-1 text-success">
                              <CheckCircleIcon className="w-5 h-5" />
                              <span>Success</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-error">
                              <XCircleIcon className="w-5 h-5" />
                              <span>Error</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="font-medium">{record.toolName}</div>
                        </td>
                        <td>
                          <div className="badge badge-outline badge-sm">
                            {record.serverName}
                          </div>
                        </td>
                        <td>{record.duration}ms</td>
                        <td>
                          <div className="text-sm">
                            {new Date(record.executedAt).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <details className="collapse collapse-arrow bg-base-200">
                            <summary className="collapse-title text-xs font-medium cursor-pointer min-h-0 py-2">
                              View
                            </summary>
                            <div className="collapse-content text-xs">
                              <div className="space-y-2 pt-2">
                                <div>
                                  <strong>Arguments:</strong>
                                  <pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(record.arguments, null, 2)}
                                  </pre>
                                </div>
                                {record.status === 'success' ? (
                                  <div>
                                    <strong>Result:</strong>
                                    <pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto">
                                      {JSON.stringify(record.result, null, 2)}
                                    </pre>
                                  </div>
                                ) : (
                                  <div>
                                    <strong>Error:</strong>
                                    <div className="bg-error/10 text-error p-2 rounded mt-1">
                                      {record.error}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-xs text-base-content/60 text-center pt-4">
              Showing last 50 executions (retention: 1000 max)
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MCPToolsPage;
