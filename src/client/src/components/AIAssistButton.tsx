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
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const warningToast = useWarningToast();

  const handleClick = async () => {
    try {
      setFetchState('loading');
      setErrorMessage(null);
      const response = await apiService.post<{ result: string }>('/api/ai-assist/generate', {
        prompt,
        systemPrompt,
      });
      if (response && response.result) {
        setFetchState('success');
        onSuccess(response.result);
        setTimeout(() => setFetchState('idle'), 2000);
      } else {
        throw new Error('No result returned');
      }
    } catch (err: unknown) {
      setFetchState('error');
      setErrorMessage('Failed to generate');
      // Check if it's a configuration error
      if ((err instanceof Error ? err.message : String(err)) && (err instanceof Error ? err.message : String(err)).includes('not configured')) {
        warningToast('AI Not Configured', 'AI Assistance is not configured. Please go to LLM Providers page to configure it.');
      } else {
        warningToast('AI Generation failed');
      }
    }
  };

  const isLoading = fetchState === 'loading';
  const isError = fetchState === 'error';

  return (
    <Tooltip
      content={errorMessage || (isLoading ? 'Generating...' : label)}
      position="right"
      color={isError ? 'error' : undefined}
      className="font-normal normal-case text-sm"
    >
      <button
        type="button"
        className={`btn btn-ghost btn-sm btn-circle text-warning ${className}`}
        onClick={handleClick}
        disabled={isLoading}
        aria-live="polite"
        aria-busy={isLoading}
        aria-label={isLoading ? `Generating ${label.replace('Generate ', '')}...` : label}
      >
        {isLoading ? (
          <LoadingSpinner size="xs" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </button>
    </Tooltip>
  );
};

export default AIAssistButton;
