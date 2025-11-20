import React, { useState } from 'react';
import { Card, Badge, Button, Alert, Progress, Modal } from './DaisyUI';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  icon: string;
  description: string;
}

export interface ImportJob {
  id: string;
  filename: string;
  format: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  startTime: Date;
  endTime?: Date;
  recordsProcessed?: number;
  totalRecords?: number;
  errorMessage?: string;
}

const exportFormats: ExportFormat[] = [
  {
    id: 'json',
    name: 'JSON',
    extension: '.json',
    icon: '{ }',
    description: 'JavaScript Object Notation format'
  },
  {
    id: 'csv',
    name: 'CSV',
    extension: '.csv',
    icon: ',',
    description: 'Comma-separated values format'
  },
  {
    id: 'xlsx',
    name: 'Excel',
    extension: '.xlsx',
    icon: '📊',
    description: 'Microsoft Excel spreadsheet format'
  },
  {
    id: 'xml',
    name: 'XML',
    extension: '.xml',
    icon: '</>',
    description: 'Extensible Markup Language format'
  },
];

const mockImportJobs: ImportJob[] = [
  {
    id: '1',
    filename: 'users_2024.csv',
    format: 'csv',
    status: 'success',
    progress: 100,
    startTime: new Date(Date.now() - 60000),
    endTime: new Date(Date.now() - 30000),
    recordsProcessed: 1247,
    totalRecords: 1247
  },
  {
    id: '2',
    filename: 'config_backup.json',
    format: 'json',
    status: 'processing',
    progress: 65,
    startTime: new Date(Date.now() - 120000),
    recordsProcessed: 326,
    totalRecords: 500
  },
  {
    id: '3',
    filename: 'data_export.xlsx',
    format: 'xlsx',
    status: 'error',
    progress: 30,
    startTime: new Date(Date.now() - 300000),
    endTime: new Date(Date.now() - 240000),
    errorMessage: 'Invalid file format detected'
  },
];

