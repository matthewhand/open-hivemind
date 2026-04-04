import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Server,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../../components/DaisyUI/PageHeader';
import { Alert } from '../../components/DaisyUI/Alert';
import { Badge } from '../../components/DaisyUI/Badge';
import EmptyState from '../../components/DaisyUI/EmptyState';
import { SkeletonGrid } from '../../components/DaisyUI/Skeleton';
import SearchFilterBar from '../../components/SearchFilterBar';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import useUrlParams from '../../hooks/useUrlParams';
import { useMCPServerActions } from './hooks/useMCPServerActions';
import { useMCPServerData, type MCPServer, type Tool } from './hooks/useMCPServerData';
import { useMCPServerDelete } from './hooks/useMCPServerDelete';
import { MCPServerList } from './MCPServerList';
import { MCPServerModals } from './MCPServerModals';
import { useSavedStamp } from '../../contexts/SavedStampContext';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'badge-success';
    case 'stopped':
      return 'badge-ghost';
    case 'error':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
};

const MCPServersPage: React.FC = () => {
  const {
    servers,
    setServers,
    loading,
    error,
    cautionRepositories,
    showTrustIndicator,
    fetchServers,
  } = useMCPServerData();

  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [viewingTools, setViewingTools] = useState<Tool[]>([]);
  const [viewingServerName, setViewingServerName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { showStamp } = useSavedStamp();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    status: { type: 'string', default: 'All' },
  });
  const searchTerm = urlParams.search;
  const setSearchTerm = (v: string) => setUrlParam('search', v);
  const statusFilter = urlParams.status;
  const setStatusFilter = (v: string) => setUrlParam('status', v);

  const filteredServers = useMemo(
    () =>
      servers.filter((server) => {
        const matchesSearch =
          server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          server.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          server.url.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === 'All' || server.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      }),
    [servers, searchTerm, statusFilter]
  );

  const filteredServerIds = useMemo(() => filteredServers.map((s) => s.id), [filteredServers]);
  const bulk = useBulkSelection(filteredServerIds);

  const { handleServerAction, handleTestConnection, isTesting, handleSaveServer } =
    useMCPServerActions(servers, setServers, fetchServers, setAlert, showStamp);
  const { handleBulkDeleteServers, handleDeleteServer, bulkDeleting } = useMCPServerDelete(
    bulk,
    fetchServers,
    setAlert,
    setConfirmModal
  );

  if (loading)
    return (
      <div className="p-6">
        <SkeletonGrid count={4} showImage={false} />
      </div>
    );

  return (
    <div className="p-6">
      <PageHeader
        title="MCP Servers"
        description="Model Context Protocol servers provide tools and capabilities to your AI agents."
        icon={Server}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedServer({
                id: '',
                name: '',
                url: '',
                status: 'stopped',
                description: '',
                toolCount: 0,
                apiKey: '',
              });
              setIsEditing(false);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Server
          </button>
        }
      />
      <div className="mb-6">
        <SearchFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search servers by name or description..."
        >
          <div className="form-control">
            <select
              className="select select-bordered"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="error">Error</option>
            </select>
          </div>
        </SearchFilterBar>
      </div>
      {error && (
        <Alert status="error" className="mb-6">
          <ShieldAlert className="w-6 h-6" />
          <span>{error}</span>
        </Alert>
      )}
      {!error && showTrustIndicator && cautionRepositories.length > 0 && (
        <div className="mb-6">
          <Alert status="warning" message="Security Notice" className="items-start">
            <div className="space-y-2">
              <p className="font-medium">
                Some repositories are marked for caution before production use.
              </p>
              <div className="flex flex-wrap gap-2">
                {cautionRepositories.map((repo) => (
                  <Badge
                    key={`${repo.owner}/${repo.repo}`}
                    variant="warning"
                    style="outline"
                  >
                    {repo.name} ({repo.owner}/{repo.repo})
                  </Badge>
                ))}
              </div>
            </div>
          </Alert>
        </div>
      )}
      {servers.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No servers configured"
          description="Connect an MCP server to get started extending your bot's capabilities."
          actionLabel="Add Server"
          onAction={() => {
            setSelectedServer({
              id: '',
              name: '',
              url: '',
              status: 'stopped',
              description: '',
              toolCount: 0,
              apiKey: '',
            });
            setIsEditing(false);
            setDialogOpen(true);
          }}
          variant="noData"
        />
      ) : filteredServers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`No servers match your search for "${searchTerm}".`}
          actionLabel="Clear Search"
          onAction={() => {
            setSearchTerm('');
            setStatusFilter('All');
          }}
          variant="noResults"
        />
      ) : (
        <MCPServerList
          filteredServers={filteredServers}
          filteredServerIds={filteredServerIds}
          bulk={bulk}
          handleBulkDeleteServers={handleBulkDeleteServers}
          bulkDeleting={bulkDeleting}
          getStatusColor={getStatusColor}
          handleViewTools={(server) => {
            setViewingServerName(server.name);
            setViewingTools(server.tools || []);
            setToolsModalOpen(true);
          }}
          handleServerAction={handleServerAction}
          handleEditServer={(server) => {
            setSelectedServer(server);
            setIsEditing(true);
            setDialogOpen(true);
          }}
          handleDeleteServer={handleDeleteServer}
        />
      )}
      <MCPServerModals
        toolsModalOpen={toolsModalOpen}
        setToolsModalOpen={setToolsModalOpen}
        viewingServerName={viewingServerName}
        viewingTools={viewingTools}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        isEditing={isEditing}
        alert={alert as any}
        selectedServer={selectedServer}
        setSelectedServer={setSelectedServer as any}
        handleTestConnection={() => handleTestConnection(selectedServer)}
        isTesting={isTesting}
        handleSaveServer={() => handleSaveServer(selectedServer, isEditing, setDialogOpen)}
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
      />
    </div>
  );
};

export default MCPServersPage;
