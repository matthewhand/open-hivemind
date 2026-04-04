import React from 'react';
import {
  WrenchScrewdriverIcon as ToolIcon,
  PlayIcon as RunIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import type { MCPTool } from '../../hooks/useToolsLogic';
import { Badge } from '../DaisyUI/Badge';

interface ToolCardProps {
  tool: MCPTool;
  isFavorite: boolean;
  onToggleFavorite: (toolId: string) => void;
  onQuickExecute: (tool: MCPTool) => void;
  onOpenModal: (tool: MCPTool) => void;
  onToggleTool: (toolId: string) => void;
  compact?: boolean;
  getCategoryColor: (category: string) => string;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite,
  onToggleFavorite,
  onQuickExecute,
  onOpenModal,
  onToggleTool,
  compact = false,
  getCategoryColor,
}) => {
  if (compact) {
    return (
      <div className="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow">
        <div className="card-body p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ToolIcon className="w-4 h-4 text-base-content/70 flex-shrink-0" />
                <h3 className="font-medium text-sm truncate">{tool.name}</h3>
              </div>
              <p className="text-xs text-base-content/60 line-clamp-2 mb-2">{tool.description}</p>
              <div className="flex gap-1 flex-wrap">
                <Badge size="xs">{tool.serverName}</Badge>
                {tool.usageCount > 0 && (
                  <Badge size="xs" variant="ghost">{tool.usageCount}x</Badge>
                )}
              </div>
            </div>
            <button
              className="btn btn-xs btn-ghost btn-circle"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(tool.id);
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
              onClick={() => onQuickExecute(tool)}
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

  return (
    <div className="card bg-base-100 shadow-xl h-full">
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
              onClick={() => onToggleFavorite(tool.id)}
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
          <Badge style="outline">{tool.serverName}</Badge>
          {tool.outputSchema && Object.keys(tool.outputSchema).length > 0 && (
            <Badge variant="info" style="outline">
              Schema
            </Badge>
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
            onClick={() => onToggleTool(tool.id)}
          >
            {tool.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onOpenModal(tool)}
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
