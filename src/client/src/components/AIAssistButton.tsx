import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

/**
 * Props for the AIAssistButton component.
 */
interface AIAssistButtonProps {
  prompt: string;
  systemPrompt?: string;
  onSuccess: (result: string) => void;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

const AIAssistButton: React.FC<AIAssistButtonProps> = ({
  prompt,
  systemPrompt,
  onSuccess,
  label = 'Generate with AI',
  showLabel = false,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        alert('AI Assistance is not configured. Please go to LLM Providers page to configure it.');
      } else {
        console.error('AI Gen error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`tooltip tooltip-right font-normal normal-case text-sm ${error ? 'tooltip-error' : ''}`}
      data-tip={error || (loading ? 'Generating...' : label)}
      aria-live="polite"
    >
      <button
        type="button"
        className={`btn btn-ghost btn-sm text-warning ${showLabel ? 'gap-2' : 'btn-circle'} ${className}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={loading ? 'Generating AI instruction...' : label}
        aria-busy={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {showLabel && <span>{label}</span>}
      </button>
    </div>
  );
};

export default AIAssistButton;
