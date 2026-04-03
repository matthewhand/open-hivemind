import React from 'react';
import { CheckCircle, AlertCircle, Wrench } from 'lucide-react';
import Button from '../../components/DaisyUI/Button';
import Modal, { ConfirmModal } from '../../components/DaisyUI/Modal';
import ModalForm from '../../components/DaisyUI/ModalForm';

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

interface Tool {
  name: string;
  description: string;
  inputSchema?: any;
}

interface MCPServerModalsProps {
  toolsModalOpen: boolean;
  setToolsModalOpen: (open: boolean) => void;
  viewingServerName: string;
  viewingTools: Tool[];
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  isEditing: boolean;
  alert: { type: 'success' | 'error'; message: string } | null;
  selectedServer: MCPServer | null;
  setSelectedServer: React.Dispatch<React.SetStateAction<MCPServer | null>>;
  handleTestConnection: () => void;
  isTesting: boolean;
  handleSaveServer: () => void;
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  setConfirmModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
    }>
  >;
}

export const MCPServerModals: React.FC<MCPServerModalsProps> = ({
  toolsModalOpen,
  setToolsModalOpen,
  viewingServerName,
  viewingTools,
  dialogOpen,
  setDialogOpen,
  isEditing,
  alert,
  selectedServer,
  setSelectedServer,
  handleTestConnection,
  isTesting,
  handleSaveServer,
  confirmModal,
  setConfirmModal,
}) => {
  return (
    <>
      <Modal
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        title={`Tools provided by ${viewingServerName}`}
      >
        <div className="overflow-y-auto max-h-[60vh]">
          {viewingTools.length === 0 ? (
            <div className="text-center py-8 opacity-50">No tools found for this server.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {viewingTools.map((tool, idx) => (
                <div key={idx} className="border border-base-200 rounded-lg p-4 bg-base-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-lg">{tool.name}</h3>
                  </div>
                  <p className="text-sm text-base-content/80 mb-2">
                    {tool.description || 'No description provided.'}
                  </p>
                  {tool.inputSchema && (
                    <div className="collapse collapse-arrow bg-base-200">
                      <input type="checkbox" aria-label={`Toggle input schema for ${tool.name}`} />
                      <div className="collapse-title text-xs font-medium uppercase opacity-50">
                        Input Schema
                      </div>
                      <div className="collapse-content">
                        <pre className="text-xs bg-base-300 p-2 rounded overflow-x-auto">
                          {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-action">
          <Button variant="primary" onClick={() => setToolsModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
      >
        <div className="space-y-4">
          {alert && (
            <div
              className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'} mb-4 flex flex-row items-center gap-2`}
            >
              {alert.type === 'success' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
              <span>{alert.message}</span>
            </div>
          )}

          <div className="form-control w-full">
            <label className="label" htmlFor="server-name">
              <span className="label-text">Server Name *</span>
            </label>
            <input
              id="server-name"
              type="text"
              className="input input-bordered w-full"
              value={selectedServer?.name || ''}
              onChange={(e) =>
                setSelectedServer((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              required
            />
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="server-url">
              <span className="label-text">Server URL *</span>
            </label>
            <input
              id="server-url"
              type="text"
              className="input input-bordered w-full"
              value={selectedServer?.url || ''}
              onChange={(e) =>
                setSelectedServer((prev) => (prev ? { ...prev, url: e.target.value } : null))
              }
              required
              placeholder="mcp://server-host:port"
            />
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="server-api-key">
              <span className="label-text">API Key (Optional)</span>
            </label>
            <input
              id="server-api-key"
              type="password"
              className="input input-bordered w-full"
              value={selectedServer?.apiKey || ''}
              onChange={(e) =>
                setSelectedServer((prev) => (prev ? { ...prev, apiKey: e.target.value } : null))
              }
              placeholder="Leave blank if not required or unchanged"
            />
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="server-description">
              <span className="label-text">Description</span>
            </label>
            <textarea
              id="server-description"
              className="textarea textarea-bordered h-24"
              value={selectedServer?.description || ''}
              onChange={(e) =>
                setSelectedServer((prev) =>
                  prev ? { ...prev, description: e.target.value } : null
                )
              }
            />
          </div>
        </div>

        <div className="modal-action">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            buttonStyle="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !selectedServer?.url}
          >
            {isTesting ? (
              <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
            ) : (
              'Test'
            )}
          </Button>
          <Button variant="primary" onClick={handleSaveServer}>
            Save
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};
