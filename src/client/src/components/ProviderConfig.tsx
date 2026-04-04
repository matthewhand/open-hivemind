/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheckCircle, Eye, EyeOff, Info, Key, Lock, Settings, Shield, ExternalLink, HelpCircle } from 'lucide-react';
import React, { useState } from 'react';
import { Alert } from './DaisyUI/Alert';
import { Badge } from './DaisyUI/Badge';
import Card from './DaisyUI/Card';
import Input from './DaisyUI/Input';
import Select from './DaisyUI/Select';
import Textarea from './DaisyUI/Textarea';
import Tooltip from './DaisyUI/Tooltip';

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
    setShowSensitiveData((prev) => ({
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
      'token',
      'apiKey',
      'botToken',
      'appToken',
      'signingSecret',
      'accessToken',
      'clientSecret',
      'password',
      'secret',
    ];
    return sensitiveFields.some((sensitive) =>
      field.toLowerCase().includes(sensitive.toLowerCase())
    );
  };

  const _renderHelpLink = (url: string, text: string) => (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {text}
      <ExternalLink className="w-3 h-3" />
    </a>
  );

  const renderField = (
    key: string,
    label: string,
    value: any,
    type: 'text' | 'password' | 'number' | 'select' | 'textarea' = 'text',
    options: { value: string; label: string }[] = [],
    helperText?: string,
    placeholder?: string,
    helpUrl?: string
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
            {helpUrl && (
              <Tooltip content="Click for help documentation">
                <a
                  href={helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-info hover:text-info-focus"
                >
                  <HelpCircle className="w-4 h-4" />
                </a>
              </Tooltip>
            )}
            {isSensitive && (
              <Tooltip content="This field contains sensitive data">
                <Shield className="w-4 h-4 text-warning" />
              </Tooltip>
            )}
            {isEnvOverride && (
              <Tooltip
                content={`This field is controlled by environment variable: ${Object.keys(envOverrides).find((k) => k.toLowerCase().includes(key.toLowerCase())) || ''}`}
              >
                <Lock className="w-4 h-4 text-info" />
              </Tooltip>
            )}
          </span>
          {isSensitive && (
            <span className="label-text-alt">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => toggleSensitiveData(key)}
                aria-label={showData ? `Hide ${label}` : `Show ${label}`}
              >
                {showData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
              <button
                type="button"
                className="btn btn-square"
                onClick={() => toggleSensitiveData(key)}
                aria-label={showData ? `Hide ${label}` : `Show ${label}`}
              >
                {showData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        <label className="label">
          <span className="label-text-alt">
            {helperText}
            {isEnvOverride && (
              <Badge variant="info" size="xs" className="ml-2">Environment Override</Badge>
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
            helpSection: {
              title: 'Need help setting up Discord?',
              links: [
                { text: 'Create a Discord Bot', url: 'https://discord.com/developers/applications' },
                { text: 'Get Bot Token', url: 'https://discord.com/developers/docs/topics/oauth2#bots' },
                { text: 'Find Guild/Channel IDs', url: 'https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-' },
              ],
            },
            fields: [
              {
                key: 'token',
                label: 'Bot Token',
                type: 'password',
                helperText: 'Discord bot token from Developer Portal',
                helpUrl: 'https://discord.com/developers/docs/topics/oauth2#bots',
              },
              {
                key: 'clientId',
                label: 'Client ID',
                helperText: 'Application ID from Discord Developer Portal',
                helpUrl: 'https://discord.com/developers/applications',
              },
              {
                key: 'guildId',
                label: 'Guild ID',
                helperText: 'Server ID where bot will operate (Enable Developer Mode in Discord settings to copy IDs)',
                helpUrl: 'https://support.discord.com/hc/en-us/articles/206346498',
              },
              {
                key: 'channelId',
                label: 'Channel ID',
                helperText: 'Default text channel ID (Right-click channel and select Copy ID)',
                helpUrl: 'https://support.discord.com/hc/en-us/articles/206346498',
              },
              {
                key: 'voiceChannelId',
                label: 'Voice Channel ID',
                helperText: 'Voice channel for audio features (Optional)',
              },
            ],
          },
        ];

      case 'slack':
        return [
          {
            title: 'Slack Configuration',
            icon: <Settings className="w-5 h-5" />,
            helpSection: {
              title: 'Need help setting up Slack?',
              links: [
                { text: 'Create a Slack App', url: 'https://api.slack.com/start/quickstart' },
                { text: 'Bot Token Setup', url: 'https://api.slack.com/authentication/token-types#bot' },
                { text: 'Socket Mode Guide', url: 'https://api.slack.com/apis/connections/socket' },
                { text: 'Find Channel IDs', url: 'https://slack.com/help/articles/221769328-Locate-your-Slack-URL-or-ID' },
              ],
            },
            fields: [
              {
                key: 'botToken',
                label: 'Bot Token',
                type: 'password',
                helperText: 'Bot User OAuth Token (starts with xoxb-)',
                helpUrl: 'https://api.slack.com/authentication/token-types#bot',
              },
              {
                key: 'appToken',
                label: 'App Token',
                type: 'password',
                helperText: 'App-level token for Socket Mode (starts with xapp-)',
                helpUrl: 'https://api.slack.com/apis/connections/socket',
              },
              {
                key: 'signingSecret',
                label: 'Signing Secret',
                type: 'password',
                helperText: 'Required for webhook verification (found in Basic Information)',
                helpUrl: 'https://api.slack.com/authentication/verifying-requests-from-slack',
              },
              {
                key: 'defaultChannelId',
                label: 'Default Channel ID',
                helperText: 'Default channel ID (e.g., C08BC0X4DFD)',
                helpUrl: 'https://slack.com/help/articles/221769328',
              },
              {
                key: 'mode',
                label: 'Mode',
                type: 'select',
                options: [
                  { value: 'socket', label: 'Socket Mode' },
                  { value: 'rtm', label: 'RTM Mode' },
                ],
                helperText: 'Socket Mode is recommended for most use cases',
                helpUrl: 'https://api.slack.com/apis/connections/socket',
              },
              {
                key: 'channels',
                label: 'Channels to Join',
                type: 'textarea',
                helperText: 'Comma-separated channel IDs bot should join',
                placeholder: 'C1234567890, C0987654321',
              },
            ],
          },
        ];

      case 'mattermost':
        return [
          {
            title: 'Mattermost Configuration',
            icon: <Settings className="w-5 h-5" />,
            helpSection: {
              title: 'Need help setting up Mattermost?',
              links: [
                { text: 'Bot Account Setup', url: 'https://developers.mattermost.com/integrate/reference/bot-accounts/' },
                { text: 'Personal Access Tokens', url: 'https://docs.mattermost.com/developer/personal-access-tokens.html' },
              ],
            },
            fields: [
              {
                key: 'url',
                label: 'Server URL',
                helperText: 'Your Mattermost server URL (e.g., https://mattermost.example.com)',
                placeholder: 'https://mattermost.example.com',
              },
              {
                key: 'accessToken',
                label: 'Access Token',
                type: 'password',
                helperText: 'Personal access token from Mattermost (User Settings > Security)',
                helpUrl: 'https://docs.mattermost.com/developer/personal-access-tokens.html',
              },
              {
                key: 'teamId',
                label: 'Team ID',
                helperText: 'Team ID where bot will operate (found in team URL)',
              },
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
            helpSection: {
              title: 'Need help setting up OpenAI?',
              links: [
                { text: 'Get API Key', url: 'https://platform.openai.com/api-keys' },
                { text: 'Available Models', url: 'https://platform.openai.com/docs/models' },
                { text: 'API Reference', url: 'https://platform.openai.com/docs/api-reference' },
              ],
            },
            fields: [
              {
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                helperText: 'OpenAI API key (starts with sk-)',
                helpUrl: 'https://platform.openai.com/api-keys',
              },
              {
                key: 'model',
                label: 'Model',
                helperText: 'OpenAI model to use (e.g., gpt-4, gpt-3.5-turbo)',
                placeholder: 'gpt-4',
                helpUrl: 'https://platform.openai.com/docs/models',
              },
              {
                key: 'baseUrl',
                label: 'Base URL',
                helperText: 'OpenAI API base URL (leave default unless using a proxy)',
                placeholder: 'https://api.openai.com/v1',
              },
              {
                key: 'temperature',
                label: 'Temperature',
                type: 'number',
                helperText: 'Controls randomness: 0 = deterministic, 2 = very creative',
                helpUrl: 'https://platform.openai.com/docs/api-reference/chat/create#chat-create-temperature',
              },
              {
                key: 'maxTokens',
                label: 'Max Tokens',
                type: 'number',
                helperText: 'Maximum tokens in response (leave empty for model default)',
                helpUrl: 'https://platform.openai.com/docs/api-reference/chat/create#chat-create-max_tokens',
              },
            ],
          },
        ];

      case 'flowise':
        return [
          {
            title: 'Flowise Configuration',
            icon: <Settings className="w-5 h-5" />,
            helpSection: {
              title: 'Need help setting up Flowise?',
              links: [
                { text: 'Flowise Documentation', url: 'https://docs.flowiseai.com/' },
                { text: 'API Configuration', url: 'https://docs.flowiseai.com/configuration/authorization' },
                { text: 'Getting Started', url: 'https://docs.flowiseai.com/getting-started' },
              ],
            },
            fields: [
              {
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                helperText: 'Flowise API key (set in Flowise settings)',
                helpUrl: 'https://docs.flowiseai.com/configuration/authorization',
              },
              {
                key: 'apiUrl',
                label: 'API URL',
                helperText: 'Flowise API base URL',
                placeholder: 'http://localhost:3000/api/v1',
                helpUrl: 'https://docs.flowiseai.com/getting-started',
              },
              {
                key: 'chatflowId',
                label: 'Chatflow ID',
                helperText: 'Specific chatflow ID to use (found in Flowise UI)',
                helpUrl: 'https://docs.flowiseai.com/',
              },
            ],
          },
        ];

      case 'openwebui':
        return [
          {
            title: 'OpenWebUI Configuration',
            icon: <Settings className="w-5 h-5" />,
            helpSection: {
              title: 'Need help setting up OpenWebUI?',
              links: [
                { text: 'OpenWebUI Documentation', url: 'https://docs.openwebui.com/' },
                { text: 'API Keys Setup', url: 'https://docs.openwebui.com/getting-started/' },
                { text: 'Installation Guide', url: 'https://docs.openwebui.com/getting-started/' },
              ],
            },
            fields: [
              {
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                helperText: 'OpenWebUI API key (generated in Settings > API Keys)',
                helpUrl: 'https://docs.openwebui.com/getting-started/',
              },
              {
                key: 'apiUrl',
                label: 'API URL',
                helperText: 'OpenWebUI API base URL',
                placeholder: 'http://localhost:3000/api',
                helpUrl: 'https://docs.openwebui.com/',
              },
              {
                key: 'model',
                label: 'Model',
                helperText: 'Model to use in OpenWebUI',
                helpUrl: 'https://docs.openwebui.com/',
              },
            ],
          },
        ];

      case 'openswarm':
        return [
          {
            title: 'OpenSwarm Configuration',
            icon: <Settings className="w-5 h-5" />,
            helpSection: {
              title: 'Need help setting up OpenSwarm?',
              links: [
                { text: 'OpenSwarm Documentation', url: 'https://openswarm.ai/docs' },
                { text: 'Getting Started', url: 'https://openswarm.ai/docs/getting-started' },
              ],
            },
            fields: [
              {
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                helperText: 'OpenSwarm API key (use "dummy-key" for local development)',
                placeholder: 'dummy-key',
                helpUrl: 'https://openswarm.ai/docs',
              },
              {
                key: 'apiUrl',
                label: 'API URL',
                helperText: 'OpenSwarm API base URL',
                placeholder: 'http://localhost:8000/v1',
                helpUrl: 'https://openswarm.ai/docs/getting-started',
              },
              {
                key: 'team',
                label: 'Team',
                helperText: 'Team name (used as model identifier)',
                placeholder: 'default-team',
              },
              {
                key: 'swarmId',
                label: 'Swarm ID',
                helperText: 'Swarm ID to connect to',
              },
            ],
          },
        ];

      case 'anthropic':
        return [
          {
            title: 'Anthropic Configuration',
            icon: <Key className="w-5 h-5" />,
            helpSection: {
              title: 'Need help setting up Anthropic?',
              links: [
                { text: 'Get API Key', url: 'https://console.anthropic.com/settings/keys' },
                { text: 'Available Models', url: 'https://docs.anthropic.com/en/docs/models-overview' },
                { text: 'API Reference', url: 'https://docs.anthropic.com/en/api/getting-started' },
              ],
            },
            fields: [
              {
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                helperText: 'Anthropic API key (starts with sk-ant-)',
                helpUrl: 'https://console.anthropic.com/settings/keys',
              },
              {
                key: 'model',
                label: 'Model',
                helperText: 'Claude model to use (e.g., claude-3-5-sonnet-20241022, claude-3-opus-20240229)',
                placeholder: 'claude-3-5-sonnet-20241022',
                helpUrl: 'https://docs.anthropic.com/en/docs/models-overview',
              },
              {
                key: 'baseUrl',
                label: 'Base URL',
                helperText: 'Anthropic API base URL (leave default unless using a proxy)',
                placeholder: 'https://api.anthropic.com',
              },
              {
                key: 'temperature',
                label: 'Temperature',
                type: 'number',
                helperText: 'Controls randomness: 0 = deterministic, 1 = creative',
                helpUrl: 'https://docs.anthropic.com/en/api/messages',
              },
              {
                key: 'maxTokens',
                label: 'Max Tokens',
                type: 'number',
                helperText: 'Maximum tokens in response (required for Anthropic)',
                helpUrl: 'https://docs.anthropic.com/en/api/messages',
              },
            ],
          },
        ];

      case 'telegram':
        return [
          {
            title: 'Telegram Configuration',
            icon: <Settings className="w-5 h-5" />,
            helpSection: {
              title: 'Need help setting up Telegram?',
              links: [
                { text: 'Create Bot with BotFather', url: 'https://core.telegram.org/bots/tutorial#getting-ready' },
                { text: 'Bot API Reference', url: 'https://core.telegram.org/bots/api' },
                { text: 'Getting Started', url: 'https://core.telegram.org/bots' },
              ],
            },
            fields: [
              {
                key: 'botToken',
                label: 'Bot Token',
                type: 'password',
                helperText: 'Bot token from BotFather (format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)',
                helpUrl: 'https://core.telegram.org/bots/tutorial#getting-ready',
              },
              {
                key: 'chatId',
                label: 'Chat ID',
                helperText: 'Default chat ID for bot messages (Optional)',
              },
              {
                key: 'webhookUrl',
                label: 'Webhook URL',
                helperText: 'Webhook URL for receiving updates (leave empty for polling mode)',
                placeholder: 'https://yourdomain.com/api/telegram/webhook',
                helpUrl: 'https://core.telegram.org/bots/api#setwebhook',
              },
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
            <div className="text-xs">
              Some fields are controlled by environment variables and cannot be modified here.
            </div>
          </div>
        </Alert>
      )}

      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" defaultChecked aria-label={`Toggle section ${section.title}`} />
          <div className="collapse-title text-xl font-medium flex items-center gap-2">
            {section.icon}
            {section.title}
          </div>
          <div className="collapse-content">
            {(section as any).helpSection && (
              <Card className="bg-primary/5 border-primary/20 mb-4">
                <div className="card-body p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    {(section as any).helpSection.title}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {(section as any).helpSection.links.map((link: any, idx: number) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {link.text}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {section.fields.map((field: any) =>
                renderField(
                  field.key,
                  field.label,
                  (config as any)[field.key],
                  field.type as any,
                  field.options,
                  field.helperText,
                  field.placeholder,
                  field.helpUrl
                )
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
              <p className="mb-2">
                This provider configuration is partially controlled by environment variables:
              </p>
              <div className="space-y-1">
                {Object.entries(envOverrides)
                  .filter(([key]) => key.startsWith(provider.toUpperCase()))
                  .map(([key, _value]) => (
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
