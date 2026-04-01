import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { logger } from '../../utils/logger';

export type FeedbackState = 'idle' | 'loading' | 'success' | 'error';

export interface VisualFeedbackProps {
  state: FeedbackState;
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

const VisualFeedback: React.FC<VisualFeedbackProps> = ({
  state,
  message,
  onComplete,
  duration = 2000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (state !== 'idle') {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }

    if ((state === 'success' || state === 'error') && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [state, duration, onComplete]);

  if (!isVisible || state === 'idle') return null;

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in zoom-in duration-300">
      {state === 'loading' && (
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        </div>
      )}
      {state === 'success' && (
        <div className="relative flex items-center justify-center">
          <CheckCircle className="w-16 h-16 text-success animate-[bounce_1s_ease-in-out]" />
          <div className="absolute inset-0 bg-success/20 rounded-full blur-xl animate-pulse"></div>
        </div>
      )}
      {state === 'error' && (
        <div className="relative flex items-center justify-center">
          <XCircle className="w-16 h-16 text-error animate-[shake_0.5s_ease-in-out]" />
          <div className="absolute inset-0 bg-error/20 rounded-full blur-xl animate-pulse"></div>
        </div>
      )}
      {message && (
        <p className={`text-lg font-semibold text-center ${
          state === 'error' ? 'text-error' : state === 'success' ? 'text-success' : 'text-base-content'
        }`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default VisualFeedback;
