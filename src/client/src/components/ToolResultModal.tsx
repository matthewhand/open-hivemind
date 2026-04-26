import React, { useState } from 'react';
import {
  ClipboardCopy as ClipboardDocumentIcon,
  Download as ArrowDownTrayIcon,
  Check as CheckIcon,
  AlertTriangle as ExclamationTriangleIcon,
} from 'lucide-react';
import Modal from './DaisyUI/Modal';
import Mockup from './DaisyUI/Mockup';
import { Alert } from './DaisyUI/Alert';
import { logger } from '../utils/logger';
import { HighlightedJson } from '../utils/jsonHighlighter';

interface ToolResult {
  timestamp: string;
  toolName: string;
  serverName: string;
  arguments: any;
  result?: any;
  error?: {
    message: string;
    stack?: string;
  };
  isError: boolean;
}

interface ToolResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ToolResult | null;
}

const ToolResultModal: React.FC<ToolResultModalProps> = ({ isOpen, onClose, result }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!result) return null;

  const handleCopy = async (content: string, section: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tool-result-${result.toolName}-${new Date(result.timestamp).getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };



  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {result.isError ? (
            <ExclamationTriangleIcon className="w-6 h-6 text-error" />
          ) : (
            <CheckIcon className="w-6 h-6 text-success" />
          )}
          <span>Tool Execution Result</span>
        </div>
      }
      size="xl"
      actions={[
        {
          label: 'Download JSON',
          onClick: handleDownload,
          variant: 'ghost',
        },
        {
          label: 'Close',
          onClick: onClose,
          variant: 'primary',
        },
      ]}
    >
      <div className="space-y-6">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-base-200 rounded-lg">
          <div>
            <div className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Tool Name</div>
            <div className="font-semibold">{result.toolName}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Server</div>
            <div className="font-semibold">{result.serverName}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Timestamp</div>
            <div className="font-mono text-sm">{new Date(result.timestamp).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Status</div>
            <div>
              <span className={`badge ${result.isError ? 'badge-error' : 'badge-success'}`}>
                {result.isError ? 'Error' : 'Success'}
              </span>
            </div>
          </div>
        </div>

        {/* Arguments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm uppercase text-base-content/70">Arguments</h4>
            <button
              className="btn btn-xs btn-ghost gap-2"
              onClick={() => handleCopy(JSON.stringify(result.arguments, null, 2), 'arguments')}
            >
              {copiedSection === 'arguments' ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <Mockup type="code" content={
            <HighlightedJson json={result.arguments} />
          } className="bg-base-300 max-h-48 overflow-auto" />
        </div>

        {/* Result or Error */}
        {result.isError ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm uppercase text-error">Error</h4>
              <button
                className="btn btn-xs btn-ghost gap-2"
                onClick={() =>
                  handleCopy(
                    result.error?.stack || result.error?.message || 'Unknown error',
                    'error'
                  )
                }
              >
                {copiedSection === 'error' ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <Alert status="error">
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">{result.error?.message}</div>
                {result.error?.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm opacity-80 hover:opacity-100">
                      Stack Trace
                    </summary>
                    <Mockup type="code" content={result.error.stack} className="bg-base-100/10 mt-2 max-h-64 overflow-auto" />
                  </details>
                )}
              </div>
            </Alert>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm uppercase text-base-content/70">Result</h4>
              <button
                className="btn btn-xs btn-ghost gap-2"
                onClick={() => handleCopy(JSON.stringify(result.result, null, 2), 'result')}
              >
                {copiedSection === 'result' ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <Mockup type="code" content={
              <HighlightedJson json={result.result} />
            } className="bg-base-300 max-h-96 overflow-auto" />
          </div>
        )}

        {/* Download as JSON */}
        <div className="flex justify-center pt-4">
          <button
            className="btn btn-outline btn-sm gap-2"
            onClick={handleDownload}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download Full Result as JSON
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ToolResultModal;
