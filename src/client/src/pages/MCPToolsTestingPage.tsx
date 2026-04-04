/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  WrenchScrewdriverIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CodeBracketIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import { Alert } from '../components/DaisyUI/Alert';
import { Badge } from '../components/DaisyUI/Badge';
import Toggle from '../components/DaisyUI/Toggle';
import Divider from '../components/DaisyUI/Divider';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import Debug from 'debug';

const debug = Debug('app:client:pages:MCPToolsTestingPage');

interface MCPTool {
  name: string;
  description: string;
  serverId: string;
  serverName: string;
  inputSchema: any;
}

interface TestResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  timestamp: string;
}

const MCPToolsTestingPage: React.FC = () => {
  const [servers, setServers] = useState<any[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch MCP servers and tools
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/mcp/servers');
        if (res.ok) {
          const json = await res.json();
          const serverList = json.servers || [];
          setServers(serverList);

          // Flatten tools from all servers
          const allTools: MCPTool[] = [];
          serverList.forEach((server: any) => {
            if (server.tools && Array.isArray(server.tools)) {
              server.tools.forEach((tool: any) => {
                allTools.push({
                  name: tool.name,
                  description: tool.description || 'No description available',
                  serverId: server.name,
                  serverName: server.name,
                  inputSchema: tool.inputSchema,
                });
              });
            }
          });

          setTools(allTools);
        }
      } catch (err) {
        setAlert({ type: 'error', message: 'Failed to load MCP tools' });
        debug('Error loading tools:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setFormData({});
    setTestResult(null);
  };

  const handleInputChange = (key: string, value: any, type: string) => {
    let parsedValue = value;

    if (type === 'integer' || type === 'number') {
      parsedValue = value === '' ? undefined : Number(value);
    } else if (type === 'boolean') {
      parsedValue = value;
    } else if (type === 'array' || type === 'object') {
      try {
        parsedValue = value ? JSON.parse(value) : undefined;
      } catch {
        // Keep as string if parsing fails
        parsedValue = value;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [key]: parsedValue,
    }));
  };

  const handleTestTool = async () => {
    if (!selectedTool) return;

    setTesting(true);
    setTestResult(null);
    setAlert(null);

    const startTime = Date.now();

    try {
      const res = await fetch(`/api/mcp/servers/${selectedTool.serverName}/call-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolName: selectedTool.name,
          arguments: formData,
        }),
      });

      const executionTime = Date.now() - startTime;

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Tool execution failed');
      }

      const result = await res.json();

      setTestResult({
        success: true,
        output: result.result,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      setAlert({ type: 'success', message: 'Tool executed successfully!' });
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      setTestResult({
        success: false,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      setAlert({ type: 'error', message: `Test failed: ${error.message}` });
    } finally {
      setTesting(false);
    }
  };

  const renderFormField = (key: string, schema: any, isRequired: boolean) => {
    const type = schema.type;
    const description = schema.description;

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
            color="primary"
            checked={formData[key] || false}
            onChange={(e) => handleInputChange(key, e.target.checked, type)}
            disabled={testing}
            aria-label={`Toggle ${key}`}
          />
        ) : type === 'integer' || type === 'number' ? (
          <input
            type="number"
            className="input input-bordered w-full"
            placeholder={`Enter ${key}...`}
            value={formData[key] !== undefined && formData[key] !== null ? formData[key] : ''}
            onChange={(e) => handleInputChange(key, e.target.value, type)}
            disabled={testing}
          />
        ) : type === 'array' || type === 'object' ? (
          <textarea
            className="textarea textarea-bordered font-mono text-sm"
            placeholder={`Enter ${type} as JSON (e.g., ${type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'})`}
            value={
              formData[key] !== undefined
                ? typeof formData[key] === 'string'
                  ? formData[key]
                  : JSON.stringify(formData[key], null, 2)
                : ''
            }
            onChange={(e) => handleInputChange(key, e.target.value, type)}
            disabled={testing}
            rows={3}
          />
        ) : (
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={`Enter ${key}...`}
            value={formData[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value, type)}
            disabled={testing}
          />
        )}

        {description && (
          <label className="label">
            <span className="label-text-alt text-base-content/60">{description}</span>
          </label>
        )}
      </div>
    );
  };

  const renderToolSchema = () => {
    if (!selectedTool || !selectedTool.inputSchema) {
      return (
        <Alert status="info" className="shadow-sm">
          <InformationCircleIcon className="w-5 h-5" />
          <span>No input schema available for this tool.</span>
        </Alert>
      );
    }

    const { properties = {}, required = [] } = selectedTool.inputSchema;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <CodeBracketIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Input Schema</h3>
        </div>

        <div className="mockup-code bg-base-300 text-xs">
          <pre className="px-4 py-3 overflow-x-auto">
            <code>{JSON.stringify(selectedTool.inputSchema, null, 2)}</code>
          </pre>
        </div>
      </div>
    );
  };

  const renderParameterForm = () => {
    if (!selectedTool || !selectedTool.inputSchema) {
      return (
        <Alert status="info" className="shadow-sm">
          <InformationCircleIcon className="w-5 h-5" />
          <span>This tool does not require any parameters.</span>
        </Alert>
      );
    }

    const { properties = {}, required = [] } = selectedTool.inputSchema;

    if (Object.keys(properties).length === 0) {
      return (
        <Alert status="info" className="shadow-sm">
          <InformationCircleIcon className="w-5 h-5" />
          <span>This tool does not require any parameters.</span>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(properties).map(([key, schema]: [string, any]) => {
          const isRequired = required.includes(key);
          return renderFormField(key, schema, isRequired);
        })}
      </div>
    );
  };

  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            {testResult.success ? (
              <>
                <CheckCircleIcon className="w-6 h-6 text-success" />
                Test Successful
              </>
            ) : (
              <>
                <XCircleIcon className="w-6 h-6 text-error" />
                Test Failed
              </>
            )}
          </h3>
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <ClockIcon className="w-4 h-4" />
            {testResult.executionTime}ms
          </div>
        </div>

        {testResult.success && testResult.output && (
          <div>
            <div className="label">
              <span className="label-text font-medium">Output</span>
            </div>
            <div className="mockup-code bg-base-300 text-xs">
              <pre className="px-4 py-3 overflow-x-auto">
                <code className="language-json">
                  {JSON.stringify(testResult.output, null, 2)}
                </code>
              </pre>
            </div>
          </div>
        )}

        {!testResult.success && testResult.error && (
          <Alert status="error" className="shadow-sm">
            <XCircleIcon className="w-5 h-5" />
            <div>
              <div className="font-bold">Error</div>
              <div className="text-sm">{testResult.error}</div>
            </div>
          </Alert>
        )}

        <div className="text-xs text-base-content/50">
          Executed at: {new Date(testResult.timestamp).toLocaleString()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonGrid count={6} showImage={false} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">MCP Tools Testing</h1>
        <p className="text-base-content/70">
          Test MCP tools with custom parameters before using them in bots
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tool Selection */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">
                <WrenchScrewdriverIcon className="w-5 h-5" />
                Available Tools
              </h2>

              {tools.length === 0 ? (
                <Alert status="warning">
                  <InformationCircleIcon className="w-5 h-5" />
                  <span>No tools available. Connect MCP servers first.</span>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <button
                      key={`${tool.serverId}-${tool.name}`}
                      className={`btn btn-sm w-full justify-start ${
                        selectedTool?.name === tool.name && selectedTool?.serverId === tool.serverId
                          ? 'btn-primary'
                          : 'btn-ghost'
                      }`}
                      onClick={() => handleSelectTool(tool)}
                    >
                      <div className="text-left truncate w-full">
                        <div className="font-semibold truncate">{tool.name}</div>
                        <div className="text-xs opacity-70 truncate">{tool.serverName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tool Details, Form, and Results */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTool ? (
            <>
              {/* Tool Information */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">{selectedTool.name}</h2>
                  <p className="text-sm text-base-content/70">{selectedTool.description}</p>
                  <Badge style="outline">{selectedTool.serverName}</Badge>

                  <Divider />

                  {renderToolSchema()}
                </div>
              </div>

              {/* Parameter Form */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Test Parameters</h2>

                  {renderParameterForm()}

                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-primary"
                      onClick={handleTestTool}
                      disabled={testing}
                    >
                      {testing ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-5 h-5" />
                          Test Tool
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Results */}
              {testResult && (
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">{renderTestResult()}</div>
                </div>
              )}
            </>
          ) : (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="text-center py-12">
                  <WrenchScrewdriverIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                  <h3 className="text-lg font-medium text-base-content/70">
                    Select a tool to test
                  </h3>
                  <p className="text-sm text-base-content/50 mt-2">
                    Choose a tool from the list on the left to view its schema and test it with
                    custom parameters
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MCPToolsTestingPage;
