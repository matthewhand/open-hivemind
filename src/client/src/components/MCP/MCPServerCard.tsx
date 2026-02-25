import React from 'react';
import {
  StopCircle,
  Play,
  ArrowRightLeft,
  Wrench,
  Pencil,
  Trash2,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Card, Badge, Button, Tooltip } from '../DaisyUI';

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  description: string;
  toolCount: number;
  lastConnected?: string;
  apiKey?: string;
  error?: string;
  tools?: any[];
}

interface MCPServerCardProps {
  server: MCPServer;
  onAction: (serverId: string, action: 'start' | 'stop' | 'restart') => void;
  onEdit: (server: MCPServer) => void;
  onDelete: (serverId: string) => void;
  onViewTools: (server: MCPServer) => void;
}

const MCPServerCard: React.FC<MCPServerCardProps> = ({
  server,
  onAction,
  onEdit,
  onDelete,
  onViewTools,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'ghost';
      case 'error': return 'error';
      default: return 'ghost';
    }
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow border border-base-200">
      <div className="card-body p-5">
        <div className="flex justify-between items-start mb-2">
          <h2 className="card-title text-lg font-bold flex items-center gap-2">
            {server.name}
          </h2>
          <Badge variant={getStatusColor(server.status) as any} size="sm">
            {server.status}
          </Badge>
        </div>

        <p className="text-sm text-base-content/70 mb-3 min-h-[40px] line-clamp-2">
          {server.description || 'No description provided.'}
        </p>

        {server.status === 'error' && server.error && (
          <div className="alert alert-error text-xs py-2 px-3 mb-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="break-all">{server.error}</span>
          </div>
        )}

        <div className="bg-base-200/50 rounded-lg p-3 text-xs space-y-2 mb-4">
          <div className="flex items-center gap-2 text-base-content/80">
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="font-mono truncate" title={server.url}>{server.url}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base-content/80">
              <Wrench className="w-3 h-3" />
              <span>{server.toolCount} tools available</span>
            </div>
            {server.toolCount > 0 && (server.status === 'running' || server.tools?.length) && (
              <button
                className="link link-primary no-underline hover:underline text-xs"
                onClick={() => onViewTools(server)}
              >
                View Tools
              </button>
            )}
          </div>

          {server.lastConnected && (
            <div className="flex items-center gap-2 text-base-content/50">
              <Clock className="w-3 h-3" />
              <span>Last connected: {new Date(server.lastConnected).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="card-actions justify-between mt-auto pt-4 border-t border-base-200">
          <div className="flex gap-1">
            {server.status === 'running' ? (
              <Tooltip content="Disconnect">
                <Button
                  size="sm"
                  shape="circle"
                  variant="ghost"
                  className="text-error hover:bg-error/10"
                  onClick={() => onAction(server.id, 'stop')}
                >
                  <StopCircle className="w-5 h-5" />
                </Button>
              </Tooltip>
            ) : (
              <Tooltip content={server.status === 'stopped' ? "Connect" : "Retry Connection"}>
                <Button
                  size="sm"
                  shape="circle"
                  variant="ghost"
                  className="text-success hover:bg-success/10"
                  onClick={() => onAction(server.id, 'start')}
                >
                  {server.status === 'error' ? <ArrowRightLeft className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
              </Tooltip>
            )}

            {server.toolCount > 0 && (
              <Tooltip content="View Tools">
                <Button
                  size="sm"
                  shape="circle"
                  variant="ghost"
                  onClick={() => onViewTools(server)}
                >
                  <Wrench className="w-5 h-5" />
                </Button>
              </Tooltip>
            )}
          </div>

          <div className="flex gap-1">
            <Tooltip content="Edit Configuration">
              <Button
                size="sm"
                shape="circle"
                variant="ghost"
                onClick={() => onEdit(server)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </Tooltip>

            <Tooltip content="Delete Server">
              <Button
                size="sm"
                shape="circle"
                variant="ghost"
                className="text-error hover:bg-error/10"
                onClick={() => onDelete(server.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MCPServerCard;
