import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLlmStatus } from '../hooks/useLlmStatus';

const LlmStatusBanner: React.FC = () => {
  const { status, loading } = useLlmStatus();

  if (loading || !status || !status.hasMissing) {
    return null;
  }

  const missingCount = status.botsMissingLlmProvider.length;
  const hasDefault = status.defaultConfigured;

  const summary = hasDefault
    ? `${missingCount} bot${missingCount === 1 ? '' : 's'} ha${missingCount === 1 ? 's' : 've'} no LLM override and will use the default LLM provider.`
    : `${missingCount} bot${missingCount === 1 ? '' : 's'} ha${missingCount === 1 ? 's' : 've'} no LLM provider configured and no default LLM is set.`;

  return (
    <div className="alert alert-warning flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">LLM configuration warning</p>
        <p className="text-sm">{summary}</p>
      </div>
      <a
        className="btn btn-sm btn-outline"
        href="/admin/integrations/llm"
        target="_blank"
        rel="noreferrer"
      >
        Configure LLM
      </a>
    </div>
  );
};

export default LlmStatusBanner;
