import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

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
    <div className={`tooltip tooltip-right ${error ? 'tooltip-error' : ''}`} data-tip={error || label}>
      <button
        type="button"
        aria-label={label}
        className={`btn btn-ghost btn-sm btn-circle text-warning ${className}`}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default AIAssistButton;