const ExportImport: React.FC = () => {
  const [importJobs, setImportJobs] = useState<ImportJob[]>(mockImportJobs);
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = (format: string) => {
    setIsProcessing(true);
    setSelectedFormat(format);

    setTimeout(() => {
      setIsProcessing(false);
      setShowExportModal(false);

      const formatInfo = exportFormats.find(f => f.id === format);
      if (formatInfo) {
        const blob = new Blob([JSON.stringify({ data: 'exported', format, timestamp: new Date() }, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export_${Date.now()}${formatInfo.extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, 2000);
  };

  const handleImport = (file: File) => {
    const newJob: ImportJob = {
      id: Date.now().toString(),
      filename: file.name,
      format: file.name.split('.').pop() || 'unknown',
      status: 'pending',
      progress: 0,
      startTime: new Date()
    };

    setImportJobs(prev => [newJob, ...prev]);

    setTimeout(() => {
      setImportJobs(prev => prev.map(job =>
        job.id === newJob.id ? { ...job, status: 'processing', progress: 0 } : job
      ));

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;

        setImportJobs(prev => prev.map(job =>
          job.id === newJob.id ? {
            ...job,
            progress: Math.min(progress, 100),
            recordsProcessed: Math.floor((progress / 100) * 100)
          } : job
        ));

        if (progress >= 100) {
          clearInterval(interval);
          const success = Math.random() > 0.2;

          setImportJobs(prev => prev.map(job =>
            job.id === newJob.id ? {
              ...job,
              status: success ? 'success' : 'error',
              progress: 100,
              endTime: new Date(),
              recordsProcessed: 100,
              totalRecords: 100,
              errorMessage: success ? undefined : 'Random error occurred'
            } : job
          ));
        }
      }, 500);
    }, 1000);

    setShowImportModal(false);
  };

  const getStatusColor = (status: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'processing': return 'warning';
      case 'pending': return 'info';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'error': return <ExclamationTriangleIcon className="w-5 h-5 text-error" />;
      case 'processing': return <ClockIcon className="w-5 h-5 animate-spin text-warning" />;
      case 'pending': return <ClockIcon className="w-5 h-5 text-info" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const activeJobs = importJobs.filter(job => job.status === 'processing' || job.status === 'pending').length;
  const successfulJobs = importJobs.filter(job => job.status === 'success').length;
  const failedJobs = importJobs.filter(job => job.status === 'error').length;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-primary">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ArrowDownTrayIcon className="w-8 h-8 text-primary" />
              <div>
                <h2 className="card-title text-2xl">Export & Import</h2>
                <p className="text-sm opacity-70">Data import and export management system</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={activeJobs > 0 ? 'warning' : 'success'} size="lg">
                {activeJobs > 0 ? 'Processing' : 'Ready'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-primary">{importJobs.length}</div>
            <p className="text-sm opacity-70">Total Jobs</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-warning">{activeJobs}</div>
            <p className="text-sm opacity-70">Active</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-success">{successfulJobs}</div>
            <p className="text-sm opacity-70">Successful</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-error">{failedJobs}</div>
            <p className="text-sm opacity-70">Failed</p>
          </div>
        </Card>
      </div>

      {/* Export Section */}
      <Card className="shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title text-lg flex items-center gap-2">
              <DocumentArrowDownIcon className="w-5 h-5" />
              Export Data
            </h3>
            <Button onClick={() => setShowExportModal(true)} className="btn-primary">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {exportFormats.map((format) => (
              <div
                key={format.id}
                className="border border-base-300 rounded-lg p-4 hover:bg-base-200 transition-colors cursor-pointer"
                onClick={() => setSelectedFormat(format.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{format.icon}</span>
                  {selectedFormat === format.id && (
                    <Badge variant="success" size="sm">Selected</Badge>
                  )}
                </div>
                <h4 className="font-semibold">{format.name}</h4>
                <p className="text-sm opacity-70">{format.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title text-lg flex items-center gap-2">
              <DocumentArrowUpIcon className="w-5 h-5" />
              Import Data
            </h3>
            <Button onClick={() => setShowImportModal(true)} className="btn-secondary">
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>

          <div className="border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
            <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-primary mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Drop files here or click to browse</h3>
            <p className="text-sm opacity-70 mb-4">
              Supports JSON, CSV, Excel, and XML formats
            </p>
            <Button onClick={() => setShowImportModal(true)} className="btn-primary btn-outline">
              Select Files
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Jobs */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Recent Import Jobs</h3>
          <div className="space-y-3">
            {importJobs.slice(0, 10).map((job) => (
              <div key={job.id} className="border border-base-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <h4 className="font-semibold">{job.filename}</h4>
                      <p className="text-sm opacity-70">
                        {job.format.toUpperCase()} • Started {job.startTime.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(job.status)} size="sm">
                    {job.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(job.progress)}%</span>
                  </div>
                  <Progress value={job.progress} max={100} className="w-full" />

                  {job.recordsProcessed && job.totalRecords && (
                    <div className="text-sm opacity-70">
                      {job.recordsProcessed} / {job.totalRecords} records processed
                    </div>
                  )}

                  {job.errorMessage && (
                    <div className="text-sm text-error">
                      Error: {job.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Export Modal */}
      <Modal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Data"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Select Format</h4>
            <div className="grid grid-cols-2 gap-2">
              {exportFormats.map((format) => (
                <button
                  key={format.id}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    selectedFormat === format.id
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:bg-base-200'
                  }`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{format.icon}</span>
                    <span>{format.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleExport(selectedFormat)}
              disabled={isProcessing}
              className="btn-primary flex-1"
            >
              {isProcessing ? (
                <>
                  <div className="loading loading-spinner loading-sm mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
            <Button onClick={() => setShowExportModal(false)} className="btn-ghost">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Data"
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
            <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-primary mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Select file to import</h3>
            <p className="text-sm opacity-70 mb-4">
              Choose JSON, CSV, Excel, or XML files
            </p>
            <input
              type="file"
              accept=".json,.csv,.xlsx,.xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="btn-primary cursor-pointer">
              Browse Files
            </label>
          </div>

          <Button onClick={() => setShowImportModal(false)} className="btn-ghost w-full">
            Cancel
          </Button>
        </div>
      </Modal>

      {activeJobs > 0 && (
        <Alert variant="warning" className="flex items-center gap-3">
          <ClockIcon className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-medium">{activeJobs} import job{activeJobs !== 1 ? 's' : ''} processing</p>
            <p className="text-sm opacity-70">Processing files in background</p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default ExportImport;