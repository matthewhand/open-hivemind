import React, { useEffect, useState } from 'react';
import { useRateLimit } from '../../hooks/useRateLimit';
import Countdown from './Countdown';
import { useInactivity } from '../../hooks/useInactivity';

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

  // Calculate the ratio for display logic
  const ratio = limit > 0 ? remaining / limit : 1;

  // Setup useInactivity hook
  const sessionTimeoutMs = 5 * 60_000; // Example: 5 minutes session timeout
  const { isIdle: _isIdle, lastActive } = useInactivity({ timeoutMs: sessionTimeoutMs });
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionExpiryTime, setSessionExpiryTime] = useState<number>(Date.now() + sessionTimeoutMs);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActive;
      const warningThreshold = sessionTimeoutMs * 0.8; // 80% of timeout

      if (elapsed >= warningThreshold && elapsed < sessionTimeoutMs) {
        setShowSessionWarning(true);
        // Prevent constant state updates if already correct
        setSessionExpiryTime((prev) =>
          prev === lastActive + sessionTimeoutMs ? prev : lastActive + sessionTimeoutMs
        );
      } else {
        setShowSessionWarning(false);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [lastActive, sessionTimeoutMs]);

  // Hidden when > 50% remaining and no session warning
  if ((limit === 0 || ratio > 0.5) && !showSessionWarning) {
    return null;
  }

  const tooltipText = isExhausted
    ? `Rate limit exhausted (0/${limit}). Resets soon.`
    : `API requests: ${remaining}/${limit} remaining.`;

  // Render UI depending on which warning to show
  return (
    <div className="flex gap-2">
      {/* Session Expiry Warning */}
      {showSessionWarning && (
        <div className="tooltip tooltip-bottom" data-tip="Session expiring soon due to inactivity">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/15 border border-warning/30">
            <span className="text-xs font-medium text-warning mr-1">Session expires in</span>
            <span className="text-xs text-warning/70">
              <Countdown targetDate={sessionExpiryTime} size="xs" compact />
            </span>
          </div>
        </div>
      )}

      {/* Rate Limit Indicator */}
      {!(limit === 0 || ratio > 0.5) && (
        <div className="tooltip tooltip-bottom" data-tip={tooltipText}>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${(isNearLimit || isExhausted) ? 'bg-error/15 border-error/30' : 'bg-warning/15 border-warning/30'}`}>
            <div className={`w-2 h-2 rounded-full ${(isNearLimit || isExhausted) ? 'bg-error animate-pulse' : 'bg-warning'}`} />
            <span className={`text-xs font-medium ${(isNearLimit || isExhausted) ? 'text-error' : 'text-warning'}`}>
              {remaining}/{limit}
            </span>
            {(isNearLimit || isExhausted) && resetTime > 0 && (
              <span className="text-xs text-error/70">
                <Countdown targetDate={resetTime} size="xs" compact />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RateLimitIndicator;
