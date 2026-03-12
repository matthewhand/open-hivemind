import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { useToast } from './DaisyUI/ToastNotification';

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
  const { addToast } = useToast();

  const handleClick = async () => {
    try {
      setLoading(true);
      const response: any = await apiService.post('/api/ai-assist/generate', {
        prompt,
        systemPrompt,
      });
      if (response && response.result) {
        onSuccess(response.result);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('not configured')) {
        addToast({
          type: 'warning',
          title: 'Not Configured',
          message: 'AI Assistance is not configured. Please go to LLM Providers page to configure it.',
        });
      } else {
        console.error('AI Gen error:', err);
        addToast({
          type: 'error',
          title: 'Generation Failed',
          message: err.message || 'Failed to generate AI response.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="tooltip tooltip-right font-normal normal-case text-sm"
      data-tip={loading ? 'Generating...' : label}
      aria-live="polite"
    >
      <button
        type="button"
        className={`btn btn-ghost btn-sm btn-circle text-warning ${className}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={loading ? `Generating ${label.replace('Generate ', '')}...` : label}
        aria-busy={loading}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs" aria-hidden="true" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default AIAssistButton;
