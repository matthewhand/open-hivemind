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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warningToast = useWarningToast();

  const handleClick = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await apiService.post('/api/ai-assist/generate', {
        prompt,
        systemPrompt,
      });
      if (response && response.result) {
        onSuccess(response.result);
      }
    } catch (err: any) {
      setError('Failed to generate');
      // Check if it's a configuration error
      if (err.message && err.message.includes('not configured')) {
        warningToast('AI Not Configured', 'AI Assistance is not configured. Please go to LLM Providers page to configure it.');
      } else {
        warningToast('AI Generation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip
      content={error || (loading ? 'Generating...' : label)}
      position="right"
      color={error ? 'error' : undefined}
      className="font-normal normal-case text-sm"
    >
      <button
        type="button"
        className={`btn btn-ghost btn-sm btn-circle text-warning ${className}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={loading ? `Generating ${label.replace('Generate ', '')}...` : label}
      >
        {loading ? (
          <LoadingSpinner size="xs" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </button>
    </Tooltip>
  );
};

export default AIAssistButton;
