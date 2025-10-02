import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Input,
  Grid,
  FormControl,
  Select,
} from '../components/DaisyUI';

// Inline SVG icons to replace MUI icons
const DeployIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v14" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7 7 7" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 21h14" />
  </svg>
);

const SettingsIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SecurityIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const StorageIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
import { apiService } from '../services/api';
import type { Bot } from '../services/api';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

interface WizardData {
  botName: string;
  messageProvider: string;
  llmProvider: string;
  // Discord settings
  discordToken?: string;
  discordClientId?: string;
  discordGuildId?: string;
  discordChannelId?: string;
  discordVoiceChannelId?: string;
  discordMaxMessageLength?: number;
  // Slack settings
  slackToken?: string;
  slackAppToken?: string;
  slackSigningSecret?: string;
  slackJoinChannels?: string;
  slackDefaultChannelId?: string;
  slackMode?: string;
  // Mattermost settings
  mattermostServerUrl?: string;
  mattermostToken?: string;
  mattermostChannel?: string;
  // LLM settings
  openaiKey?: string;
  flowiseApiKey?: string;
  openwebuiApiKey?: string;
  environment: string;
  autoDeploy: boolean;
  notifications: boolean;
}

const steps: WizardStep[] = [
  {
    id: 'basics',
    title: 'Basic Setup',
    description: 'Configure basic bot information',
    icon: <SettingsIcon />,
    required: true,
  },
  {
    id: 'providers',
    title: 'Service Providers',
    description: 'Select message and LLM providers',
    icon: <StorageIcon />,
    required: true,
  },
  {
    id: 'credentials',
    title: 'Credentials',
    description: 'Configure API keys and tokens',
    icon: <SecurityIcon />,
    required: true,
  },
  {
    id: 'environment',
    title: 'Environment',
    description: 'Configure deployment environment',
  icon: <DeployIcon />,
    required: false,
  },
  {
    id: 'review',
    title: 'Review & Deploy',
    description: 'Review configuration and deploy',
    icon: <CheckIcon />,
    required: true,
  },
];

const ConfigurationWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [wizardData, setWizardData] = useState<WizardData>({
    botName: '',
    messageProvider: '',
    llmProvider: '',
    environment: 'development',
    autoDeploy: false,
    notifications: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingBots, setExistingBots] = useState<Bot[]>([]);

  useEffect(() => {
    loadExistingBots();
  }, []);

  const loadExistingBots = async () => {
    try {
      const response = await apiService.getConfig();
      setExistingBots(response.bots);
    } catch (err) {
      console.error('Failed to load existing bots:', err);
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCompleted(prev => new Set([...prev, activeStep]));
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleStepClick = (stepIndex: number) => {
    if (completed.has(stepIndex) || stepIndex <= activeStep) {
      setActiveStep(stepIndex);
    }
  };

  const validateCurrentStep = (): boolean => {
    const step = steps[activeStep];

    switch (step.id) {
      case 'basics':
        if (!wizardData.botName.trim()) {
          setError('Bot name is required');
          return false;
        }
        if (existingBots.some(bot => bot.name === wizardData.botName)) {
          setError('Bot name already exists');
          return false;
        }
        break;

      case 'providers':
        if (!wizardData.messageProvider) {
          setError('Message provider is required');
          return false;
        }
        if (!wizardData.llmProvider) {
          setError('LLM provider is required');
          return false;
        }
        break;

      case 'credentials':
        if (wizardData.messageProvider === 'discord' && !wizardData.discordToken) {
          setError('Discord token is required');
          return false;
        }
        if (wizardData.messageProvider === 'slack' && !wizardData.slackToken) {
          setError('Slack token is required');
          return false;
        }
        if (wizardData.llmProvider === 'openai' && !wizardData.openaiKey) {
          setError('OpenAI API key is required');
          return false;
        }
        break;
    }

    setError(null);
    return true;
  };

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create the bot configuration
      const botConfig = {
        name: wizardData.botName,
        messageProvider: wizardData.messageProvider,
        llmProvider: wizardData.llmProvider,
        environment: wizardData.environment,
        discord: wizardData.messageProvider === 'discord' ? {
          token: wizardData.discordToken,
        } : undefined,
        slack: wizardData.messageProvider === 'slack' ? {
          botToken: wizardData.slackToken,
        } : undefined,
        openai: wizardData.llmProvider === 'openai' ? {
          apiKey: wizardData.openaiKey,
        } : undefined,
      };

      // Apply the configuration using hot reload
      const response = await fetch('/webui/api/config/hot-reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create',
          botName: wizardData.botName,
          changes: botConfig
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Bot "${wizardData.botName}" created and deployed successfully!`);
        setCompleted(prev => new Set([...prev, activeStep]));
        setActiveStep(steps.length);
      } else {
        setError(result.message || 'Failed to deploy bot');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy bot');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (stepIndex: number) => {
    const step = steps[stepIndex];

    switch (step.id) {
      case 'basics':
        return (
          <div className="mt-6">
            <Typography variant="h6" className="mb-4">
              Basic Bot Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <label className="label">
                    <span className="label-text">Bot Name *</span>
                  </label>
                  <Input
                    className="input input-bordered w-full"
                    placeholder="Enter bot name"
                    value={wizardData.botName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, botName: e.target.value }))}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt">Unique name for your bot</span>
                  </label>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <label className="label">
                    <span className="label-text">Environment</span>
                  </label>
                  <Select
                    className="select select-bordered w-full"
                    value={wizardData.environment}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardData(prev => ({ ...prev, environment: e.target.value }))}
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </div>
        );

      case 'providers':
        return (
          <div className="mt-6">
            <Typography variant="h6" className="mb-4">
              Service Providers
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <label className="label">
                    <span className="label-text">Message Provider *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={wizardData.messageProvider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardData(prev => ({ ...prev, messageProvider: e.target.value }))}
                    required
                  >
                    <option value="">Select a provider</option>
                    <option value="discord">Discord</option>
                    <option value="slack">Slack</option>
                    <option value="mattermost">Mattermost</option>
                  </select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <label className="label">
                    <span className="label-text">LLM Provider *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={wizardData.llmProvider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardData(prev => ({ ...prev, llmProvider: e.target.value }))}
                    required
                  >
                    <option value="">Select a provider</option>
                    <option value="openai">OpenAI</option>
                    <option value="flowise">Flowise</option>
                    <option value="openwebui">OpenWebUI</option>
                  </select>
                </FormControl>
              </Grid>
            </Grid>
          </div>
        );

      case 'credentials':
        return (
          <div className="mt-6">
            <Typography variant="h6" className="mb-4">
              Platform Configuration
            </Typography>
            <div role="alert" className="alert alert-info mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Configure platform-specific settings and credentials. Sensitive data is encrypted.</span>
            </div>
            <Grid container spacing={3}>
              {wizardData.messageProvider === 'discord' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" className="mt-4 mb-2">
                      Discord Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Discord Bot Token *</span>
                      </label>
                      <Input
                        type="password"
                        className="input input-bordered w-full"
                        placeholder="Enter Discord bot token"
                        value={wizardData.discordToken || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, discordToken: e.target.value }))}
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">Required: Bot token from Discord Developer Portal</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Discord Client ID</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="Enter Discord client ID"
                        value={wizardData.discordClientId || ''}
                        onChange={(e) => setWizardData(prev => ({ ...prev, discordClientId: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: Application ID from Discord Developer Portal</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Guild ID</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="Enter Discord server ID"
                        value={wizardData.discordGuildId || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, discordGuildId: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: Server ID where bot will operate</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Default Channel ID</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="Enter default text channel ID"
                        value={wizardData.discordChannelId || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, discordChannelId: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: Default text channel ID</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Voice Channel ID</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="Enter voice channel ID"
                        value={wizardData.discordVoiceChannelId || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, discordVoiceChannelId: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: Voice channel for audio features</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Max Message Length</span>
                      </label>
                      <Input
                        type="number"
                        className="input input-bordered w-full"
                        placeholder="2000"
                        value={wizardData.discordMaxMessageLength || 2000}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, discordMaxMessageLength: parseInt(e.target.value) }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Maximum characters per message (default: 2000)</span>
                      </label>
                    </FormControl>
                  </Grid>
                </>
              )}
              {wizardData.messageProvider === 'slack' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" className="mt-4 mb-2">
                      Slack Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Slack Bot Token *</span>
                      </label>
                      <Input
                        type="password"
                        className="input input-bordered w-full"
                        placeholder="Enter Slack bot token"
                        value={wizardData.slackToken || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, slackToken: e.target.value }))}
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">Required: Bot token from Slack App settings</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Slack App Token</span>
                      </label>
                      <Input
                        type="password"
                        className="input input-bordered w-full"
                        placeholder="Enter Slack app token"
                        value={wizardData.slackAppToken || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, slackAppToken: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: App-level token for Socket Mode</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Slack Signing Secret</span>
                      </label>
                      <Input
                        type="password"
                        className="input input-bordered w-full"
                        placeholder="Enter Slack signing secret"
                        value={wizardData.slackSigningSecret || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, slackSigningSecret: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Required for webhook verification</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Default Channel ID</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="Enter default channel ID"
                        value={wizardData.slackDefaultChannelId || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, slackDefaultChannelId: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: Default channel ID (e.g., C08BC0X4DFD)</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Channels to Join</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="Enter comma-separated channel IDs"
                        value={wizardData.slackJoinChannels || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, slackJoinChannels: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: Comma-separated channel IDs bot should join</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Slack Mode</span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={wizardData.slackMode || 'socket'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardData(prev => ({ ...prev, slackMode: e.target.value }))}
                      >
                        <option value="socket">Socket Mode</option>
                        <option value="webhook">Webhook Mode</option>
                      </select>
                    </FormControl>
                  </Grid>
                </>
              )}
              {wizardData.messageProvider === 'mattermost' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" className="mt-4 mb-2">
                      Mattermost Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Mattermost Server URL *</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="https://mattermost.example.com"
                        value={wizardData.mattermostServerUrl || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, mattermostServerUrl: e.target.value }))}
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">Required: Your Mattermost server URL (e.g., https://mattermost.example.com)</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Mattermost Token *</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        type="password"
                        placeholder="Your Mattermost access token"
                        value={wizardData.mattermostToken || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, mattermostToken: e.target.value }))}
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">Required: Personal access token from Mattermost</span>
                      </label>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <label className="label">
                        <span className="label-text">Default Channel</span>
                      </label>
                      <Input
                        className="input input-bordered w-full"
                        placeholder="town-square"
                        value={wizardData.mattermostChannel || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, mattermostChannel: e.target.value }))}
                      />
                      <label className="label">
                        <span className="label-text-alt">Optional: Default channel name</span>
                      </label>
                    </FormControl>
                  </Grid>
                </>
              )}
              {wizardData.llmProvider === 'openai' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <label className="label">
                      <span className="label-text">OpenAI API Key *</span>
                    </label>
                    <Input
                      className="input input-bordered w-full"
                      type="password"
                      placeholder="sk-..."
                      value={wizardData.openaiKey || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, openaiKey: e.target.value }))}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt">Required: Get this from OpenAI API settings</span>
                    </label>
                  </FormControl>
                </Grid>
              )}
              {wizardData.llmProvider === 'flowise' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <label className="label">
                      <span className="label-text">Flowise API Key *</span>
                    </label>
                    <Input
                      className="input input-bordered w-full"
                      type="password"
                      placeholder="Your Flowise API key"
                      value={wizardData.flowiseApiKey || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, flowiseApiKey: e.target.value }))}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt">Required: API key for Flowise integration</span>
                    </label>
                  </FormControl>
                </Grid>
              )}
              {wizardData.llmProvider === 'openwebui' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <label className="label">
                      <span className="label-text">OpenWebUI API Key *</span>
                    </label>
                    <Input
                      className="input input-bordered w-full"
                      type="password"
                      placeholder="Your OpenWebUI API key"
                      value={wizardData.openwebuiApiKey || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardData(prev => ({ ...prev, openwebuiApiKey: e.target.value }))}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt">Required: API key for OpenWebUI integration</span>
                    </label>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </div>
        );

      case 'environment':
        return (
          <div className="mt-6">
            <Typography variant="h6" gutterBottom>
              Deployment Options
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <label className="label">
                    <span className="label-text">Target Environment</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={wizardData.environment}
                    onChange={(e) => setWizardData(prev => ({ ...prev, environment: e.target.value }))}
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </FormControl>
              </Grid>
            </Grid>
          </div>
        );

      case 'review':
        return (
          <div className="mt-6">
            <Typography variant="h6" gutterBottom>
              Configuration Review
            </Typography>
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body">
                <Typography variant="h6" gutterBottom>
                  Bot Configuration Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" className="text-base-content/70">Bot Name</Typography>
                    <Typography variant="body1">{wizardData.botName}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" className="text-base-content/70">Environment</Typography>
                    <div className="badge badge-primary badge-sm">{wizardData.environment}</div>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" className="text-base-content/70">Message Provider</Typography>
                    <Typography variant="body1">{wizardData.messageProvider}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" className="text-base-content/70">LLM Provider</Typography>
                    <Typography variant="body1">{wizardData.llmProvider}</Typography>
                  </Grid>
                </Grid>
              </div>
            </div>
            <div role="alert" className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Clicking "Deploy" will create the bot and apply the configuration immediately.</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" className="mt-16 mb-16">
      <Typography variant="h4" component="h1" gutterBottom>
        Configuration Wizard
      </Typography>
      <Typography variant="body1" className="text-base-content/70 mb-16">
        Step-by-step guided setup for your Open-Hivemind bot
      </Typography>

      <div className="steps steps-vertical lg:steps-horizontal mb-16">
        {steps.map((step, index) => (
          <div key={step.id} className={`step ${index <= activeStep ? 'step-primary' : ''}`}>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleStepClick(index)}>
              {step.icon}
              <div>
                <Typography variant="subtitle2">{step.title}</Typography>
                <Typography variant="caption" className="text-base-content/70">
                  {step.description}
                </Typography>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="alert" className="alert alert-success mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{success}</span>
        </div>
      )}

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {renderStepContent(activeStep)}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button
          className="btn btn-outline"
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <div>
          {activeStep === steps.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={handleDeploy}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9z" />
              </svg>
              {loading ? 'Deploying...' : 'Deploy Bot'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleNext}
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 ml-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Container>
  );
};

export default ConfigurationWizard;