import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
  Modal,
  Loading
} from './DaisyUI';
import {
  ArrowPathIcon as RefreshIcon,
  ClockIcon as HistoryIcon,
  ArrowUturnLeftIcon as UndoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon as WarningIcon,
  ExclamationCircleIcon as ErrorIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import type { ConfigurationChange } from '../../../src/config/HotReloadManager';

interface HotReloadStatus {
  isActive: boolean;
  changeHistoryCount: number;
  availableRollbacksCount: number;
  lastChange: ConfigurationChange | null;
}

const HotReloadManager: React.FC = () => {
  const [status, setStatus] = useState<HotReloadStatus | null>(null);
  const [history, setHistory] = useState<ConfigurationChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ConfigurationChange | null>(null);

  const loadHotReloadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock data for now as API might not be ready
      const mockStatus: HotReloadStatus = {
        isActive: true,
        changeHistoryCount: 5,
        availableRollbacksCount: 5,
        lastChange: {
          id: 'change-123',
          timestamp: new Date().toISOString(),
          type: 'modification',
          path: 'config/settings.json',
          description: 'Updated system settings',
          diff: { old: 'value', new: 'newValue' }
        }
      };

      const mockHistory: ConfigurationChange[] = Array(5).fill(null).map((_, i) => ({
        id: `change-${i}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        type: i % 2 === 0 ? 'modification' : 'addition',
        path: `config/module-${i}.json`,
        description: `Configuration update ${i}`,
        diff: {}
      }));

      setStatus(mockStatus);
      setHistory(mockHistory);
    } catch (err) {
      setError('Failed to load hot reload status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotReloadData();
  }, []);

  const handleRollback = async (changeId: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API
      setSuccessMessage(`Successfully rolled back change ${changeId}`);
      loadHotReloadData();
      setShowHistoryDialog(false);
    } catch (err) {
      setError('Failed to rollback change');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'addition': return 'success';
      case 'removal': return 'error';
      case 'modification': return 'warning';
      default: return 'neutral';
    }
  };

  if (loading && !status) {
    return <Loading.Spinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FireIcon className="w-8 h-8 text-orange-500" />
            Hot Reload Manager
          </h2>
          <p className="text-base-content/70">Manage configuration hot reloads and rollbacks</p>
        </div>
        <Button variant="ghost" onClick={loadHotReloadData} disabled={loading}>
          <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && <Alert status="error" message={error} />}
      {successMessage && <Alert status="success" message={successMessage} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-base-100 shadow-xl">
          <div className="p-6 text-center">
            <div className={`radial-progress text-${status?.isActive ? 'success' : 'error'} mx-auto mb-4`} style={{ "--value": 100 } as any}>
              {status?.isActive ? <CheckCircleIcon className="w-12 h-12" /> : <ErrorIcon className="w-12 h-12" />}
            </div>
            <h3 className="text-lg font-bold">System Status</h3>
            <p className="text-sm opacity-70">{status?.isActive ? 'Hot Reload Active' : 'Hot Reload Inactive'}</p>
          </div>
        </Card>

        <Card className="bg-base-100 shadow-xl">
          <div className="p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{status?.changeHistoryCount || 0}</div>
            <h3 className="text-lg font-bold">Total Changes</h3>
            <p className="text-sm opacity-70">Recorded in history</p>
          </div>
        </Card>

        <Card className="bg-base-100 shadow-xl">
          <div className="p-6 text-center">
            <div className="text-4xl font-bold text-secondary mb-2">{status?.availableRollbacksCount || 0}</div>
            <h3 className="text-lg font-bold">Rollback Points</h3>
            <p className="text-sm opacity-70">Available snapshots</p>
          </div>
        </Card>
      </div>

      <Card className="bg-base-100 shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HistoryIcon className="w-5 h-5" />
              Recent Changes
            </h3>
            <Button variant="outline" size="sm" onClick={() => setShowHistoryDialog(true)}>
              View All History
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Path</th>
                  <th>Description</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map((change) => (
                  <tr key={change.id}>
                    <td>
                      <Badge variant={getChangeTypeColor(change.type) as any}>
                        {change.type}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs">{change.path}</td>
                    <td>{change.description}</td>
                    <td className="text-sm opacity-70">{formatTimestamp(change.timestamp)}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRollback(change.id)}
                        title="Rollback to this version"
                      >
                        <UndoIcon className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 opacity-70">
                      No changes recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
        title="Configuration Change History"
      >
        <div className="space-y-4">
          {history.map((change) => (
            <div key={change.id} className="border rounded-lg p-4 hover:bg-base-200 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getChangeTypeColor(change.type) as any}>
                    {change.type}
                  </Badge>
                  <span className="font-bold text-sm">{change.path}</span>
                </div>
                <span className="text-xs opacity-70">{formatTimestamp(change.timestamp)}</span>
              </div>
              <p className="text-sm mb-3">{change.description}</p>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedChange(change)}
                >
                  View Diff
                </Button>
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => handleRollback(change.id)}
                >
                  <UndoIcon className="w-4 h-4 mr-1" />
                  Rollback
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-action">
          <Button onClick={() => setShowHistoryDialog(false)}>Close</Button>
        </div>
      </Modal>

      {selectedChange && (
        <Modal
          isOpen={!!selectedChange}
          onClose={() => setSelectedChange(null)}
          title={`Change Details: ${selectedChange.id}`}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-bold mb-1">Path</h4>
              <code className="bg-base-300 p-1 rounded block">{selectedChange.path}</code>
            </div>
            <div>
              <h4 className="font-bold mb-1">Description</h4>
              <p>{selectedChange.description}</p>
            </div>
            {selectedChange.diff && (
              <div>
                <h4 className="font-bold mb-1">Diff</h4>
                <pre className="bg-base-300 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedChange.diff, null, 2)}
                </pre>
              </div>
            )}
          </div>
          <div className="modal-action">
            <Button onClick={() => setSelectedChange(null)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HotReloadManager;