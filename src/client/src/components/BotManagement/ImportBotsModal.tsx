/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback } from 'react';
import {
  FileJson, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, X, ArrowRight,
} from 'lucide-react';
import Modal from '../DaisyUI/Modal';
import FileUpload from '../DaisyUI/FileUpload';

interface ImportBundle {
  schemaVersion?: number;
  bots: Array<{
    name: string;
    messageProvider?: string;
    llmProvider?: string;
    persona?: string;
    [key: string]: unknown;
  }>;
}

interface ConflictInfo {
  name: string;
  isConflict: boolean;
}

interface ImportReport {
  created: string[];
  updated: string[];
  skipped: string[];
  errors: Array<{ name: string; error: string }>;
}

interface ImportBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBotNames: string[];
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'result';

const ImportBotsModal: React.FC<ImportBotsModalProps> = ({
  isOpen,
  onClose,
  existingBotNames,
  onImportComplete,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [bundle, setBundle] = useState<ImportBundle | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setBundle(null);
    setConflicts([]);
    setParseError(null);
    setImporting(false);
    setReport(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const processFile = useCallback(
    (file: File) => {
      setParseError(null);
      if (!file.name.endsWith('.json')) {
        setParseError('Only .json files are supported.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== 'object') {
            setParseError('File does not contain a valid JSON object.');
            return;
          }
          if (!Array.isArray(parsed.bots)) {
            setParseError('Invalid bundle format: missing "bots" array.');
            return;
          }
          const invalid = parsed.bots.filter((b: any) => !b || typeof b !== 'object' || !b.name);
          if (invalid.length > 0) {
            setParseError(`${invalid.length} bot(s) missing the required "name" field.`);
            return;
          }
          const existingSet = new Set(existingBotNames.map((n) => n.toLowerCase()));
          const conflictList: ConflictInfo[] = parsed.bots.map((b: any) => ({
            name: b.name,
            isConflict: existingSet.has(b.name.toLowerCase()),
          }));
          setBundle(parsed as ImportBundle);
          setConflicts(conflictList);
          setStep('preview');
        } catch {
          setParseError('Failed to parse JSON. Please check the file format.');
        }
      };
      reader.onerror = () => setParseError('Failed to read file.');
      reader.readAsText(file);
    },
    [existingBotNames]
  );

  const handleImport = useCallback(async () => {
    if (!bundle) return;
    setImporting(true);
    try {
      const resp = await fetch('/api/bots/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setParseError(data.error || 'Import failed');
        setImporting(false);
        return;
      }
      setReport(data.report);
      setStep('result');
      onImportComplete();
    } catch (err: any) {
      setParseError(err.message || 'Network error during import');
    } finally {
      setImporting(false);
    }
  }, [bundle, onImportComplete]);

  const newCount = conflicts.filter((c) => !c.isConflict).length;
  const conflictCount = conflicts.filter((c) => c.isConflict).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Bot Configurations" size="lg">
      <div className="space-y-4">
        {step === 'upload' && (
          <div className="py-4">
            <FileUpload
              onFileSelect={processFile}
              fileTypes={['application/json']}
            />
            {parseError && (
              <div className="alert alert-error mt-4">
                <XCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{parseError}</span>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && bundle && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <FileJson className="w-5 h-5 text-primary" />
              <span className="font-semibold">{bundle.bots.length} bot{bundle.bots.length !== 1 ? 's' : ''} found</span>
              {bundle.schemaVersion && <span className="badge badge-ghost badge-sm">schema v{bundle.schemaVersion}</span>}
            </div>
            {conflictCount > 0 && (
              <div className="alert alert-warning py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{conflictCount} bot{conflictCount !== 1 ? 's' : ''} already exist and will be <strong>updated</strong>.</span>
              </div>
            )}
            <div className="overflow-x-auto max-h-60 rounded-lg border border-base-200">
              <table className="table table-xs table-zebra w-full">
                <thead><tr><th>Name</th><th>Message Provider</th><th>LLM Provider</th><th>Status</th></tr></thead>
                <tbody>
                  {conflicts.map((c) => {
                    const bot = bundle.bots.find((b) => b.name === c.name);
                    return (
                      <tr key={c.name}>
                        <td className="font-medium">{c.name}</td>
                        <td className="text-xs">{bot?.messageProvider || '-'}</td>
                        <td className="text-xs">{bot?.llmProvider || '-'}</td>
                        <td>
                          {c.isConflict
                            ? <span className="badge badge-warning badge-xs gap-1"><RefreshCw className="w-3 h-3" /> Update</span>
                            : <span className="badge badge-success badge-xs gap-1"><CheckCircle className="w-3 h-3" /> New</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-base-content/70">{newCount} new, {conflictCount} update{conflictCount !== 1 ? 's' : ''}</div>
            {parseError && (
              <div className="alert alert-error"><XCircle className="w-5 h-5 shrink-0" /><span className="text-sm">{parseError}</span></div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn btn-ghost btn-sm" onClick={reset}><X className="w-4 h-4 mr-1" /> Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={importing}>
                {importing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-1" />}
                {importing ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </>
        )}

        {step === 'result' && report && (
          <>
            <div className="space-y-3">
              {report.created.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div><p className="font-semibold text-sm">Created ({report.created.length})</p><p className="text-xs text-base-content/60">{report.created.join(', ')}</p></div>
                </div>
              )}
              {report.updated.length > 0 && (
                <div className="flex items-start gap-2">
                  <RefreshCw className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div><p className="font-semibold text-sm">Updated ({report.updated.length})</p><p className="text-xs text-base-content/60">{report.updated.join(', ')}</p></div>
                </div>
              )}
              {report.errors.length > 0 && (
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Errors ({report.errors.length})</p>
                    {report.errors.map((e, i) => <p key={i} className="text-xs text-error">{e.name}: {e.error}</p>)}
                  </div>
                </div>
              )}
              {report.created.length === 0 && report.updated.length === 0 && report.errors.length === 0 && (
                <p className="text-sm text-base-content/60">Nothing was imported.</p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button className="btn btn-primary btn-sm" onClick={handleClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ImportBotsModal;
