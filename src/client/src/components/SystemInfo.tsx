/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * @fileoverview System Information Component
 *
 * Displays detailed system information including uptime, environment,
 * logs, and system control options.
 *
 * @version 1.0.0
 * @author Open-Hivemind Team
 * @since 2025-09-27
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Loading,
  Tooltip,
  ConfirmModal,
} from './DaisyUI';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  PowerIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../store/hooks';

const SystemInfo: React.FC = () => {
  const dashboard = useAppSelector(state => state.dashboard);
  const {
    systemStatus,
    lastUpdated,
    isAutoRefresh,
    refreshInterval,
  } = dashboard;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'restart' | 'shutdown' | null;
    message: string;
  }>({
    open: false,
    action: null,
    message: '',
  });

  const [logs, setLogs] = useState<string[]>([
    '[2025-09-27 07:00:00] System started successfully',
    '[2025-09-27 07:01:00] Bot instance #1 connected',
    '[2025-09-27 07:02:00] Performance metrics updated',
    '[2025-09-27 07:03:00] Configuration reloaded',
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const uptimeSeconds = systemStatus.uptime ?? 0;
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeDisplay = `${uptimeHours}h ${uptimeMinutes}m`;

  const handleSystemAction = async (action: 'restart' | 'shutdown') => {
    setIsLoading(true);
    try {
      // Call the system action API
      const response = await fetch(`/api/system/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} system`);
      }

      const data = await response.json();
      console.log(`System ${action} initiated:`, data);
      setLogs(prev => [...prev, `[${new Date().toISOString()}] System ${action} initiated: ${data.message || 'Success'}`]);
    } catch (error) {
      console.error(`Failed to ${action} system:`, error);
      setLogs(prev => [...prev, `[${new Date().toISOString()}] Failed to ${action}: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
      setConfirmDialog({ open: false, action: null, message: '' });
    }
  };

  const handleDownloadLogs = () => {
    const logContent = logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const openConfirmDialog = (action: 'restart' | 'shutdown') => {
    const message = action === 'restart'
      ? 'Are you sure you want to restart the system? This will temporarily disconnect all bots.'
      : 'Are you sure you want to shut down the system? This will stop all services.';
    setConfirmDialog({ open: true, action, message });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, action: null, message: '' });
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        System Information
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Status Card */}
        <Card>
          <Card.Body>
            <Card.Title>System Status</Card.Title>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-sm text-base-content/70">Last Updated</p>
                <p className="font-medium">{new Date(lastUpdated).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Auto Refresh</p>
                <p className="font-medium">{isAutoRefresh ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Refresh Interval</p>
                <p className="font-medium">{(refreshInterval / 1000).toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Environment</p>
                <p className="font-medium">{systemStatus.environment}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Uptime</p>
                <p className="font-medium">{uptimeDisplay}</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* System Controls Card */}
        <Card>
          <Card.Body>
            <Card.Title>System Controls</Card.Title>
            <div className="flex gap-4 flex-wrap mt-2">
              <Tooltip content="Restart System">
                <Button
                  variant="warning"
                  startIcon={<ArrowPathIcon className="w-5 h-5" />}
                  onClick={() => openConfirmDialog('restart')}
                  disabled={isLoading}
                >
                  Restart
                </Button>
              </Tooltip>
              <Tooltip content="Shutdown System">
                <Button
                  variant="error"
                  startIcon={<PowerIcon className="w-5 h-5" />}
                  onClick={() => openConfirmDialog('shutdown')}
                  disabled={isLoading}
                >
                  Shutdown
                </Button>
              </Tooltip>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 mt-4 text-base-content/70">
                <span className="loading loading-spinner loading-sm"></span>
                <span className="text-sm">Processing system action...</span>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* System Logs Card */}
        <div className="col-span-1 md:col-span-2">
          <Card>
            <Card.Body>
              <div className="flex justify-between items-center mb-4">
                <Card.Title>System Logs</Card.Title>
                <div className="flex gap-2">
                  <Tooltip content="Download Logs">
                    <Button
                      size="sm"
                      variant="ghost"
                      shape="circle"
                      onClick={handleDownloadLogs}
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Clear Logs">
                    <Button
                      size="sm"
                      variant="ghost"
                      shape="circle"
                      onClick={handleClearLogs}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
              <div className="bg-base-300 p-4 rounded-lg font-mono text-sm h-96 overflow-auto text-base-content">
                {logs.length === 0 ? (
                  <span className="text-base-content/50">No logs available</span>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1 whitespace-pre-wrap">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.open}
        onClose={closeConfirmDialog}
        onConfirm={() => confirmDialog.action && handleSystemAction(confirmDialog.action)}
        title="Confirm System Action"
        message={confirmDialog.message}
        confirmText={confirmDialog.action === 'shutdown' ? 'Shutdown' : 'Restart'}
        confirmVariant={confirmDialog.action === 'shutdown' ? 'error' : 'warning'}
        loading={isLoading}
      />
    </div>
  );
};

export default SystemInfo;