import React, { useState } from 'react';
import Card from './DaisyUI/Card';
import Button from './DaisyUI/Button';
import Modal from './DaisyUI/Modal';
import Input from './DaisyUI/Input';
import Toggle from './DaisyUI/Toggle';
import Kbd from './DaisyUI/Kbd';
import { Loading, LoadingSpinner } from './DaisyUI/Loading';
import {
  Keyboard,
  RefreshCw,
  X as XMarkIcon,
  Download as ArrowDownTrayIcon,
  FlaskConical as BeakerIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as ExclamationCircleIcon,
  Info as InformationCircleIcon,
} from 'lucide-react';
import { apiService } from '../services/api';

interface QuickActionsProps {
  onRefresh?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info',
  });
  const [exportDialog, setExportDialog] = useState(false);
  const [exportFilename, setExportFilename] = useState('config-export');
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Check demo mode status on mount
  React.useEffect(() => {
    apiService.get('/api/demo/status')
      .then((data: any) => setDemoMode(data?.data?.active === true || data?.data?.isDemoMode === true))
      .catch(() => {});
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type });
    // Auto-hide after 6 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const handleRefreshDashboard = async () => {
    setLoading('refresh');
    try {
      // Refresh the dashboard data by calling the existing API endpoints
      await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);

      showToast('Dashboard refreshed successfully', 'success');

      // Call the onRefresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to refresh dashboard',
        'error',
      );
    } finally {
      setLoading(null);
    }
  };

  const handleClearCache = async () => {
    setLoading('clear');
    try {
      // Call the clear cache API endpoint
      const response = await apiService.clearCache();
      showToast(response.message || 'Cache cleared successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to clear cache',
        'error',
      );
    } finally {
      setLoading(null);
    }
  };

  const handleExportConfig = async () => {
    setLoading('export');
    try {
      const blob = await apiService.exportConfig(includeSensitive);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${exportFilename}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportDialog(false);
      setIncludeSensitive(false);
      showToast('Configuration exported successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to export configuration',
        'error',
      );
    } finally {
      setLoading(null);
    }
  };

  const handleToggleDemoMode = async () => {
    setLoading('demo');
    try {
      const response: any = await apiService.post('/api/demo/toggle', {});
      const enabled = response?.data?.enabled;
      setDemoMode(enabled);
      showToast(enabled ? 'Demo mode enabled — fake data is now active' : 'Demo mode disabled', 'success');
      if (onRefresh) onRefresh();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to toggle demo mode',
        'error',
      );
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (action: string) => loading === action;

  const getToastIcon = () => {
    switch (toast.type) {
    case 'success': return <CheckCircleIcon className="w-6 h-6" />;
    case 'error': return <ExclamationCircleIcon className="w-6 h-6" />;
    default: return <InformationCircleIcon className="w-6 h-6" />;
    }
  };

  const getToastClass = () => {
    switch (toast.type) {
    case 'success': return 'alert-success';
    case 'error': return 'alert-error';
    default: return 'alert-info';
    }
  };

  return (
    <>
      <div className="w-full flex flex-wrap items-center justify-between gap-4 py-2 px-4 bg-base-100 border border-base-300 rounded-xl shadow-sm mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-xs uppercase tracking-widest text-base-content/50 select-none">Quick Actions</span>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRefreshDashboard}
              disabled={isLoading('refresh')}
              className="flex items-center gap-2"
            >
              {isLoading('refresh') ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearCache}
              disabled={isLoading('clear')}
              className="flex items-center gap-2"
            >
              {isLoading('clear') ? (
                <LoadingSpinner size="sm" />
              ) : (
                <XMarkIcon className="w-4 h-4" />
              )}
              Clear Cache
            </Button>

            <Button
              variant="accent"
              size="sm"
              onClick={() => setExportDialog(true)}
              disabled={isLoading('export')}
              className="flex items-center gap-2"
            >
              {isLoading('export') ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ArrowDownTrayIcon className="w-4 h-4" />
              )}
              Export
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={demoMode ? 'warning' : 'ghost'}
            size="sm"
            onClick={handleToggleDemoMode}
            disabled={isLoading('demo')}
            className="flex items-center gap-2"
          >
            {isLoading('demo') ? (
              <LoadingSpinner size="sm" />
            ) : (
              <BeakerIcon className="w-4 h-4" />
            )}
            {demoMode ? 'Demo Mode ON' : 'Demo Mode'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Trigger the keyboard shortcuts overlay via the same shortcut
              document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true }));
            }}
            className="flex items-center gap-2"
          >
            <Keyboard className="w-4 h-4" />
            Shortcuts <Kbd size="xs">?</Kbd>
          </Button>
        </div>
      </div>

      {/* Export Configuration Modal */}
      <Modal
        isOpen={exportDialog}
        onClose={() => { setExportDialog(false); setIncludeSensitive(false); }}
        title="Export Configuration"
        actions={[
          { label: 'Cancel', onClick: () => { setExportDialog(false); setIncludeSensitive(false); }, variant: 'ghost' },
          { label: 'Export', onClick: handleExportConfig, variant: 'primary', disabled: !exportFilename.trim() || isLoading('export'), loading: isLoading('export') },
        ]}
      >
        <div className="py-4 space-y-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Filename</span>
            </label>
            <Input
              autoFocus
              placeholder="Filename"
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
            />
            <label className="label">
              <span className="label-text-alt">File will be saved as .json</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <div>
                <span className="label-text font-medium">Include Sensitive Values</span>
                <p className="text-xs text-base-content/60">
                  Export API keys, tokens, and secrets in plaintext. By default, these are redacted.
                </p>
              </div>
              <Toggle
                color="warning"
                checked={includeSensitive}
                onChange={(e) => setIncludeSensitive(e.target.checked)}
              />
            </label>
          </div>
        </div>
      </Modal>

      {/* Toast notification */}
      {toast.show && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${getToastClass()}`}>
            {getToastIcon()}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickActions;