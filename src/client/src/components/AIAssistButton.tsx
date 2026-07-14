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
  const [error, setError] = useState<string | null>(null);
  const warningToast = useWarningToast();

  const handleClick = async () => {
    try {
      setFetchState('loading');
      setError(null);
      const response: any = await apiService.post('/api/ai-assist/generate', {
        prompt,
        systemPrompt,
      });
      if (response && response.result) {
        setFetchState('success');
        onSuccess(response.result);
        setTimeout(() => setFetchState('idle'), 1500);
      } else {
        setFetchState('idle');
      }
    } catch (err: unknown) {
      setFetchState('error');
      setTimeout(() => setFetchState('idle'), 2000);
      setError('Failed to generate');
      // Check if it's a configuration error
      if ((err instanceof Error ? err.message : String(err)) && (err instanceof Error ? err.message : String(err)).includes('not configured')) {
        warningToast('AI Not Configured', 'AI Assistance is not configured. Please go to LLM Providers page to configure it.');
      } else {
        warningToast('AI Generation failed');
      }
    } finally {
      // Reset state handled separately based on success/failure to prevent flicker
    }
  };

  return (
    <Tooltip
      content={error || (fetchState === 'loading' ? 'Generating...' : label)}
      position="right"
      color={error ? 'error' : undefined}
      className="font-normal normal-case text-sm"
    >
      <button
        type="button"
        className={`btn btn-ghost btn-sm btn-circle text-warning focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none ${className}`}
        onClick={handleClick}
        disabled={fetchState === 'loading'}
        aria-busy={fetchState === 'loading'}
        aria-label={fetchState === 'loading' ? `Generating ${label.replace('Generate ', '')}...` : label}
      >
        {fetchState === 'loading' ? (
          <LoadingSpinner size="xs" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </button>
    </Tooltip>
  );
};

export default AIAssistButton;
