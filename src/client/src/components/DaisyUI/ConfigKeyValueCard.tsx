import React from 'react';

export interface ConfigKeyValueCardProps {
  /** Configuration key name */
  configKey: string;
  /** Configuration value */
  value: unknown;
  /** Whether to mask sensitive values */
  maskSensitive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a single configuration key-value pair in a compact card.
 * Automatically masks values containing 'key', 'token', or 'secret'.
 */
const ConfigKeyValueCard: React.FC<ConfigKeyValueCardProps> = ({
  configKey,
  value,
  maskSensitive = true,
  className = '',
}) => {
  const isSensitive = maskSensitive && (
    configKey.toLowerCase().includes('key') ||
    configKey.toLowerCase().includes('token') ||
    configKey.toLowerCase().includes('secret') ||
    configKey.toLowerCase().includes('password')
  );

  const displayValue = isSensitive ? '••••••••' : String(value);

  return (
    <div className={`bg-base-100 p-2 rounded border border-base-200/50 flex flex-col ${className}`}>
      <span className="font-mono text-xs opacity-50 uppercase tracking-wider mb-1">{configKey}</span>
      <span className="font-medium text-sm truncate" title={String(value)}>
        {displayValue}
      </span>
    </div>
  );
};

export default ConfigKeyValueCard;
