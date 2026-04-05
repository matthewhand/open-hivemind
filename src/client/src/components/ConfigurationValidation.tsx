import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Info, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { LoadingSpinner } from './DaisyUI/Loading';
import { apiService } from '../services/api';
import type { BotConfig } from '../types/bot';

/** Shape returned by GET /api/validation */
interface BotValidationResult {
  name: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  botValidation: BotValidationResult[];
  environmentValidation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  timestamp: string;
}

interface ConfigurationValidationProps {
  bot: BotConfig;
}

type CheckStatus = 'pass' | 'fail' | 'warn';

interface ClientCheck {
  label: string;
  status: CheckStatus;
  detail?: string;
}

/** Run client-side validation checks against the bot config. */
function runClientChecks(bot: BotConfig): ClientCheck[] {
  const checks: ClientCheck[] = [];

  // Name check
  if (!bot.name || bot.name.trim().length === 0) {
    checks.push({ label: 'Bot name', status: 'fail', detail: 'Name is required' });
  } else if (bot.name.length < 2) {
    checks.push({ label: 'Bot name', status: 'warn', detail: 'Name is very short' });
  } else {
    checks.push({ label: 'Bot name', status: 'pass' });
  }

  // Message provider check
  if (!bot.messageProvider) {
    checks.push({ label: 'Message provider', status: 'fail', detail: 'No message provider configured' });
  } else {
    checks.push({ label: 'Message provider', status: 'pass', detail: bot.messageProvider });
  }

  // LLM provider check
  if (!bot.llmProvider) {
    checks.push({ label: 'LLM provider', status: 'fail', detail: 'No LLM provider configured' });
  } else {
    checks.push({ label: 'LLM provider', status: 'pass', detail: bot.llmProvider });
  }

  // Provider-specific checks
  if (bot.messageProvider === 'discord') {
    if (!bot.discord?.token) {
      checks.push({ label: 'Discord token', status: 'fail', detail: 'Discord bot token is required' });
    } else {
      checks.push({ label: 'Discord token', status: 'pass' });
    }
  }

  if (bot.messageProvider === 'slack') {
    if (!bot.slack?.botToken) {
      checks.push({ label: 'Slack bot token', status: 'fail', detail: 'Slack bot token is required' });
    } else {
      checks.push({ label: 'Slack bot token', status: 'pass' });
    }
    if (!bot.slack?.signingSecret) {
      checks.push({ label: 'Slack signing secret', status: 'fail', detail: 'Signing secret is required' });
    } else {
      checks.push({ label: 'Slack signing secret', status: 'pass' });
    }
  }

  if (bot.llmProvider === 'openai') {
    if (!bot.openai?.apiKey) {
      checks.push({ label: 'OpenAI API key', status: 'fail', detail: 'API key is required' });
    } else if (!bot.openai.apiKey.startsWith('sk-')) {
      checks.push({ label: 'OpenAI API key', status: 'warn', detail: 'Key should start with "sk-"' });
    } else {
      checks.push({ label: 'OpenAI API key', status: 'pass' });
    }
  }

  return checks;
}

const statusIcon = (status: CheckStatus) => {
  switch (status) {
  case 'pass':
    return <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />;
  case 'fail':
    return <XCircle className="w-3.5 h-3.5 text-error shrink-0" />;
  case 'warn':
    return <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />;
  }
};

const ConfigurationValidation: React.FC<ConfigurationValidationProps> = ({ bot }) => {
  const [backendData, setBackendData] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const fetchValidation = useCallback(async () => {
    setLoading(true);
    setBackendError(null);
    try {
      const data = await apiService.get<ValidationResponse>('/api/validation');
      setBackendData(data);
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : 'Failed to fetch validation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValidation();
  }, [fetchValidation, bot.name]);

  const clientChecks = runClientChecks(bot);
  const hasClientErrors = clientChecks.some(c => c.status === 'fail');

  // Find this bot's results from the backend validation response
  const botResult = backendData?.botValidation?.find(
    (b) => b.name === bot.name
  );

  const overallValid = !hasClientErrors
    && (botResult ? botResult.valid : true)
    && (backendData ? backendData.environmentValidation.valid : true);

  return (
    <div className="space-y-3" data-testid="configuration-validation">
      {/* Overall status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 ${overallValid ? 'text-success' : 'text-error'}`} />
          <span className={`text-xs font-bold uppercase ${overallValid ? 'text-success' : 'text-error'}`}>
            {overallValid ? 'Configuration Valid' : 'Issues Found'}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-xs"
          onClick={fetchValidation}
          disabled={loading}
          aria-label="Refresh validation"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Client-side checks */}
      <div>
        <h4 className="text-[10px] font-bold uppercase opacity-50 mb-1.5">Client Checks</h4>
        <div className="space-y-1">
          {clientChecks.map((check, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[11px]">
              {statusIcon(check.status)}
              <span className="font-medium">{check.label}</span>
              {check.detail && (
                <span className="opacity-50 truncate">{check.detail}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Backend validation results */}
      <div>
        <h4 className="text-[10px] font-bold uppercase opacity-50 mb-1.5">Backend Validation</h4>
        {loading ? (
          <div className="flex items-center gap-2 py-2 text-[11px] opacity-60" data-testid="validation-loading">
            <LoadingSpinner size="xs" />
            <span>Validating configuration...</span>
          </div>
        ) : backendError ? (
          <div className="flex items-center gap-2 text-[11px] text-error" data-testid="validation-error">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{backendError}</span>
          </div>
        ) : botResult ? (
          <div className="space-y-1">
            {botResult.errors.length === 0 && botResult.warnings.length === 0 ? (
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                <span>No issues detected</span>
              </div>
            ) : (
              <>
                {botResult.errors.map((err, idx) => (
                  <div key={`err-${idx}`} className="flex items-center gap-2 text-[11px]">
                    <XCircle className="w-3.5 h-3.5 text-error shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
                {botResult.warnings.map((warn, idx) => (
                  <div key={`warn-${idx}`} className="flex items-center gap-2 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                    <span>{warn}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] opacity-50">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Bot not found in backend validation results</span>
          </div>
        )}
      </div>

      {/* Environment warnings */}
      {backendData && !loading && backendData.environmentValidation.warnings.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase opacity-50 mb-1.5">Environment</h4>
          <div className="space-y-1">
            {backendData.environmentValidation.warnings.map((w, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {backendData && !loading && backendData.recommendations.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase opacity-50 mb-1.5">Recommendations</h4>
          <div className="space-y-1">
            {backendData.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <Info className="w-3.5 h-3.5 text-info shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationValidation;

// Export helper for testing
export { runClientChecks };
export type { ConfigurationValidationProps, ValidationResponse, ClientCheck, CheckStatus };
