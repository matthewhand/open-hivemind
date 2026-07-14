import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiService } from '../services/api';
import { useWarningToast } from './DaisyUI/ToastNotification';
import { LoadingSpinner } from './DaisyUI/Loading';
import Tooltip from './DaisyUI/Tooltip';

/**
 * Props for the AIAssistButton component.
 */
interface AIAssistButtonProps {
  prompt: string;
  systemPrompt?: string;
  onSuccess: (result: string) => void;
  label?: string;
  className?: string;
}

type FetchState = 'idle' | 'loading' | 'success' | 'error';

const AIAssistButton: React.FC<AIAssistButtonProps> = ({
  prompt,
  systemPrompt,
  onSuccess,
  label = 'Generate with AI',
  className = '',
}) => {
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const warningToast = useWarningToast();

  const handleClick = async () => {
    try {
      setFetchState('loading');
      setErrorMsg(null);
      const response: any = await apiService.post('/api/ai-assist/generate', {
        prompt,
        systemPrompt,
      });
      if (response && response.result) {
        onSuccess(response.result);
        setFetchState('success');
      } else {
        setFetchState('error');
        setErrorMsg('Failed to generate');
      }
    } catch (err: unknown) {
      setFetchState('error');
      setErrorMsg('Failed to generate');
      // Check if it's a configuration error
      if ((err instanceof Error ? err.message : String(err)) && (err instanceof Error ? err.message : String(err)).includes('not configured')) {
        warningToast('AI Not Configured', 'AI Assistance is not configured. Please go to LLM Providers page to configure it.');
      } else {
        warningToast('AI Generation failed');
      }
    }
  };

  const isLoading = fetchState === 'loading';
  const tooltipContent = fetchState === 'error' ? errorMsg : (isLoading ? 'Generating...' : label);

  return (
    <div aria-live="polite" aria-busy={isLoading} className="inline-block">
      <Tooltip
        content={tooltipContent || label}
        position="right"
        color={fetchState === 'error' ? 'error' : undefined}
        className="font-normal normal-case text-sm"
      >
        <button
          type="button"
          className={`btn btn-ghost btn-sm btn-circle text-warning ${className}`}
          onClick={handleClick}
          disabled={isLoading}
          aria-label={isLoading ? `Generating ${label.replace('Generate ', '')}...` : label}
        >
          {isLoading ? (
            <LoadingSpinner size="xs" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </button>
      </Tooltip>
    </div>
  );
};

export default AIAssistButton;
