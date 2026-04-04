import React from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import Button from './DaisyUI/Button';
import { Badge } from './DaisyUI/Badge';

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

interface ToolResultHistoryProps {
  results: ToolResult[];
  onViewResult: (result: ToolResult) => void;
  onClear?: () => void;
}

const ToolResultHistory: React.FC<ToolResultHistoryProps> = ({
  results,
  onViewResult,
  onClear,
}) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/50">
        <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No execution history yet</p>
        <p className="text-sm">Run a tool to see its results here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Recent Executions</h3>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear History
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
              result.isError ? 'border-l-4 border-error' : 'border-l-4 border-success'
            }`}
            onClick={() => onViewResult(result)}
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {result.isError ? (
                    <XCircleIcon className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{result.toolName}</span>
                      <Badge size="sm" variant="ghost">{result.serverName}</Badge>
                    </div>
                    <div className="text-xs text-base-content/60 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                    {result.isError && result.error?.message && (
                      <div className="text-xs text-error mt-1 truncate">
                        {result.error.message}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-xs btn-ghost gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewResult(result);
                  }}
                >
                  <EyeIcon className="w-4 h-4" />
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolResultHistory;
