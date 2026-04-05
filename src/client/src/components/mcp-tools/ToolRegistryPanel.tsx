import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MCPTool, RecentToolUsage } from './types';
import {
  WrenchScrewdriverIcon as ToolIcon,
  PlayIcon as RunIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import { ToolFilters } from '../tools/ToolFilters';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import Card from '../DaisyUI/Card';
import EmptyState from '../DaisyUI/EmptyState';
import { SkeletonGrid } from '../DaisyUI/Skeleton';
import { Badge } from '../DaisyUI/Badge';
import Tabs from '../DaisyUI/Tabs';

interface ToolRegistryPanelProps {
  tools: MCPTool[];
  filteredTools: MCPTool[];
  loading: boolean;
  favorites: string[];
  recentlyUsed: RecentToolUsage[];
  onToggleFavorite: (toolId: string) => void;
  onToggleTool: (toolId: string) => void;
  onRunTool: (tool: MCPTool, prefillArgs?: Record<string, any>) => void;

  // Filters state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  serverFilter: string;
  setServerFilter: (server: string) => void;
  viewFilter: string;
  setViewFilter: (view: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  categories: string[];
  servers: { id: string; name: string }[];
}

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

const ToolRegistryPanel: React.FC<ToolRegistryPanelProps> = ({
  tools,
  filteredTools,
  loading,
  favorites,
  recentlyUsed,
  onToggleFavorite,
  onToggleTool,
  onRunTool,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  serverFilter,
  setServerFilter,
  viewFilter,
  setViewFilter,
  sortBy,
  setSortBy,
  categories,
  servers,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

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

  const shouldVirtualize = filteredTools.length > 50;
  const gridRowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredTools.length / 3), // 3 columns
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Estimated card height
    overscan: 2,
    enabled: shouldVirtualize,
  });

  const renderToolCard = (tool: MCPTool, compact = false) => {
    const isFavorite = favorites.includes(tool.id);

    if (compact) {
      return (
        <Card key={tool.id} className="border border-base-300 hover:shadow-md transition-shadow">
          <Card.Body className="p-4">
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
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
                onClick={() => {
                  const lastUsage = recentlyUsed.find(r => r.toolId === tool.id);
                  onRunTool(tool, lastUsage?.arguments);
                }}
                disabled={!tool.enabled}
              >
                <RunIcon className="w-3 h-3" />
                Run
              </button>
            </div>
          </Card.Body>
        </Card>
      );
    }

    return (
      <Card key={tool.id} className="shadow-xl h-full">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-1">
              <ToolIcon className="w-5 h-5 text-base-content/70" />
              <Card.Title className="text-lg">
                {tool.name}
              </Card.Title>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-ghost btn-circle"
                onClick={() => onToggleFavorite(tool.id)}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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

          <Card.Actions className="justify-between mt-auto">
            <button
              className={`btn btn-sm ${tool.enabled ? 'btn-error btn-outline' : 'btn-success btn-outline'}`}
              onClick={() => onToggleTool(tool.id)}
            >
              {tool.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onRunTool(tool)}
              disabled={!tool.enabled}
            >
              <RunIcon className="w-4 h-4 mr-1" />
              Run Tool
            </button>
          </Card.Actions>
      </Card>
    );
  };

  if (loading) {
    return <SkeletonGrid count={6} showImage={false} />;
  }

  return (
    <>
      {/* Recently Used Section */}
      {recentTools.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="w-5 h-5 text-base-content/70" />
            <h2 className="text-lg font-semibold">Recently Used</h2>
            <Badge variant="ghost">{recentTools.length}</Badge>
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
            <Badge variant="ghost">{favoriteTools.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {favoriteTools.map(tool => renderToolCard(tool, true))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <Tabs
        tabs={[
          { key: 'all', label: 'All Tools' },
          { key: 'favorites', label: `Favorites${favorites.length > 0 ? ` (${favorites.length})` : ''}` },
          { key: 'recent', label: `Recently Used${recentTools.length > 0 ? ` (${recentTools.length})` : ''}` },
        ]}
        activeTab={viewFilter}
        onChange={setViewFilter}
        variant="boxed"
        className="mb-4"
      />

      {/* Filters and Sort */}
      <ToolFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        serverFilter={serverFilter}
        setServerFilter={setServerFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        categories={categories}
        servers={servers}
      />

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
        <EmptyState
          icon={Search}
          title="No tools found"
          description="Try adjusting your search criteria or add more MCP servers"
          variant="noResults"
        />
      )}
    </>
  );
};

export default ToolRegistryPanel;
