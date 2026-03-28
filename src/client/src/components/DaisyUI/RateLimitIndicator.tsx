import React, { useEffect, useState } from 'react';
import { useRateLimit } from '../../hooks/useRateLimit';

/**
 * Subtle rate limit indicator for the navbar area.
 *
 * - Hidden when > 50% remaining
 * - Yellow badge when 10-50% remaining
 * - Red badge with countdown when < 10% remaining
 * - Tooltip showing exact numbers
 */
const RateLimitIndicator: React.FC = () => {
  const { limit, remaining, resetTime, isNearLimit, isExhausted } = useRateLimit();
  const [countdown, setCountdown] = useState('');

  // Calculate the ratio for display logic
  const ratio = limit > 0 ? remaining / limit : 1;

  // Update countdown timer when near limit or exhausted
  useEffect(() => {
    if (!isNearLimit && !isExhausted) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      if (!resetTime) {
        setCountdown('');
        return;
      }
      const now = Date.now();
      const diff = resetTime - now;
      if (diff <= 0) {
        setCountdown('resetting...');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resetTime, isNearLimit, isExhausted]);

  // Hidden when > 50% remaining or when no rate limit info has been received yet
  if (limit === 0 || ratio > 0.5) {
    return null;
  }

  const tooltipText = isExhausted
    ? `Rate limit exhausted (0/${limit}). Resets in ${countdown}`
    : `API requests: ${remaining}/${limit} remaining. Resets in ${countdown}`;

  // Red badge with countdown when < 10%
  if (isNearLimit || isExhausted) {
    return (
      <div className="tooltip tooltip-bottom" data-tip={tooltipText}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-error/15 border border-error/30">
          <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <span className="text-xs font-medium text-error">
            {remaining}/{limit}
          </span>
          {countdown && (
            <span className="text-xs text-error/70">{countdown}</span>
          )}
        </div>
      </div>
    );
  }

  // Yellow badge when 10-50% remaining
  return (
    <div className="tooltip tooltip-bottom" data-tip={tooltipText}>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/15 border border-warning/30">
        <div className="w-2 h-2 rounded-full bg-warning" />
        <span className="text-xs font-medium text-warning">
          {remaining}/{limit}
        </span>
      </div>
    </div>
  );
};

export default RateLimitIndicator;
