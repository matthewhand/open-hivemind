import React from 'react';
import { MCPTool } from './types';
import { CodeBracketIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { Alert } from '../DaisyUI/Alert';
import Toggle from '../DaisyUI/Toggle';

interface ToolConfigPanelProps {
  tool: MCPTool;
  runArgs: string;
  setRunArgs: (args: string) => void;
  formArgs: Record<string, any>;
  setFormArgs: (args: Record<string, any>) => void;
  mode: 'form' | 'json';
  setMode: (mode: 'form' | 'json') => void;
  jsonError: string | null;
  setJsonError: (error: string | null) => void;
  isRunning: boolean;
}

const ToolConfigPanel: React.FC<ToolConfigPanelProps> = ({
  tool,
  runArgs,
  setRunArgs,
  formArgs,
  setFormArgs,
  mode,
  setMode,
  jsonError,
  setJsonError,
  isRunning,
}) => {
  const updateFormArg = (key: string, value: any) => {
    const newFormArgs = { ...formArgs, [key]: value };
    setFormArgs(newFormArgs);
    setRunArgs(JSON.stringify(newFormArgs, null, 2));
    setJsonError(null);
  };

  const renderFormFields = () => {
    if (!tool.inputSchema || !tool.inputSchema.properties || Object.keys(tool.inputSchema.properties).length === 0) {
      return (
        <Alert status="info" className="shadow-sm text-sm" message="No arguments required or schema not available." />
        <div
          className="alert alert-info shadow-sm text-sm"
          role="status"
          aria-live="polite"
        >
          No arguments required or schema not available.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(tool.inputSchema.properties).map(([key, schema]: [string, any]) => {
          const isRequired = tool.inputSchema.required?.includes(key);
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
                  color="primary"
                  checked={formArgs[key] || false}
                  onChange={(e) => updateFormArg(key, e.target.checked)}
                  disabled={isRunning}
                  aria-label={`Toggle ${key}`}
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        <p className="text-base-content/70 text-sm flex-1">
          {tool.description}
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
            <code>{JSON.stringify(tool.inputSchema, null, 2)}</code>
          </pre>
        </div>
      </div>

      {tool.outputSchema && Object.keys(tool.outputSchema).length > 0 && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Output Schema</span>
          </label>
          <div className="mockup-code bg-base-300 text-xs p-0 min-h-0">
            <pre className="p-4 overflow-x-auto">
              <code>{JSON.stringify(tool.outputSchema, null, 2)}</code>
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
  );
};

export default ToolConfigPanel;
