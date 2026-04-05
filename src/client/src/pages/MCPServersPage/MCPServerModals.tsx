import React from 'react';
import { CheckCircle, AlertCircle, Wrench, PackageX } from 'lucide-react';
import Button from '../../components/DaisyUI/Button';
import CodeBlock from '../../components/DaisyUI/CodeBlock';
import EmptyState from '../../components/DaisyUI/EmptyState';
import Modal, { ConfirmModal } from '../../components/DaisyUI/Modal';
import Accordion from '../../components/DaisyUI/Accordion';
import ModalForm from '../../components/DaisyUI/ModalForm';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';
import Input from '../../components/DaisyUI/Input';
import Textarea from '../../components/DaisyUI/Textarea';

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
        actions={[
          { label: 'Close', onClick: () => setToolsModalOpen(false), variant: 'primary' },
        ]}
      >
        <div className="overflow-y-auto max-h-[60vh]">
          {viewingTools.length === 0 ? (
            <EmptyState
              icon={PackageX}
              title="No tools found for this server."
              description="This MCP server does not provide any tools."
              variant="noData"
            />
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
                    <Accordion
                      items={[{
                        id: `schema-${idx}`,
                        title: 'Input Schema',
                        content: (
                          <CodeBlock>
                            {JSON.stringify(tool.inputSchema, null, 2)}
                          </CodeBlock>
                        ),
                      }]}
                      size="sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
        actions={[
          { label: 'Cancel', onClick: () => setDialogOpen(false), variant: 'ghost' },
          { label: 'Test', onClick: handleTestConnection, variant: 'primary', disabled: isTesting || !selectedServer?.url, loading: isTesting },
          { label: 'Save', onClick: handleSaveServer, variant: 'primary' },
        ]}
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
            <Input
              id="server-name"
              type="text"
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
            <Input
              id="server-url"
              type="text"
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
            <Input
              id="server-api-key"
              type="password"
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
            <Textarea
              id="server-description"
              className="h-24"
              value={selectedServer?.description || ''}
              onChange={(e) =>
                setSelectedServer((prev) =>
                  prev ? { ...prev, description: e.target.value } : null
                )
              }
            />
          </div>
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
