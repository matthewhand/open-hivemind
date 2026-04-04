import React, { useState, useCallback } from 'react';
import { Download, Upload, FileJson, AlertCircle, CheckCircle, X, Settings, Lock, Unlock, Package } from 'lucide-react';
import Button from '../components/DaisyUI/Button';
import Checkbox from '../components/DaisyUI/Checkbox';
import PageHeader from '../components/DaisyUI/PageHeader';
import FileUpload from '../components/DaisyUI/FileUpload';
import Modal from '../components/DaisyUI/Modal';
import { Alert } from '../components/DaisyUI/Alert';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import ProgressBar from '../components/DaisyUI/ProgressBar';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/DaisyUI/Card';

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
  overwrite: boolean;
  validateOnly: boolean;
  skipValidation: boolean;
  decryptionKey: string;
}

const ImportExportPage: React.FC = () => {
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
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
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    overwrite: false,
    validateOnly: false,
    skipValidation: false,
    decryptionKey: '',
  });
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Fetch available configurations
  const { data: botsData, isLoading: botsLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: () => apiService.getBots(),
    staleTime: 30_000,
  });
  const bots = botsData || [];

  const handleExport = useCallback(async () => {
    if (exportOptions.configIds.length === 0) {
      showError('Please select at least one configuration to export');
      return;
    }

    if (exportOptions.encrypt && !exportOptions.encryptionKey) {
      showError('Please provide an encryption key');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await apiService.exportConfigurations({
        configIds: exportOptions.configIds,
        format: exportOptions.format,
        includeVersions: exportOptions.includeVersions,
        includeAuditLogs: exportOptions.includeAuditLogs,
        includeTemplates: exportOptions.includeTemplates,
        compress: exportOptions.compress,
        encrypt: exportOptions.encrypt,
        encryptionKey: exportOptions.encryptionKey || undefined,
        fileName: exportOptions.fileName || undefined,
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      if (result.success) {
        showSuccess(`Configurations exported successfully! File: ${result.data.filePath}`);
        setShowExportModal(false);

        // Reset form
        setExportOptions({
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
      } else {
        showError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      showError(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [exportOptions, showSuccess, showError]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      showError('Please select a file to import');
      return;
    }

    if (selectedFile.name.endsWith('.enc') && !importOptions.decryptionKey) {
      showError('This file is encrypted. Please provide a decryption key.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await apiService.importConfigurations(selectedFile, {
        overwrite: importOptions.overwrite,
        validateOnly: importOptions.validateOnly,
        skipValidation: importOptions.skipValidation,
        decryptionKey: importOptions.decryptionKey || undefined,
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      setImportResult(result.data);

      if (result.success) {
        const { importedCount = 0, skippedCount = 0, errorCount = 0 } = result.data;
        showSuccess(
          `Import completed! Imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
        );
      } else {
        showError(`Import failed: ${result.message}`);
      }
    } catch (error) {
      showError(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  }, [selectedFile, importOptions, showSuccess, showError]);

  const handleValidate = useCallback(async () => {
    if (!selectedFile) {
      showError('Please select a file to validate');
      return;
    }

    try {
      const result = await apiService.validateConfigurationFile(selectedFile);

      if (result.success) {
        const { importedCount = 0, errorCount = 0, errors = [] } = result.data;
        if (errorCount === 0) {
          showSuccess(`Validation passed! ${importedCount} configurations are valid.`);
        } else {
          showError(`Validation found ${errorCount} errors: ${errors.join(', ')}`);
        }
      } else {
        showError(`Validation failed: ${result.message}`);
      }
    } catch (error) {
      showError(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedFile, showSuccess, showError]);

  const toggleBotSelection = (botId: number) => {
    setExportOptions(prev => ({
      ...prev,
      configIds: prev.configIds.includes(botId)
        ? prev.configIds.filter(id => id !== botId)
        : [...prev.configIds, botId],
    }));
  };

  const selectAllBots = () => {
    setExportOptions(prev => ({
      ...prev,
      configIds: bots.map((bot: any) => bot.id),
    }));
  };

  const deselectAllBots = () => {
    setExportOptions(prev => ({
      ...prev,
      configIds: [],
    }));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Import/Export Configurations"
        description="Export configurations for backup or migration, and import configurations from files"
        icon={<Package className="w-8 h-8" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Export Card */}
        <Card className="shadow-xl">
            <Card.Title className="text-2xl mb-4">
              <Download className="w-6 h-6" />
              Export Configurations
            </Card.Title>
            <p className="text-base-content/70 mb-4">
              Export bot configurations to a file for backup or migration purposes.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Export Format</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={exportOptions.format}
                  onChange={(e) =>
                    setExportOptions({ ...exportOptions, format: e.target.value as 'json' | 'yaml' | 'csv' })
                  }
                >
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <Checkbox
                variant="primary"
                label="Include Version History"
                checked={exportOptions.includeVersions}
                onChange={(e) =>
                  setExportOptions({ ...exportOptions, includeVersions: e.target.checked })
                }
              />

              <Checkbox
                variant="primary"
                label="Include Audit Logs"
                checked={exportOptions.includeAuditLogs}
                onChange={(e) =>
                  setExportOptions({ ...exportOptions, includeAuditLogs: e.target.checked })
                }
              />

              <Checkbox
                variant="primary"
                label="Include Templates"
                checked={exportOptions.includeTemplates}
                onChange={(e) =>
                  setExportOptions({ ...exportOptions, includeTemplates: e.target.checked })
                }
              />

              <Checkbox
                variant="primary"
                label="Compress File (gzip)"
                checked={exportOptions.compress}
                onChange={(e) =>
                  setExportOptions({ ...exportOptions, compress: e.target.checked })
                }
              />

              <Checkbox
                variant="primary"
                label="Encrypt Export"
                checked={exportOptions.encrypt}
                onChange={(e) =>
                  setExportOptions({ ...exportOptions, encrypt: e.target.checked })
                }
              />

              {exportOptions.encrypt && (
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Encryption Key</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter encryption key (min 8 characters)"
                    className="input input-bordered w-full"
                    value={exportOptions.encryptionKey}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, encryptionKey: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <label className="label">
                  <span className="label-text font-semibold">File Name (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="custom-export-name"
                  className="input input-bordered w-full"
                  value={exportOptions.fileName}
                  onChange={(e) =>
                    setExportOptions({ ...exportOptions, fileName: e.target.value })
                  }
                />
              </div>
            </div>

            <Card.Actions className="mt-6">
              <button
                className="btn btn-primary"
                onClick={() => setShowExportModal(true)}
                disabled={botsLoading}
              >
                <Download className="w-4 h-4" />
                Select Configurations to Export
              </button>
            </Card.Actions>
        </Card>

        {/* Import Card */}
        <Card className="shadow-xl">
            <Card.Title className="text-2xl mb-4">
              <Upload className="w-6 h-6" />
              Import Configurations
            </Card.Title>
            <p className="text-base-content/70 mb-4">
              Import bot configurations from a previously exported file.
            </p>

            <FileUpload
              onFileSelect={setSelectedFile}
              fileTypes={['application/json', 'text/yaml', 'text/csv', 'application/x-yaml', 'application/gzip', 'application/octet-stream']}
              maxSize={50 * 1024 * 1024}
            />

            {selectedFile && (
              <div className="mt-4">
                <button
                  className="btn btn-outline btn-sm mb-4"
                  onClick={() => setShowImportModal(true)}
                >
                  <Settings className="w-4 h-4" />
                  Import Options
                </button>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {importOptions.overwrite ? (
                      <AlertCircle className="w-4 h-4 text-warning" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-success" />
                    )}
                    <span>
                      {importOptions.overwrite
                        ? 'Will overwrite existing configurations'
                        : 'Will skip existing configurations'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {selectedFile.name.endsWith('.enc') ? (
                      <Lock className="w-4 h-4 text-warning" />
                    ) : (
                      <Unlock className="w-4 h-4 text-success" />
                    )}
                    <span>
                      {selectedFile.name.endsWith('.enc')
                        ? 'Encrypted file - decryption key required'
                        : 'Unencrypted file'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    className="btn btn-outline btn-sm flex-1"
                    onClick={handleValidate}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Validate
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={handleImport}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import
                      </>
                    )}
                  </button>
                </div>

                {isImporting && importProgress > 0 && (
                  <div className="mt-4">
                    <ProgressBar value={importProgress} max={100} color="primary" label="Import Progress" showPercentage />
                  </div>
                )}

                {importResult && (
                  <Alert status="info" className="mt-4">
                    <FileJson className="w-5 h-5" />
                    <div className="flex-1">
                      <h4 className="font-bold">Import Results</h4>
                      <div className="text-sm mt-2">
                        <div>Imported: {importResult.importedCount || 0}</div>
                        <div>Skipped: {importResult.skippedCount || 0}</div>
                        <div>Errors: {importResult.errorCount || 0}</div>
                        {importResult.warnings && importResult.warnings.length > 0 && (
                          <div className="mt-2">
                            <div className="font-semibold">Warnings:</div>
                            <ul className="list-disc list-inside">
                              {importResult.warnings.map((warning: string, idx: number) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {importResult.errors && importResult.errors.length > 0 && (
                          <div className="mt-2">
                            <div className="font-semibold text-error">Errors:</div>
                            <ul className="list-disc list-inside">
                              {importResult.errors.map((error: string, idx: number) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </Alert>
                )}
              </div>
            )}
        </Card>
      </div>

      {/* Export Modal - Bot Selection */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Select Configurations to Export"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="primary" buttonStyle="outline" size="sm" onClick={selectAllBots}>
              Select All
            </Button>
            <Button variant="primary" buttonStyle="outline" size="sm" onClick={deselectAllBots}>
              Deselect All
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {botsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : bots.length === 0 ? (
              <Alert status="info">
                <AlertCircle className="w-5 h-5" />
                <span>No configurations available to export</span>
              </Alert>
            ) : (
              bots.map((bot: any) => (
                <Card
                  key={bot.id}
                  compact
                  className={`border-2 cursor-pointer transition-colors ${
                    exportOptions.configIds.includes(bot.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-primary/50'
                  }`}
                  onClick={() => toggleBotSelection(bot.id)}
                >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        variant="primary"
                        checked={exportOptions.configIds.includes(bot.id)}
                        onChange={() => toggleBotSelection(bot.id)}
                      />
                      <div className="flex-1">
                        <h3 className="font-bold">{bot.name}</h3>
                        <p className="text-sm text-base-content/70">
                          {bot.messageProvider} - {bot.llmProvider}
                        </p>
                      </div>
                    </div>
                </Card>
              ))
            )}
          </div>

          {isExporting && exportProgress > 0 && (
            <div className="mt-4">
              <ProgressBar value={exportProgress} max={100} color="primary" label="Export Progress" showPercentage />
            </div>
          )}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={exportOptions.configIds.length === 0 || isExporting}
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {exportOptions.configIds.length} Configuration{exportOptions.configIds.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Options Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Options"
      >
        <div className="space-y-4">
          <Checkbox
            variant="primary"
            checked={importOptions.overwrite}
            onChange={(e) =>
              setImportOptions({ ...importOptions, overwrite: e.target.checked })
            }
          >
            <div>
              <span className="font-semibold">Overwrite Existing Configurations</span>
              <p className="text-sm text-base-content/70">
                Replace existing configurations with imported ones
              </p>
            </div>
          </Checkbox>

          <Checkbox
            variant="primary"
            checked={importOptions.validateOnly}
            onChange={(e) =>
              setImportOptions({ ...importOptions, validateOnly: e.target.checked })
            }
          >
            <div>
              <span className="font-semibold">Validate Only (Dry Run)</span>
              <p className="text-sm text-base-content/70">
                Check file validity without importing
              </p>
            </div>
          </Checkbox>

          <Checkbox
            variant="primary"
            checked={importOptions.skipValidation}
            onChange={(e) =>
              setImportOptions({ ...importOptions, skipValidation: e.target.checked })
            }
          >
            <div>
              <span className="font-semibold">Skip Validation</span>
              <p className="text-sm text-base-content/70">
                Import without validating (not recommended)
              </p>
            </div>
          </Checkbox>

          {selectedFile?.name.endsWith('.enc') && (
            <div>
              <label className="label">
                <span className="label-text font-semibold">Decryption Key</span>
              </label>
              <input
                type="password"
                placeholder="Enter decryption key"
                className="input input-bordered w-full"
                value={importOptions.decryptionKey}
                onChange={(e) =>
                  setImportOptions({ ...importOptions, decryptionKey: e.target.value })
                }
              />
            </div>
          )}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setShowImportModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowImportModal(false)}
            >
              Save Options
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ImportExportPage;
