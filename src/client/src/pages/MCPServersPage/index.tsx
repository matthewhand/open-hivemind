import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit as EditIcon,
  Globe,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Square,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../components/DaisyUI/PageHeader';
import { Alert } from '../../components/DaisyUI/Alert';
import Badge from '../../components/DaisyUI/Badge';
import Button from '../../components/DaisyUI/Button';
import Divider from '../../components/DaisyUI/Divider';
import DetailDrawer from '../../components/DaisyUI/DetailDrawer';
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
import Select from '../../components/DaisyUI/Select';

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
  const [drawerServer, setDrawerServer] = useState<MCPServer | null>(null);
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
            <Select
              className="select-bordered"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="error">Error</option>
            </Select>
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
          onCardClick={(server) => setDrawerServer(server)}
          selectedServerId={drawerServer?.id}
        />
      )}
      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={!!drawerServer}
        onClose={() => setDrawerServer(null)}
        title={drawerServer?.name || 'Server Details'}
        subtitle={drawerServer?.url || undefined}
      >
        {drawerServer && (() => {
          // Find the latest server data (status may have changed)
          const liveServer = servers.find(s => s.id === drawerServer.id) || drawerServer;
          return (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-primary" />
                <div className="flex-1">
                  <div className="font-bold text-lg">{liveServer.name}</div>
                  <p className="text-sm text-base-content/60">{liveServer.description || 'No description'}</p>
                </div>
                <Badge
                  variant={liveServer.status === 'running' ? 'success' : liveServer.status === 'error' ? 'error' : 'ghost'}
                  size="small"
                >
                  {liveServer.status}
                </Badge>
              </div>

              <Divider />

              {/* Connection details */}
              <div>
                <h4 className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Connection Details
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-base-200/50 rounded text-sm">
                    <span className="font-medium text-base-content/70">URL</span>
                    <span className="font-mono text-xs truncate max-w-[220px]">{liveServer.url || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-base-200/50 rounded text-sm">
                    <span className="font-medium text-base-content/70">Status</span>
                    <span className={`text-xs font-medium ${liveServer.status === 'running' ? 'text-success' : liveServer.status === 'error' ? 'text-error' : 'text-base-content/50'}`}>
                      {liveServer.status === 'running' && <><CheckCircle className="w-3 h-3 inline mr-1" />Connected</>}
                      {liveServer.status === 'stopped' && <><XCircle className="w-3 h-3 inline mr-1" />Disconnected</>}
                      {liveServer.status === 'error' && <><AlertCircle className="w-3 h-3 inline mr-1" />Error</>}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-base-200/50 rounded text-sm">
                    <span className="font-medium text-base-content/70">API Key</span>
                    <span className="text-xs">
                      {liveServer.apiKey
                        ? <span className="text-success">Configured <CheckCircle className="w-3 h-3 inline" /></span>
                        : <span className="text-base-content/50">Not set</span>}
                    </span>
                  </div>
                  {liveServer.lastConnected && (
                    <div className="flex justify-between items-center p-2 bg-base-200/50 rounded text-sm">
                      <span className="font-medium text-base-content/70">Last Connected</span>
                      <span className="text-xs">{new Date(liveServer.lastConnected).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error display */}
              {liveServer.status === 'error' && liveServer.error && (
                <Alert status="error" className="text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>{liveServer.error}</span>
                </Alert>
              )}

              <Divider />

              {/* Tools list */}
              <div>
                <h4 className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2">
                  <Wrench className="w-3 h-3" /> Available Tools ({liveServer.toolCount})
                </h4>
                {liveServer.tools && liveServer.tools.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {liveServer.tools.map((tool) => (
                      <div key={tool.name} className="p-2 bg-base-200/50 rounded text-sm">
                        <div className="font-medium text-xs">{tool.name}</div>
                        {tool.description && (
                          <p className="text-xs text-base-content/50 mt-0.5 line-clamp-2">{tool.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm opacity-50 italic">
                    {liveServer.status === 'running' ? 'No tools reported.' : 'Connect to discover tools.'}
                  </p>
                )}
              </div>

              <Divider />

              {/* Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase opacity-50 mb-2">Actions</h4>

                {/* Connect / Disconnect */}
                <Button
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start gap-2 ${liveServer.status === 'running' ? 'text-error border-error/30 hover:bg-error/10' : 'text-success border-success/30 hover:bg-success/10'}`}
                  onClick={() => {
                    handleServerAction(liveServer.id, liveServer.status === 'running' ? 'stop' : 'start');
                  }}
                >
                  {liveServer.status === 'running'
                    ? <><Square className="w-4 h-4" /> Disconnect</>
                    : <><Play className="w-4 h-4" /> Connect</>}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    handleTestConnection(liveServer);
                    setDrawerServer(null);
                  }}
                >
                  <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} /> Test Connection
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setSelectedServer(liveServer);
                    setIsEditing(true);
                    setDialogOpen(true);
                    setDrawerServer(null);
                  }}
                >
                  <EditIcon className="w-4 h-4" /> Edit Server
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-error border-error/30 hover:bg-error/10"
                  onClick={() => {
                    handleDeleteServer(liveServer.id);
                    setDrawerServer(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Remove Server
                </Button>
              </div>
            </div>
          );
        })()}
      </DetailDrawer>

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
