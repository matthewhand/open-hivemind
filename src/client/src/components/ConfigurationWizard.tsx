import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Stepper,
  Button,
  Card,
  Input,
  Select,
  Alert,
  Grid,
  FormControl,
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

const NextIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const BackIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                  <Select
                    className="select select-bordered w-full"
                    value={wizardData.messageProvider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardData(prev => ({ ...prev, messageProvider: e.target.value }))}
                    required
                  >
                    <option value="">Select a provider</option>
                    <option value="discord">Discord</option>
                    <option value="slack">Slack</option>
                    <option value="mattermost">Mattermost</option>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <label className="label">
                    <span className="label-text">LLM Provider *</span>
                  </label>
                  <Select
                    className="select select-bordered w-full"
                    value={wizardData.llmProvider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardData(prev => ({ ...prev, llmProvider: e.target.value }))}
                    required
                  >
                    <option value="">Select a provider</option>
                    <option value="openai">OpenAI</option>
                    <option value="flowise">Flowise</option>
                    <option value="openwebui">OpenWebUI</option>
                  </Select>
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
            <Alert 
              status="info" 
              message="Configure platform-specific settings and credentials. Sensitive data is encrypted."
            />
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
                    <TextField
                      fullWidth
                      label="Guild ID"
                      value={wizardData.discordGuildId || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, discordGuildId: e.target.value }))}
                      helperText="Optional: Server ID where bot will operate"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Default Channel ID"
                      value={wizardData.discordChannelId || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, discordChannelId: e.target.value }))}
                      helperText="Optional: Default text channel ID"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Voice Channel ID"
                      value={wizardData.discordVoiceChannelId || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, discordVoiceChannelId: e.target.value }))}
                      helperText="Optional: Voice channel for audio features"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max Message Length"
                      type="number"
                      value={wizardData.discordMaxMessageLength || 2000}
                      onChange={(e) => setWizardData(prev => ({ ...prev, discordMaxMessageLength: parseInt(e.target.value) }))}
                      helperText="Maximum characters per message (default: 2000)"
                    />
                  </Grid>
                </>
              )}
              {wizardData.messageProvider === 'slack' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Slack Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Slack Bot Token"
                      type="password"
                      value={wizardData.slackToken || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, slackToken: e.target.value }))}
                      helperText="Required: Bot token from Slack App settings"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Slack App Token"
                      type="password"
                      value={wizardData.slackAppToken || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, slackAppToken: e.target.value }))}
                      helperText="Optional: App-level token for Socket Mode"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Slack Signing Secret"
                      type="password"
                      value={wizardData.slackSigningSecret || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, slackSigningSecret: e.target.value }))}
                      helperText="Required for webhook verification"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Default Channel ID"
                      value={wizardData.slackDefaultChannelId || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, slackDefaultChannelId: e.target.value }))}
                      helperText="Optional: Default channel ID (e.g., C08BC0X4DFD)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Channels to Join"
                      value={wizardData.slackJoinChannels || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, slackJoinChannels: e.target.value }))}
                      helperText="Optional: Comma-separated channel IDs bot should join"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Slack Mode</InputLabel>
                      <Select
                        value={wizardData.slackMode || 'socket'}
                        onChange={(e) => setWizardData(prev => ({ ...prev, slackMode: e.target.value }))}
                      >
                        <MenuItem value="socket">Socket Mode</MenuItem>
                        <MenuItem value="webhook">Webhook Mode</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              {wizardData.messageProvider === 'mattermost' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Mattermost Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Mattermost Server URL"
                      value={wizardData.mattermostServerUrl || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, mattermostServerUrl: e.target.value }))}
                      helperText="Required: Your Mattermost server URL (e.g., https://mattermost.example.com)"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Mattermost Token"
                      type="password"
                      value={wizardData.mattermostToken || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, mattermostToken: e.target.value }))}
                      helperText="Required: Personal access token from Mattermost"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Default Channel"
                      value={wizardData.mattermostChannel || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, mattermostChannel: e.target.value }))}
                      helperText="Optional: Default channel name"
                    />
                  </Grid>
                </>
              )}
              {wizardData.llmProvider === 'openai' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="OpenAI API Key"
                    type="password"
                    value={wizardData.openaiKey || ''}
                    onChange={(e) => setWizardData(prev => ({ ...prev, openaiKey: e.target.value }))}
                    helperText="Required: Get this from OpenAI API settings"
                    required
                  />
                </Grid>
              )}
              {wizardData.llmProvider === 'flowise' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Flowise API Key"
                    type="password"
                    value={wizardData.flowiseApiKey || ''}
                    onChange={(e) => setWizardData(prev => ({ ...prev, flowiseApiKey: e.target.value }))}
                    helperText="Required: API key for Flowise integration"
                    required
                  />
                </Grid>
              )}
              {wizardData.llmProvider === 'openwebui' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="OpenWebUI API Key"
                    type="password"
                    value={wizardData.openwebuiApiKey || ''}
                    onChange={(e) => setWizardData(prev => ({ ...prev, openwebuiApiKey: e.target.value }))}
                    helperText="Required: API key for OpenWebUI integration"
                    required
                  />
                </Grid>
              )}
            </Grid>
          </div>
        );

      case 'environment':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Deployment Options
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Target Environment</InputLabel>
                  <Select
                    value={wizardData.environment}
                    onChange={(e) => setWizardData(prev => ({ ...prev, environment: e.target.value }))}
                  >
                    <MenuItem value="development">Development</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 'review':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configuration Review
            </Typography>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Bot Configuration Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Bot Name</Typography>
                  <Typography variant="body1">{wizardData.botName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Environment</Typography>
                  <Chip label={wizardData.environment} color="primary" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Message Provider</Typography>
                  <Typography variant="body1">{wizardData.messageProvider}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">LLM Provider</Typography>
                  <Typography variant="body1">{wizardData.llmProvider}</Typography>
                </Grid>
              </Grid>
            </Paper>
            <Alert severity="info">
              Clicking "Deploy" will create the bot and apply the configuration immediately.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuration Wizard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Step-by-step guided setup for your Open-Hivemind bot
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.id} completed={completed.has(index)}>
            <StepLabel
              onClick={() => handleStepClick(index)}
              sx={{ cursor: completed.has(index) || index <= activeStep ? 'pointer' : 'default' }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                {step.icon}
                <Box>
                  <Typography variant="subtitle2">{step.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      <Box display="flex" justifyContent="space-between" sx={{ mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          startIcon={<BackIcon />}
        >
          Back
        </Button>
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleDeploy}
              disabled={loading}
              startIcon={<DeployIcon />}
            >
              {loading ? 'Deploying...' : 'Deploy Bot'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<NextIcon />}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default ConfigurationWizard;