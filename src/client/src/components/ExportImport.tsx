import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Modal,
  Alert,
  Loading,
  Badge
} from './DaisyUI';
import {
  ArrowDownTrayIcon as DownloadIcon,
  ArrowUpTrayIcon as UploadIcon,
  DocumentDuplicateIcon as FileIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon as WarningIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface ExportImportProps {
  onRefresh?: () => void;
}

const ExportImport: React.FC<ExportImportProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    skipExisting: true,
    backupBeforeImport: true
  });

  const handleExport = async (type: 'full' | 'config' | 'data') => {
    setLoading(true);
    setError(null);
    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create dummy blob
      const data = JSON.stringify({ type, timestamp: new Date().toISOString(), content: 'demo-export' }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `open-hivemind-${type}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Successfully exported ${type} configuration`);
    } catch (err) {
      setError('Failed to generate export');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    try {
      // Simulate import
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess('Successfully imported configuration');
      setShowImportModal(false);
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError('Failed to import configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Export & Import</h2>
          <p className="text-base-content/70">Manage system data backup and restoration</p>
        </div>
      </div>

      {error && <Alert status="error" message={error} />}
      {success && <Alert status="success" message={success} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <Card className="bg-base-100 shadow-xl h-full">
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <DownloadIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Export Data</h3>
                <p className="text-sm opacity-70">Download system configuration</p>
              </div>
            </div>

            <div className="space-y-4 flex-grow">
              <div className="border rounded-lg p-4 hover:bg-base-200 transition-colors cursor-pointer" onClick={() => handleExport('full')}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">Full Backup</h4>
                    <p className="text-sm opacity-70">Complete system snapshot including all data</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <DownloadIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 hover:bg-base-200 transition-colors cursor-pointer" onClick={() => handleExport('config')}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">Configuration Only</h4>
                    <p className="text-sm opacity-70">Settings, environment variables, and preferences</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <DownloadIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 hover:bg-base-200 transition-colors cursor-pointer" onClick={() => handleExport('data')}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">User Data Only</h4>
                    <p className="text-sm opacity-70">Bots, agents, and activity logs</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <DownloadIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Import Section */}
        <Card className="bg-base-100 shadow-xl h-full">
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-secondary/10 rounded-lg text-secondary">
                <UploadIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Import Data</h3>
                <p className="text-sm opacity-70">Restore system from backup</p>
              </div>
            </div>

            <div className="flex-grow flex flex-col justify-center items-center border-2 border-dashed border-base-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => setShowImportModal(true)}>
              <UploadIcon className="w-12 h-12 text-base-content/30 mb-4" />
              <h4 className="font-bold mb-2">Click to Upload Backup File</h4>
              <p className="text-sm opacity-70 max-w-xs">
                Select a previously exported JSON file to restore system state
              </p>
              <Button variant="primary" className="mt-6" onClick={(e) => { e.stopPropagation(); setShowImportModal(true); }}>
                Select File
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Configuration"
      >
        <div className="space-y-6">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Select Backup File</span>
            </label>
            <input
              type="file"
              className="file-input file-input-bordered w-full"
              accept=".json"
              onChange={handleFileSelect}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
              <FileIcon className="w-5 h-5" />
              <span className="text-sm font-mono">{selectedFile.name}</span>
              <Badge variant="neutral" size="sm" className="ml-auto">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-bold text-sm">Import Options</h4>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={importOptions.skipExisting}
                  onChange={(e) => setImportOptions({ ...importOptions, skipExisting: e.target.checked })}
                />
                <span className="label-text">Skip existing items (don't overwrite)</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={importOptions.backupBeforeImport}
                  onChange={(e) => setImportOptions({ ...importOptions, backupBeforeImport: e.target.checked })}
                />
                <span className="label-text">Create backup before importing</span>
              </label>
            </div>
          </div>

          <div className="alert alert-warning text-sm">
            <WarningIcon className="w-5 h-5" />
            <span>Warning: Importing data may modify your current system configuration.</span>
          </div>
        </div>

        <div className="modal-action">
          <Button variant="ghost" onClick={() => setShowImportModal(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!selectedFile || loading}
          >
            {loading ? <Loading.Spinner size="sm" className="mr-2" /> : <UploadIcon className="w-4 h-4 mr-2" />}
            {loading ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ExportImport;