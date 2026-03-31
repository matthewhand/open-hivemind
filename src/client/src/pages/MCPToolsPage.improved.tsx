/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  WrenchScrewdriverIcon as ToolIcon,
  PlayIcon as RunIcon,
  MagnifyingGlassIcon as SearchIcon,
  CodeBracketIcon,
  ListBulletIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import { Alert } from '../components/DaisyUI/Alert';
import Modal from '../components/DaisyUI/Modal';
import { OperationStatus, TimeoutIndicator } from '../components/DaisyUI/LoadingComponents';
import useUrlParams from '../hooks/useUrlParams';
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

const MCPToolsPage: React.FC = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    category: { type: 'string', default: 'all' },
    server: { type: 'string', default: 'all' },
  });
  const searchTerm = urlParams.search;
  const setSearchTerm = (v: string) => setUrlParam('search', v);
  const categoryFilter = urlParams.category;
  const setCategoryFilter = (v: string) => setUrlParam('category', v);
  const serverFilter = urlParams.server;
  const setServerFilter = (v: string) => setUrlParam('server', v);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout warning

      try {
        const res = await fetch('/api/mcp/servers');
        if (res.ok) {
          const json = await res.json();
          const servers = json.servers || [];

          // Flatten structure: Server[] -> Tool[]
          const allTools: MCPTool[] = [];
          servers.forEach((server: any) => {
            if (server.tools && Array.isArray(server.tools)) {
              server.tools.forEach((t: any) => {
                allTools.push({
                  id: `${server.name}-${t.name}`,
                  name: t.name,
                  serverId: server.name,
                  serverName: server.name,
                  description: t.description || 'No description available',
                  category: 'utility',
                  inputSchema: t.inputSchema,
                  outputSchema: t.outputSchema || t.output_schema || {},
                  usageCount: 0,
                  enabled: server.connected,
                });
              });
            }
          });

          setTools(allTools);
          setFilteredTools(allTools);
        }
      } catch (err) {
        setAlert({ type: 'error', message: 'Failed to load tools from server' });
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        setLoadingTimeout(false);
      }
    };

    fetchTools();
  }, []);

  useEffect(() => {
    let filtered = tools;

    if (searchTerm) {
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tool => tool.category === categoryFilter);
    }

    if (serverFilter !== 'all') {
      filtered = filtered.filter(tool => tool.serverId === serverFilter);
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, categoryFilter, serverFilter]);

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
  const [executionTimeElapsed, setExecutionTimeElapsed] = useState(0);
  const [executionTimer, setExecutionTimer] = useState<NodeJS.Timeout | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleOpenRunModal = (tool: MCPTool) => {
    setSelectedTool(tool);
    setRunArgs('{}');
    setFormArgs({});
    setMode('form');
    setJsonError(null);
    setExecutionTimeElapsed(0);
  };

  const handleCloseRunModal = () => {
    if (isRunning) return;
    setSelectedTool(null);
    setRunArgs('{}');
    setFormArgs({});
    setJsonError(null);
    if (executionTimer) clearInterval(executionTimer);
    setExecutionTimer(null);
    setExecutionTimeElapsed(0);
  };

  const handleCancelExecution = () => {
    if (abortController) {
      abortController.abort();
    }
    if (executionTimer) clearInterval(executionTimer);
    setExecutionTimer(null);
    setIsRunning(false);
    setExecutionTimeElapsed(0);
    setAlert({ type: 'error', message: 'Tool execution cancelled' });
    handleCloseRunModal();
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
    const controller = new AbortController();
    setAbortController(controller);

    // Start execution timer
    const timer = setInterval(() => {
      setExecutionTimeElapsed(Date.now() - startTime);
    }, 100);
    setExecutionTimer(timer);

    try {
      const res = await fetch(`/api/mcp/servers/${selectedTool.serverName}/call-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolName: selectedTool.name,
          arguments: args,
        }),
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;

      if (!res.ok) {
        const err = await res.json();
        const errorMessage = err.error || 'Failed to execute tool';

        // Log failed execution
        await fetch('/api/mcp/tools/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: executionId,
            serverName: selectedTool.serverName,
            toolName: selectedTool.name,
            arguments: args,
            result: null,
            error: errorMessage,
            status: 'error',
            executedAt: new Date().toISOString(),
            duration,
          }),
        }).catch(logError => debug('Failed to log error execution:', logError));

        throw new Error(errorMessage);
      }

      const json = await res.json();
      debug('Tool execution result:', json);

      // Log successful execution
      await fetch('/api/mcp/tools/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: executionId,
          serverName: selectedTool.serverName,
          toolName: selectedTool.name,
          arguments: args,
          result: json.result,
          status: 'success',
          executedAt: new Date().toISOString(),
          duration,
        }),
      }).catch(logError => debug('Failed to log execution:', logError));

      // Validate output against schema if available
      if (selectedTool.outputSchema && Object.keys(selectedTool.outputSchema).length > 0) {
        const validation = validateOutputAgainstSchema(json.result, selectedTool.outputSchema);
        if (!validation.valid) {
          debug('Output schema validation warnings:', validation.errors);
          setAlert({
            type: 'success',
            message: `Tool executed with warnings: ${validation.errors.join(', ')}. Result: ${JSON.stringify(json.result).substring(0, 50)}...`
          });
        } else {
          setAlert({ type: 'success', message: `Tool executed successfully in ${(duration / 1000).toFixed(2)}s` });
        }
      } else {
        setAlert({ type: 'success', message: `Tool executed successfully in ${(duration / 1000).toFixed(2)}s` });
      }

      // Update usage count
      setTools(prev => prev.map(t =>
        t.id === selectedTool.id
          ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
          : t,
      ));

      handleCloseRunModal();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setAlert({ type: 'error', message: 'Tool execution was cancelled' });
      } else {
        setAlert({ type: 'error', message: `Failed to execute tool: ${error.message}` });
      }
    } finally {
      if (executionTimer) clearInterval(executionTimer);
      setExecutionTimer(null);
      setIsRunning(false);
      setExecutionTimeElapsed(0);
      setAbortController(null);
    }
  };

  const handleToggleTool = async (toolId: string) => {
    try {
      setTools(prev => prev.map(tool =>
        tool.id === toolId
          ? { ...tool, enabled: !tool.enabled }
          : tool,
      ));
      setAlert({ type: 'success', message: 'Tool status updated' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update tool status' });
    }
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

  if (loading) {
    return (
      <div className="p-6">
        {loadingTimeout && (
          <div className="alert alert-warning mb-4">
            <ClockIcon className="w-5 h-5" />
            <span>Loading is taking longer than expected. Please wait...</span>
          </div>
        )}
        <SkeletonGrid count={6} showImage={false} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          MCP Tools
        </h1>
        <p className="text-base-content/70">
          Browse and manage tools available from your MCP servers
        </p>
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

      {/* Filters */}
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
      </div>

      <p className="text-sm text-base-content/70 mb-4">
        Showing {filteredTools.length} of {tools.length} tools
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <div key={tool.id} className="card bg-base-100 shadow-xl h-full">
            <div className="card-body">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <ToolIcon className="w-5 h-5 text-base-content/70" />
                  <h2 className="card-title text-lg">
                    {tool.name}
                  </h2>
                </div>
                <div className={`badge ${tool.enabled ? 'badge-success' : 'badge-ghost'}`}>
                  {tool.enabled ? 'Enabled' : 'Disabled'}
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
        ))}
      </div>

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
              onClick: isRunning ? handleCancelExecution : handleCloseRunModal,
              variant: 'ghost',
              disabled: false,
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
            {isRunning && (
              <OperationStatus
                isLoading={isRunning}
                operation="Executing tool"
                elapsedTime={executionTimeElapsed}
                showTimeout
                timeoutMs={30000}
                allowCancel
                onCancel={handleCancelExecution}
              />
            )}

            <div className="flex justify-between items-start gap-4">
              <p className="text-base-content/70 text-sm flex-1">
                {selectedTool.description}
              </p>

              <div className="join">
                <button
                  className={`join-item btn btn-sm ${mode === 'form' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('form')}
                  title="Form Builder"
                  disabled={isRunning}
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
                <button
                  className={`join-item btn btn-sm ${mode === 'json' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('json')}
                  title="Raw JSON"
                  disabled={isRunning}
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
                    } catch {}
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
    </div>
  );
};

export default MCPToolsPage;
