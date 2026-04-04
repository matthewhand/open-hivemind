import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../../../components/DaisyUI/Modal';
import Accordion from '../../../components/DaisyUI/Accordion';
import { LoadingSpinner } from '../../../components/DaisyUI/Loading';
import { Badge } from '../../../components/DaisyUI/Badge';
import SimpleTable from '../../../components/DaisyUI/SimpleTable';
import type { ToolExecutionRecord } from '../types';

interface ExecutionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  history: ToolExecutionRecord[];
}

const ExecutionHistoryModal: React.FC<ExecutionHistoryModalProps> = ({ isOpen, onClose, loading, history }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tool Execution History" size="xl">
      <div className="space-y-4">
        {loading ? <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div> : history.length === 0 ? <div className="text-center py-8"><p className="text-base-content/70">No execution history found</p></div> : (
          <div className="overflow-x-auto">
            <SimpleTable zebra className="w-full">
              <thead><tr><th>Status</th><th>Tool</th><th>Server</th><th>Duration</th><th>Executed At</th><th>Details</th></tr></thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{r.status === 'success' ? <div className="flex items-center gap-1 text-success"><CheckCircleIcon className="w-5 h-5" /><span>Success</span></div> : <div className="flex items-center gap-1 text-error"><XCircleIcon className="w-5 h-5" /><span>Error</span></div>}</td>
                    <td><div className="font-medium">{r.toolName}</div></td>
                    <td><Badge size="sm" style="outline">{r.serverName}</Badge></td>
                    <td>{r.duration}ms</td>
                    <td><div className="text-sm">{new Date(r.executedAt).toLocaleString()}</div></td>
                    <td>
                      <Accordion
                        items={[{
                          id: `details-${r.id}`,
                          title: 'View',
                          content: (
                            <div className="space-y-2 pt-2 text-xs">
                              <div><strong>Arguments:</strong><pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(r.arguments, null, 2)}</pre></div>
                              {r.status === 'success'
                                ? <div><strong>Result:</strong><pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(r.result, null, 2)}</pre></div>
                                : <div><strong>Error:</strong><div className="bg-error/10 text-error p-2 rounded mt-1">{r.error}</div></div>
                              }
                            </div>
                          ),
                        }]}
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </SimpleTable>
          </div>
        )}
        <div className="text-xs text-base-content/60 text-center pt-4">Showing last 50 executions (retention: 1000 max)</div>
      </div>
    </Modal>
  );
};

export default ExecutionHistoryModal;
