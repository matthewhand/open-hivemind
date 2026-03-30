import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ExternalLink, Mail, X, ChevronDown, ChevronUp } from 'lucide-react';
import Button from './Button';

/**
 * Enhanced Error Alert Component
 *
 * Displays actionable error messages with retry buttons, documentation links,
 * and detailed suggestions for error resolution.
 */

export interface EnhancedErrorAlertProps {
  /** Error title */
  title: string;
  /** Primary error message */
  message: string;
  /** Error type for styling and icon selection */
  errorType?: 'error' | 'warning' | 'info';
  /** List of actionable suggestions */
  suggestions?: string[];
  /** Whether the operation can be retried */
  canRetry?: boolean;
  /** Delay in seconds before retry is available */
  retryAfter?: number;
  /** Documentation URL */
  docsUrl?: string;
  /** Whether to show contact support option */
  contactSupport?: boolean;
  /** Correlation ID for support */
  correlationId?: string;
  /** Technical details (collapsed by default) */
  details?: string;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export const EnhancedErrorAlert: React.FC<EnhancedErrorAlertProps> = ({
  title,
  message,
  errorType = 'error',
  suggestions = [],
  canRetry = false,
  retryAfter,
  docsUrl,
  contactSupport = false,
  correlationId,
  details,
  onRetry,
  onDismiss,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(retryAfter || 0);
  const [canRetryNow, setCanRetryNow] = useState(!retryAfter);

  // Countdown timer for retry
  useEffect(() => {
    if (retryAfter && retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (retryCountdown === 0 && retryAfter) {
      setCanRetryNow(true);
    }
  }, [retryCountdown, retryAfter]);

  const alertClass = {
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
  }[errorType];

  const handleRetry = () => {
    if (canRetryNow && onRetry) {
      setCanRetryNow(false);
      setRetryCountdown(retryAfter || 0);
      onRetry();
    }
  };

  const handleViewDocs = () => {
    if (docsUrl) {
      window.open(docsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Support Request: ${title}`);
    const body = encodeURIComponent(
      `Error: ${title}\n\nMessage: ${message}\n\n` +
      `Correlation ID: ${correlationId || 'N/A'}\n\n` +
      `Details: ${details || 'N/A'}\n\n` +
      `Please describe what you were doing when this error occurred:`
    );
    window.location.href = `mailto:support@open-hivemind.ai?subject=${subject}&body=${body}`;
  };

  return (
    <div className={`alert ${alertClass} shadow-lg ${className}`} role="alert">
      <div className="flex-1">
        {/* Icon and Title */}
        <div className="flex items-start gap-3 mb-2">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm mt-1">{message}</p>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-sm mb-1">What you can do:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technical Details (Collapsible) */}
            {details && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-sm font-semibold hover:underline"
                  aria-expanded={showDetails}
                  aria-controls="error-details"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide technical details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show technical details
                    </>
                  )}
                </button>
                {showDetails && (
                  <div
                    id="error-details"
                    className="mt-2 p-3 bg-base-300 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto"
                  >
                    {details}
                    {correlationId && (
                      <div className="mt-2 pt-2 border-t border-base-content/20">
                        <strong>Correlation ID:</strong> {correlationId}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {/* Retry Button */}
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={!canRetryNow}
                  aria-label={canRetryNow ? 'Retry operation' : `Retry in ${retryCountdown} seconds`}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${!canRetryNow ? 'animate-spin' : ''}`} />
                  {canRetryNow ? 'Try Again' : `Retry in ${retryCountdown}s`}
                </Button>
              )}

              {/* Documentation Link */}
              {docsUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewDocs}
                  aria-label="View documentation"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View Docs
                </Button>
              )}

              {/* Contact Support */}
              {contactSupport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleContactSupport}
                  aria-label="Contact support"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Contact Support
                </Button>
              )}
            </div>
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Dismiss error"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedErrorAlert;
