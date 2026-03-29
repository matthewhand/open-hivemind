import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import BulkActionBar from '../../components/BulkActionBar';
import { MCPServerCard } from './MCPServerCard';

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

interface MCPServerListProps {
  filteredServers: MCPServer[];
  filteredServerIds: string[];
  bulk: any;
  handleBulkDeleteServers: () => void;
  bulkDeleting: boolean;
  getStatusColor: (status: string) => string;
  handleViewTools: (server: MCPServer) => void;
  handleServerAction: (serverId: string, action: 'start' | 'stop' | 'restart') => void;
  handleEditServer: (server: MCPServer) => void;
  handleDeleteServer: (serverId: string) => void;
}

export const MCPServerList: React.FC<MCPServerListProps> = ({
  filteredServers,
  filteredServerIds,
  bulk,
  handleBulkDeleteServers,
  bulkDeleting,
  getStatusColor,
  handleViewTools,
  handleServerAction,
  handleEditServer,
  handleDeleteServer,
}) => {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          className="checkbox checkbox-sm checkbox-primary"
          checked={bulk.isAllSelected}
          onChange={() => bulk.toggleAll(filteredServerIds)}
          aria-label="Select all servers"
        />
        <span className="text-xs text-base-content/60">Select all</span>
      </div>
      <BulkActionBar
        selectedCount={bulk.selectedCount}
        onClearSelection={bulk.clearSelection}
        actions={[
          {
            key: 'delete',
            label: 'Delete',
            icon: <TrashIcon className="w-4 h-4" />,
            variant: 'error',
            onClick: handleBulkDeleteServers,
            loading: bulkDeleting,
          },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => (
          <MCPServerCard
            key={server.id}
            server={server as any}
            bulk={bulk}
            getStatusColor={getStatusColor}
            handleViewTools={handleViewTools}
            handleServerAction={handleServerAction}
            handleEditServer={handleEditServer as any}
            handleDeleteServer={handleDeleteServer}
          />
        ))}
      </div>
    </>
  );
};
