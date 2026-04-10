import React, { useState, useEffect } from 'react';

interface ApiKeyStatus {
  name: string;
  key: string;
  status: 'valid' | 'invalid' | 'expired' | 'missing' | 'checking';
  details?: string;
  lastChecked?: Date;
  usage?: {
    current: number;
    limit: number;
    resetDate?: Date;
  };
}

interface ApiKeyValidatorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ApiKeyValidator: React.FC<ApiKeyValidatorProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([
    {
      name: 'OPENAI_API_KEY',
      key: 'sk-...abc123',
      status: 'valid',
      details: 'GPT-4 access enabled',
      lastChecked: new Date(),
      usage: { current: 1247, limit: 10000, resetDate: new Date(Date.now() + 86400000) }
    },
    {
      name: 'ANTHROPIC_API_KEY', 
      key: 'sk-...def456',
      status: 'valid',
      details: 'Claude-3 access enabled',
      lastChecked: new Date(),
      usage: { current: 523, limit: 5000 }
    },
    {
      name: 'DISCORD_BOT_TOKEN',
      key: 'MTI...xyz789',
      status: 'valid',
      details: 'Connected to 3 servers',
      lastChecked: new Date()
    },
    {
      name: 'SLACK_BOT_TOKEN',
      key: 'xoxb-...uvw012',
      status: 'expired',
      details: 'Token expired 2 days ago',
      lastChecked: new Date()
    },
    {
      name: 'FLOWISE_API_KEY',
      key: 'Not configured',
      status: 'missing',
      details: 'Optional integration',
      lastChecked: new Date()
    }
  ]);

  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState(new Date());

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      validateKeys();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const validateKeys = async () => {
    setIsValidating(true);
    
    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setApiKeys(prev => prev.map(key => ({
      ...key,
      lastChecked: new Date(),
      // Randomly update some statuses for demo
      status: Math.random() > 0.8 ? 
        (['valid', 'invalid', 'expired'] as const)[Math.floor(Math.random() * 3)] : 
        key.status
    })));
    
    setLastValidation(new Date());
    setIsValidating(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return '✓';
      case 'invalid': return '✗';
      case 'expired': return '⚠';
      case 'missing': return '○';
      case 'checking': return '⟳';
      default: return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-success';
      case 'invalid': return 'text-error';
      case 'expired': return 'text-warning';
      case 'missing': return 'text-base-content/60';
      case 'checking': return 'text-info';
      default: return 'text-base-content';
    }
  };

  const formatUsage = (usage?: { current: number; limit: number; resetDate?: Date }) => {
    if (!usage) return '';
    const percentage = Math.round((usage.current / usage.limit) * 100);
    return `${usage.current.toLocaleString()}/${usage.limit.toLocaleString()} (${percentage}%)`;
  };

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-header px-6 py-4 border-b border-base-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔑</div>
            <div>
              <h2 className="card-title text-lg">API Key Validation</h2>
              <p className="text-sm text-base-content/60">
                Last checked: {lastValidation.toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`badge badge-sm ${autoRefresh ? 'badge-success' : 'badge-neutral'}`}>
              {autoRefresh ? '● AUTO' : '○ MANUAL'}
            </div>
            
            <button 
              className={`btn btn-sm btn-ghost ${isValidating ? 'loading' : ''}`}
              onClick={validateKeys}
              disabled={isValidating}
            >
              {isValidating ? '' : '🔄'} Validate
            </button>
          </div>
        </div>
      </div>
      
      <div className="card-body p-6">
        <div className="mockup-code bg-base-300 max-h-80 overflow-y-auto">
          <pre data-prefix="$" className="text-primary">
            <code>hivemind validate-keys --all --verbose</code>
          </pre>
          
          <pre data-prefix=">" className="text-info">
            <code>Checking API key validity...</code>
          </pre>
          
          {apiKeys.map((key, index) => (
            <React.Fragment key={key.name}>
              <pre 
                data-prefix={getStatusIcon(key.status)} 
                className={getStatusColor(key.status)}
              >
                <code>
                  {key.name}: {key.status.toUpperCase()}
                  {key.details && ` - ${key.details}`}
                </code>
              </pre>
              
              {key.usage && (
                <pre data-prefix="  ├─" className="text-base-content/80">
                  <code>Usage: {formatUsage(key.usage)}</code>
                </pre>
              )}
              
              <pre data-prefix="  └─" className="text-base-content/60">
                <code>Key: {key.key}</code>
              </pre>
            </React.Fragment>
          ))}
          
          {isValidating && (
            <pre data-prefix="⟳" className="text-info">
              <code>Validating keys...</code>
            </pre>
          )}
          
          <pre data-prefix=">" className="text-success mt-2">
            <code>
              Validation complete: {apiKeys.filter(k => k.status === 'valid').length}/{apiKeys.length} keys valid
            </code>
          </pre>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Valid</div>
            <div className="stat-value text-lg text-success">
              {apiKeys.filter(k => k.status === 'valid').length}
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Invalid</div>
            <div className="stat-value text-lg text-error">
              {apiKeys.filter(k => k.status === 'invalid').length}
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Expired</div>
            <div className="stat-value text-lg text-warning">
              {apiKeys.filter(k => k.status === 'expired').length}
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Missing</div>
            <div className="stat-value text-lg text-base-content/60">
              {apiKeys.filter(k => k.status === 'missing').length}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-base-content/60 mt-4 text-center">
          Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} • 
          Next check in: {Math.ceil(refreshInterval / 1000)}s
        </div>
      </div>
    </div>
  );
};

export default ApiKeyValidator;