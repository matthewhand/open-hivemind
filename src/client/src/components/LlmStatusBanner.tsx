import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert } from './DaisyUI/Alert';
import { useLlmStatus } from '../hooks/useLlmStatus';

/**
 * Displays a warning banner when bots are missing an LLM provider and no system default is configured.
 */
const LlmStatusBanner: React.FC = () => {
  const { status, loading } = useLlmStatus();

  if (loading || !status || !status.hasMissing) {
    return null;
  }

  const missingCount = status.botsMissingLlmProvider.length;
  const hasDefault = status.defaultConfigured;

  // Only show warning if there's no default LLM configured
  if (hasDefault) {
    return null;
  }

  const summary = `${missingCount} bot${missingCount === 1 ? '' : 's'} ha${missingCount === 1 ? 's' : 've'} no LLM provider configured and no default LLM is set.`;

  return (
    <Alert status="warning" className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">LLM configuration warning</p>
        <p className="text-sm">{summary}</p>
      </div>
      <a
        className="btn btn-sm btn-outline"
        href="/admin/integrations/llm"
        target="_blank"
        rel="noopener noreferrer"
      >
        Configure LLM
      </a>
    </Alert>
  );
};

export default LlmStatusBanner;
