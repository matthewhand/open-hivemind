import React, { memo } from 'react';
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
import Card from '../../components/DaisyUI/Card';
import Button from '../../components/DaisyUI/Button';

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
  onCardClick?: (server: MCPServer) => void;
  isSelected?: boolean;
}

export const MCPServerCard: React.FC<MCPServerCardProps> = memo(({
  server,
  bulk,
  getStatusColor,
  handleViewTools,
  handleServerAction,
  handleEditServer,
  handleDeleteServer,
  onCardClick,
  isSelected,
}) => {
  return (
    <Card key={server.id} className={`shadow-xl h-full border transition-all cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-base-200 hover:shadow-2xl'}`} onClick={() => onCardClick?.(server)}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              variant="primary"
              size="sm"
              checked={bulk.isSelected(server.id)}
              onChange={(e) => bulk.toggleItem(server.id, e as any)}
              onClick={(e) => e.stopPropagation()}
              aria-label={String(`Select ${server.name}`)}
            />
            <Card.Title className="text-lg font-bold">{server.name}</Card.Title>
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

        <dl className="text-sm space-y-1 mb-4 bg-base-200/50 p-3 rounded-lg">
          <div className="flex gap-1 truncate" title={server.url}>
              <dt className="font-semibold">URL:</dt>
              <dd>{server.url}</dd>
            </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <dt className="font-semibold">Tools:</dt>
              <dd>{server.toolCount}</dd>
            </div>
            {server.toolCount > 0 && (server.status === 'running' || server.tools?.length) && (
              <Button
                buttonStyle="outline"
                size="xs"
                className="text-primary"
                onClick={() => handleViewTools(server)}
              >
                View Tools
              </Button>
            )}
          </div>
          {server.lastConnected && (
            <div className="flex gap-1 text-base-content/50 text-xs">
              <dt className="font-semibold">Last connected:</dt>
              <dd>{new Date(server.lastConnected).toLocaleDateString()}</dd>
            </div>
          )}
        </dl>

        <Card.Actions className="justify-between mt-auto pt-4 border-t border-base-200">
          <div className="flex gap-1">
            {server.status === 'running' ? (
              <Tooltip content="Disconnect">
                <Button
                  buttonStyle="outline"
                  size="sm"
                  className="btn-circle text-error"
                  aria-label={String(`Disconnect ${server.name}`)}
                  onClick={(e) => { e.stopPropagation(); handleServerAction(server.id, 'stop'); }}
                >
                  <Square className="w-5 h-5" />
                </Button>
              </Tooltip>
            ) : (
              <Tooltip content={server.status === 'stopped' ? 'Connect' : 'Retry Connection'}>
                <Button
                  buttonStyle="outline"
                  size="sm"
                  className="btn-circle text-success"
                  aria-label={String(server.status === 'stopped' ? `Connect ${server.name}` : `Retry Connection ${server.name}`)}
                  onClick={(e) => { e.stopPropagation(); handleServerAction(server.id, 'start'); }}
                >
                  {server.status === 'error' ? (
                    <RefreshCw className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
              </Tooltip>
            )}
            {server.toolCount > 0 && (
              <Tooltip content="View Tools">
                <Button
                  buttonStyle="outline"
                  size="sm"
                  className="btn-circle"
                  aria-label={String(`View Tools for ${server.name}`)}
                  onClick={(e) => { e.stopPropagation(); handleViewTools(server); }}
                >
                  <Wrench className="w-5 h-5" />
                </Button>
              </Tooltip>
            )}
          </div>
          <div className="flex gap-1">
            <Tooltip content="Edit Configuration">
              <Button
                buttonStyle="outline"
                size="sm"
                className="btn-circle"
                aria-label={String(`Edit ${server.name}`)}
                onClick={(e) => { e.stopPropagation(); handleEditServer(server); }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete Server">
              <Button
                buttonStyle="outline"
                size="sm"
                className="btn-circle text-error hover:bg-error hover:text-error-content"
                aria-label={String(`Delete ${server.name}`)}
                onClick={(e) => { e.stopPropagation(); handleDeleteServer(server.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        </Card.Actions>
    </Card>
  );
});

MCPServerCard.displayName = 'MCPServerCard';
