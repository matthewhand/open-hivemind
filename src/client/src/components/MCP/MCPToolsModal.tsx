import React from 'react';
import {
  Wrench,
  Search,
  Code,
  X
} from 'lucide-react';
import { Modal, EmptyState } from '../DaisyUI';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface MCPToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverName: string;
  tools: Tool[];
}

const MCPToolsModal: React.FC<MCPToolsModalProps> = ({
  isOpen,
  onClose,
  serverName,
  tools
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tools: ${serverName}`}
      size="lg"
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {tools.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No tools available"
            description="This server does not expose any tools."
          />
        ) : (
          <div className="grid gap-4 py-2">
            {tools.map((tool, idx) => (
              <div key={idx} className="card bg-base-100 border border-base-200 shadow-sm">
                <div className="card-body p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-base-content/70 mb-3">
                        {tool.description || 'No description provided.'}
                      </p>

                      {tool.inputSchema && (
                        <div className="collapse collapse-arrow bg-base-200 rounded-lg border border-base-300">
                          <input type="checkbox" className="peer" />
                          <div className="collapse-title text-xs font-medium uppercase opacity-70 py-2 min-h-8 flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            View Input Schema
                          </div>
                          <div className="collapse-content pb-2">
                            <pre className="text-xs font-mono bg-base-300 p-3 rounded overflow-x-auto mt-2">
                              {JSON.stringify(tool.inputSchema, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="modal-action">
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

export default MCPToolsModal;
