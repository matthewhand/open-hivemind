import React from 'react';
import Checkbox from '../../components/DaisyUI/Checkbox';
import { Alert } from '../../components/DaisyUI/Alert';
import Tooltip from '../../components/DaisyUI/Tooltip';
import {
  AlertCircle,
  RefreshCw,
  Pencil,
  Play,
  Square,
  Trash2,
  Wrench,
} from 'lucide-react';

// Types simplified for this component
interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  description?: string;
  toolCount: number;
  lastConnected?: string;
  error?: string;
  tools?: any[];
  apiKey?: string;
}

interface MCPServerCardProps {
  server: MCPServer;
  bulk: any;
  getStatusColor: (status: string) => string;
  handleViewTools: (server: MCPServer) => void;
  handleServerAction: (serverId: string, action: 'start' | 'stop' | 'restart') => void;
  handleEditServer: (server: MCPServer) => void;
  handleDeleteServer: (serverId: string) => void;
}

export const MCPServerCard: React.FC<MCPServerCardProps> = ({
  server,
  bulk,
  getStatusColor,
  handleViewTools,
  handleServerAction,
  handleEditServer,
  handleDeleteServer,
}) => {
  return (
    <div key={server.id} className="card bg-base-100 shadow-xl h-full border border-base-200">
      <div className="card-body">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              className="checkbox checkbox-sm checkbox-primary"
              checked={bulk.isSelected(server.id)}
              onChange={(e) => bulk.toggleItem(server.id, e as any)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${server.name}`}
            />
            <h2 className="card-title text-lg font-bold">{server.name}</h2>
          </div>
          <div className={`badge ${getStatusColor(server.status)}`}>{server.status}</div>
        </div>

        <p className="text-sm text-base-content/70 mb-2 min-h-[40px]">
          {server.description || 'No description provided.'}
        </p>

        {server.status === 'error' && server.error && (
          <Alert status="error" className="text-xs py-2 px-3 mb-3">
            <AlertCircle className="w-4 h-4" />
            <span>{server.error}</span>
          </Alert>
        )}

        <div className="text-sm space-y-1 mb-4 bg-base-200/50 p-3 rounded-lg">
          <p className="truncate" title={server.url}>
            <strong>URL:</strong> {server.url}
          </p>
          <div className="flex items-center gap-2">
            <p>
              <strong>Tools:</strong> {server.toolCount}
            </p>
            {server.toolCount > 0 && (server.status === 'running' || server.tools?.length) && (
              <button
                className="btn btn-xs btn-ghost text-primary"
                onClick={() => handleViewTools(server)}
              >
                View Tools
              </button>
            )}
          </div>
          {server.lastConnected && (
            <p className="text-base-content/50 text-xs">
              Last connected: {new Date(server.lastConnected).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="card-actions justify-between mt-auto pt-4 border-t border-base-200">
          <div className="flex gap-1">
            {server.status === 'running' ? (
              <Tooltip content="Disconnect">
                <button
                  className="btn btn-ghost btn-sm btn-circle text-error"
                  aria-label={`Disconnect ${server.name}`}
                  onClick={() => handleServerAction(server.id, 'stop')}
                >
                  <Square className="w-5 h-5" />
                </button>
              </Tooltip>
            ) : (
              <Tooltip content={server.status === 'stopped' ? 'Connect' : 'Retry Connection'}>
                <button
                  className="btn btn-ghost btn-sm btn-circle text-success"
                  aria-label={
                    server.status === 'stopped'
                      ? `Connect ${server.name}`
                      : `Retry Connection ${server.name}`
                  }
                  onClick={() => handleServerAction(server.id, 'start')}
                >
                  {server.status === 'error' ? (
                    <RefreshCw className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
              </Tooltip>
            )}
            {server.toolCount > 0 && (
              <Tooltip content="View Tools">
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  aria-label={`View Tools for ${server.name}`}
                  onClick={() => handleViewTools(server)}
                >
                  <Wrench className="w-5 h-5" />
                </button>
              </Tooltip>
            )}
          </div>
          <div className="flex gap-1">
            <Tooltip content="Edit Configuration">
              <button
                className="btn btn-ghost btn-sm btn-circle"
                aria-label={`Edit ${server.name}`}
                onClick={() => handleEditServer(server)}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Delete Server">
              <button
                className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error hover:text-error-content"
                aria-label={`Delete ${server.name}`}
                onClick={() => handleDeleteServer(server.id)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
