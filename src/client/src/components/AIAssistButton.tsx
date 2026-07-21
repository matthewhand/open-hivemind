import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
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

const AIAssistButton: React.FC<AIAssistButtonProps> = ({
  prompt,
  systemPrompt,
  onSuccess,
  label = 'Generate with AI',
  className = '',
}) => {
  type FetchState = 'idle' | 'loading' | 'error' | 'success';
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
        setTimeout(() => setFetchState('idle'), 2000);
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
    } finally {
      setFetchState(prev => prev === 'loading' ? 'idle' : prev);
    }
  };

  return (
    <Tooltip
      content={errorMsg || (fetchState === 'loading' ? 'Generating...' : label)}
      position="right"
      color={fetchState === 'error' ? 'error' : undefined}
      className="font-normal normal-case text-sm"
    >
      <div aria-live="polite" className="inline-block">
      <button
        type="button"
        aria-busy={fetchState === 'loading'}
        className={`btn btn-ghost btn-sm btn-circle text-warning ${className}`}
        onClick={handleClick}
        disabled={fetchState === 'loading'}
        aria-label={fetchState === 'loading' ? `Generating ${label.replace('Generate ', '')}...` : label}
      >
        {fetchState === 'loading' ? (
          <LoadingSpinner size="xs" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </button>
      </div>
    </Tooltip>
  );
};

export default AIAssistButton;
