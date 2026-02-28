/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Card, Alert, Input, Select, Textarea, Tooltip } from './DaisyUI';
import { 
  Eye, 
  EyeOff, 
  Shield, 
  Lock, 
  Key, 
  Settings, 
  Info,
  CheckCircle,
} from 'lucide-react';

interface ProviderConfigProps {
  provider: string;
  config: any;
  onChange: (config: any) => void;
  envOverrides?: Record<string, string>;
  showSecurityIndicators?: boolean;
}

const ProviderConfig: React.FC<ProviderConfigProps> = ({
  provider,
  config,
  onChange,
  envOverrides = {},
  showSecurityIndicators = true,
}) => {
  const [showSensitiveData, setShowSensitiveData] = useState<Record<string, boolean>>({});

  const handleChange = (field: string, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const toggleSensitiveData = (field: string) => {
    setShowSensitiveData(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const isEnvironmentOverride = (field: string) => {
    const envKey = `${provider.toUpperCase()}_${field.toUpperCase()}`;
    return envOverrides[envKey] !== undefined;
  };

  const getSensitiveFieldType = (field: string) => {
    const sensitiveFields = [
      'token', 'apiKey', 'botToken', 'appToken', 'signingSecret', 
      'accessToken', 'clientSecret', 'password', 'secret',
    ];
    return sensitiveFields.some(sensitive => 
      field.toLowerCase().includes(sensitive.toLowerCase()),
    );
  };

  const renderField = (
    key: string,
    label: string,
    value: any,
    type: 'text' | 'password' | 'number' | 'select' | 'textarea' = 'text',
    options: { value: string; label: string }[] = [],
    helperText?: string,
    placeholder?: string,
  ) => {
    const isSensitive = getSensitiveFieldType(key);
    const isEnvOverride = isEnvironmentOverride(key);
    const isPassword = type === 'password' || (isSensitive && type === 'text');
    const showData = showSensitiveData[key];

    return (
      <div className="form-control w-full" key={key}>
        <label className="label">
          <span className="label-text flex items-center gap-2">
            {label}
            {isSensitive && (
              <Tooltip content="This field contains sensitive data">
                <Shield className="w-4 h-4 text-warning" />
              </Tooltip>
            )}
            {isEnvOverride && (
              <Tooltip content={`This field is controlled by environment variable: ${Object.keys(envOverrides).find(k => k.toLowerCase().includes(key.toLowerCase())) || ''}`}>
                <Lock className="w-4 h-4 text-info" />
              </Tooltip>
            )}
          </span>
          {isSensitive && (
            <span className="label-text-alt">
              <div className="tooltip tooltip-left" data-tip={showData ? 'Hide sensitive data' : 'Show sensitive data'}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => toggleSensitiveData(key)}
                  aria-label={showData ? 'Hide sensitive data' : 'Show sensitive data'}
                >
                  {showData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </span>
          )}
        </label>
        
        {type === 'select' ? (
          <Select
            options={options}
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={isEnvOverride}
            placeholder={placeholder}
            className={isEnvOverride ? 'bg-base-200' : ''}
          />
        ) : type === 'textarea' ? (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={isEnvOverride}
            placeholder={placeholder}
            rows={3}
            className={isEnvOverride ? 'bg-base-200' : ''}
          />
        ) : (
          <div className="input-group">
            <Input
              type={isPassword && !showData ? 'password' : type}
              value={value || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              disabled={isEnvOverride}
              placeholder={placeholder}
              className={`${isEnvOverride ? 'bg-base-200' : ''} flex-1`}
            />
            {isSensitive && (
              <div className="tooltip tooltip-left" data-tip={showData ? 'Hide sensitive data' : 'Show sensitive data'}>
                <button
                  type="button"
                  className="btn btn-square"
                  onClick={() => toggleSensitiveData(key)}
                  aria-label={showData ? 'Hide sensitive data' : 'Show sensitive data'}
                >
                  {showData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        )}
        
        <label className="label">
          <span className="label-text-alt">
            {helperText}
            {isEnvOverride && (
              <span className="badge badge-info badge-xs ml-2">
                Environment Override
              </span>
            )}
          </span>
        </label>
      </div>
    );
  };

  const getProviderSections = () => {
    switch (provider) {
    case 'discord':
      return [
        {
          title: 'Discord Configuration',
          icon: <Settings className="w-5 h-5" />,
          fields: [
            { key: 'token', label: 'Bot Token', type: 'password', helperText: 'Discord bot token from Developer Portal' },
            { key: 'clientId', label: 'Client ID', helperText: 'Application ID from Discord Developer Portal' },
            { key: 'guildId', label: 'Guild ID', helperText: 'Server ID where bot will operate' },
            { key: 'channelId', label: 'Channel ID', helperText: 'Default text channel ID' },
            { key: 'voiceChannelId', label: 'Voice Channel ID', helperText: 'Voice channel for audio features' },
          ],
        },
      ];

    case 'slack':
      return [
        {
          title: 'Slack Configuration',
          icon: <Settings className="w-5 h-5" />,
          fields: [
            { key: 'botToken', label: 'Bot Token', type: 'password', helperText: 'Bot token from Slack App settings' },
            { key: 'appToken', label: 'App Token', type: 'password', helperText: 'App-level token for Socket Mode' },
            { key: 'signingSecret', label: 'Signing Secret', type: 'password', helperText: 'Required for webhook verification' },
            { key: 'defaultChannelId', label: 'Default Channel ID', helperText: 'Default channel ID (e.g., C08BC0X4DFD)' },
            { 
              key: 'mode', 
              label: 'Mode', 
              type: 'select', 
              options: [
                { value: 'socket', label: 'Socket Mode' },
                { value: 'rtm', label: 'RTM Mode' },
              ],
              helperText: 'Connection method for Slack',
            },
            { key: 'channels', label: 'Channels to Join', type: 'textarea', helperText: 'Comma-separated channel IDs bot should join', placeholder: 'C1234567890, C0987654321' },
          ],
        },
      ];

    case 'mattermost':
      return [
        {
          title: 'Mattermost Configuration',
          icon: <Settings className="w-5 h-5" />,
          fields: [
            { key: 'url', label: 'Server URL', helperText: 'Your Mattermost server URL (e.g., https://mattermost.example.com)', placeholder: 'https://mattermost.example.com' },
            { key: 'accessToken', label: 'Access Token', type: 'password', helperText: 'Personal access token from Mattermost' },
            { key: 'teamId', label: 'Team ID', helperText: 'Team ID where bot will operate' },
            { key: 'channel', label: 'Default Channel', helperText: 'Default channel name' },
            { key: 'channelId', label: 'Channel ID', helperText: 'Default channel ID' },
          ],
        },
      ];

    case 'openai':
      return [
        {
          title: 'OpenAI Configuration',
          icon: <Key className="w-5 h-5" />,
          fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', helperText: 'OpenAI API key' },
            { key: 'model', label: 'Model', helperText: 'OpenAI model to use', placeholder: 'gpt-4' },
            { key: 'baseUrl', label: 'Base URL', helperText: 'OpenAI API base URL', placeholder: 'https://api.openai.com/v1' },
            { key: 'temperature', label: 'Temperature', type: 'number', helperText: 'Controls randomness (0-2)' },
            { key: 'maxTokens', label: 'Max Tokens', type: 'number', helperText: 'Maximum tokens in response' },
          ],
        },
      ];

    case 'flowise':
      return [
        {
          title: 'Flowise Configuration',
          icon: <Settings className="w-5 h-5" />,
          fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', helperText: 'Flowise API key' },
            { key: 'apiUrl', label: 'API URL', helperText: 'Flowise API base URL', placeholder: 'http://localhost:3000/api/v1' },
            { key: 'chatflowId', label: 'Chatflow ID', helperText: 'Specific chatflow ID to use' },
          ],
        },
      ];

    case 'openwebui':
      return [
        {
          title: 'OpenWebUI Configuration',
          icon: <Settings className="w-5 h-5" />,
          fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', helperText: 'OpenWebUI API key' },
            { key: 'apiUrl', label: 'API URL', helperText: 'OpenWebUI API base URL', placeholder: 'http://localhost:3000/api' },
            { key: 'model', label: 'Model', helperText: 'Model to use in OpenWebUI' },
          ],
        },
      ];

    case 'openswarm':
      return [
        {
          title: 'OpenSwarm Configuration',
          icon: <Settings className="w-5 h-5" />,
          fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', helperText: 'OpenSwarm API key', placeholder: 'dummy-key' },
            { key: 'apiUrl', label: 'API URL', helperText: 'OpenSwarm API base URL', placeholder: 'http://localhost:8000/v1' },
            { key: 'team', label: 'Team', helperText: 'Team name (used as model)', placeholder: 'default-team' },
            { key: 'swarmId', label: 'Swarm ID', helperText: 'Swarm ID to connect to' },
          ],
        },
      ];

    default:
      return [];
    }
  };

  const sections = getProviderSections();
  const hasEnvOverrides = Object.keys(envOverrides).length > 0;

  return (
    <div className="space-y-4">
      {hasEnvOverrides && showSecurityIndicators && (
        <Alert severity="info" className="alert-info">
          <Info className="w-4 h-4" />
          <div>
            <div className="font-bold">Environment Variable Overrides Active</div>
            <div className="text-xs">Some fields are controlled by environment variables and cannot be modified here.</div>
          </div>
        </Alert>
      )}

      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-xl font-medium flex items-center gap-2">
            {section.icon}
            {section.title}
          </div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {section.fields.map(field => 
                renderField(
                  field.key,
                  field.label,
                  (config as any)[field.key],
                  field.type as any,
                  field.options,
                  field.helperText,
                  field.placeholder,
                ),
              )}
            </div>
          </div>
        </div>
      ))}

      {Object.keys(envOverrides).length > 0 && (
        <Card className="bg-info/10 border-info/20">
          <div className="card-body">
            <h3 className="card-title text-info">
              <Shield className="w-5 h-5" />
              Security Information
            </h3>
            <div className="text-sm">
              <p className="mb-2">This provider configuration is partially controlled by environment variables:</p>
              <div className="space-y-1">
                {Object.entries(envOverrides)
                  .filter(([key]) => key.startsWith(provider.toUpperCase()))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <Lock className="w-3 h-3" />
                      <code className="bg-base-300 px-2 py-1 rounded">{key}</code>
                      <span className="text-base-content/60">= ••••••••</span>
                      <CheckCircle className="w-3 h-3 text-success" />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProviderConfig;