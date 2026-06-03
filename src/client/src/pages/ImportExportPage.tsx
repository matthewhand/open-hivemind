import React, { useState, useCallback } from 'react';
import { Download, Upload, FileJson, AlertCircle, CheckCircle, X, Settings, Lock, Unlock, Package } from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  PageHeader,
  FileUpload,
  Modal,
  Alert,
  LoadingSpinner,
  ProgressBar,
  Select,
  Input
} from '../components/DaisyUI';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { apiService } from '../services/api';
import { useApiQuery } from '../hooks/useApiQuery';

interface ExportOptions {
  configIds: number[];
  format: 'json' | 'yaml' | 'csv';
  includeVersions: boolean;
  includeAuditLogs: boolean;
  includeTemplates: boolean;
  compress: boolean;
  encrypt: boolean;
  encryptionKey: string;
  fileName: string;
}

interface ImportOptions {
  file: File | null;
  overwrite: boolean;
  dryRun: boolean;
}

interface ImportResult {
  success: boolean;
  message: string;
  details?: any;
}

const ImportExportPage: React.FC = () => {
  const { addSuccessToast } = useSuccessToast();
  const { addErrorToast } = useErrorToast();

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    configIds: [],
    format: 'json',
    includeVersions: true,
    includeAuditLogs: true,
    includeTemplates: true,
    compress: true,
    encrypt: false,
    encryptionKey: '',
    fileName: '',
  });

  const [importOptions, setImportOptions] = useState<ImportOptions>({
    file: null,
    overwrite: false,
    dryRun: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: botsData, isLoading: isLoadingBots } = useApiQuery<{ bots: any[] }>('/api/admin/bots');

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await apiService.post('/api/admin/export', exportOptions);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportOptions.fileName || `hivemind-export-${new Date().toISOString()}.json`;
      link.click();
      addSuccessToast('Configuration exported successfully');
    } catch (error: any) {
      addErrorToast(error.message || 'Failed to export configuration');
    } finally {
      setIsExporting(false);
    }
  }, [exportOptions, addSuccessToast, addErrorToast]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      addErrorToast('Please select a file to import');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('overwrite', String(importOptions.overwrite));
    formData.append('dryRun', String(importOptions.dryRun));

    try {
      const response = await apiService.post('/api/admin/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResult({
        success: true,
        message: 'Import completed successfully',
        details: response.data,
      });
      addSuccessToast('Configuration imported successfully');
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message || 'Failed to import configuration',
        details: error.response?.data,
      });
      addErrorToast(error.message || 'Failed to import configuration');
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, importOptions, addSuccessToast, addErrorToast]);

  const toggleBotSelection = (botId: number) => {
    setExportOptions(prev => ({
      ...prev,
      configIds: prev.configIds.includes(botId)
        ? prev.configIds.filter(id => id !== botId)
        : [...prev.configIds, botId],
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <PageHeader
        title="Import / Export"
        description="Manage your system configuration, bot profiles, and templates via backup files."
        icon={<Settings className="w-8 h-8" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Export Card */}
        <Card className="shadow-xl bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4 flex items-center gap-2">
              <Download className="w-6 h-6 text-primary" />
              Export Configuration
            </h2>
            <p className="text-base-content/70 mb-6">
              Create a backup of your current system state, including all bot configurations and templates.
            </p>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Export Format</span>
                </label>
                <Select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as any })}
                  options={[
                    { value: 'json', label: 'JSON (Recommended)' },
                    { value: 'yaml', label: 'YAML' },
                    { value: 'csv', label: 'CSV (Data Only)' },
                  ]}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">File Name (Optional)</span>
                </label>
                <Input
                  placeholder="hivemind-backup.json"
                  value={exportOptions.fileName}
                  onChange={(e) => setExportOptions({ ...exportOptions, fileName: e.target.value })}
                />
              </div>

              <div className="divider">Include Resources</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Checkbox
                  label="Version History"
                  checked={exportOptions.includeVersions}
                  onChange={(checked) => setExportOptions({ ...exportOptions, includeVersions: checked })}
                />
                <Checkbox
                  label="Audit Logs"
                  checked={exportOptions.includeAuditLogs}
                  onChange={(checked) => setExportOptions({ ...exportOptions, includeAuditLogs: checked })}
                />
                <Checkbox
                  label="Templates"
                  checked={exportOptions.includeTemplates}
                  onChange={(checked) => setExportOptions({ ...exportOptions, includeTemplates: checked })}
                />
                <Checkbox
                  label="Compress (GZip)"
                  checked={exportOptions.compress}
                  onChange={(checked) => setExportOptions({ ...exportOptions, compress: checked })}
                />
              </div>

              <div className="divider">Security</div>

              <Checkbox
                label="Encrypt Export File"
                checked={exportOptions.encrypt}
                onChange={(checked) => setExportOptions({ ...exportOptions, encrypt: checked })}
              />

              {exportOptions.encrypt && (
                <div className="form-control animate-in fade-in slide-in-from-top-2">
                  <label className="label">
                    <span className="label-text font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Encryption Key
                    </span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Strong passphrase..."
                    value={exportOptions.encryptionKey}
                    onChange={(e) => setExportOptions({ ...exportOptions, encryptionKey: e.target.value })}
                  />
                  <label className="label">
                    <span className="label-text-alt text-warning">Warning: You will need this key to import this file.</span>
                  </label>
                </div>
              )}
            </div>

            <div className="card-actions justify-end mt-8">
              <Button
                variant="primary"
                onClick={handleExport}
                loading={isExporting}
                className="w-full md:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Export
              </Button>
            </div>
          </div>
        </Card>

        {/* Import Card */}
        <Card className="shadow-xl bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4 flex items-center gap-2">
              <Upload className="w-6 h-6 text-secondary" />
              Import Configuration
            </h2>
            <p className="text-base-content/70 mb-6">
              Restore configuration from a previously exported backup file.
            </p>

            <div className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Select Backup File</span>
                </label>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  accept=".json,.yaml,.csv,.zip"
                  placeholder="Drop export file here or click to browse"
                />
              </div>

              <div className="divider">Import Settings</div>

              <div className="space-y-3">
                <Checkbox
                  label="Dry Run (Validate Only)"
                  checked={importOptions.dryRun}
                  onChange={(checked) => setImportOptions({ ...importOptions, dryRun: checked })}
                />
                <Checkbox
                  label="Overwrite Existing Records"
                  checked={importOptions.overwrite}
                  onChange={(checked) => setImportOptions({ ...importOptions, overwrite: checked })}
                />
              </div>

              {importResult && (
                <Alert
                  variant={importResult.success ? 'success' : 'error'}
                  icon={importResult.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  className="mt-4"
                >
                  <div>
                    <h3 className="font-bold">{importResult.message}</h3>
                    {importResult.details && (
                      <div className="text-xs mt-2 font-mono max-h-32 overflow-auto p-2 bg-black/10 rounded">
                        {JSON.stringify(importResult.details, null, 2)}
                      </div>
                    )}
                  </div>
                </Alert>
              )}
            </div>

            <div className="card-actions justify-end mt-8">
              <Button
                variant="secondary"
                onClick={handleImport}
                loading={isImporting}
                disabled={!selectedFile}
                className="w-full md:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                Start Import
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-12">
        <Card className="bg-base-200/50 border border-base-300">
          <div className="card-body py-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <Package className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold">Migration Tools</h3>
                <p className="text-base-content/70">
                  Moving from another instance or migrating from legacy config? 
                  Our import tool handles automatic field mapping and validation.
                </p>
              </div>
              <Button variant="ghost" className="btn-sm">
                View Documentation
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ImportExportPage;
