import React, { useState } from 'react';
import {
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Modal from './DaisyUI/Modal';
import { Alert } from './DaisyUI/Alert';
import { logger } from '../utils/logger';

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

  /**
   * SECURITY: Renders JSON with syntax highlighting using dangerouslySetInnerHTML
   *
   * Why needed: Provides syntax highlighting for JSON tool results in the UI
   *
   * Sanitization: Input is sanitized by escaping HTML entities (&, <, >) manually
   * since JSON.stringify() DOES NOT escape HTML characters. This prevents XSS
   * from malicious JSON payloads containing HTML tags.
   *
   * Data sources: Tool execution results from MCP servers. While these are external,
   * they are JSON.stringify'd and then HTML-escaped which prevents any HTML/script
   * injection. The regex patterns only match JSON tokens (strings, numbers, keywords)
   * and wrap them in safe <span> elements with DaisyUI classes.
   *
   * Risk: LOW - HTML entities are manually escaped, converting any potential
   * HTML/script content into safe text before our highlighting regex runs.
   */
  const renderJsonWithHighlighting = (obj: any) => {
    const jsonString = JSON.stringify(obj, null, 2);

    // Escape HTML entities to prevent XSS before applying highlighting
    const escapedString = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Simple syntax highlighting using spans
    const highlighted = escapedString
      .replace(/(".*?")/g, '<span class="text-success">$1</span>') // strings
      .replace(/\b(true|false|null)\b/g, '<span class="text-warning">$1</span>') // booleans/null
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-info">$1</span>'); // numbers

    return highlighted;
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
          <div className="mockup-code bg-base-300 max-h-48 overflow-auto">
            <pre className="px-4 py-2">
              {/* SECURITY: Safe use of dangerouslySetInnerHTML - see renderJsonWithHighlighting() */}
              <code
                dangerouslySetInnerHTML={{
                  __html: renderJsonWithHighlighting(result.arguments),
                }}
              />
            </pre>
          </div>
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
                    <div className="mockup-code bg-base-100/10 mt-2 max-h-64 overflow-auto">
                      <pre className="px-4 py-2 text-xs">
                        <code>{result.error.stack}</code>
                      </pre>
                    </div>
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
            <div className="mockup-code bg-base-300 max-h-96 overflow-auto">
              <pre className="px-4 py-2">
                {/* SECURITY: Safe use of dangerouslySetInnerHTML - see renderJsonWithHighlighting() */}
                <code
                  dangerouslySetInnerHTML={{
                    __html: renderJsonWithHighlighting(result.result),
                  }}
                />
              </pre>
            </div>
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
