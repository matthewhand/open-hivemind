import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Check as CheckIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  CloudUpload as DeployIcon,
} from '@mui/icons-material';
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
    icon: <CloudUpload />,
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
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Bot Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bot Name"
                  value={wizardData.botName}
                  onChange={(e) => setWizardData(prev => ({ ...prev, botName: e.target.value }))}
                  helperText="Unique name for your bot"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Environment</InputLabel>
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

      case 'providers':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Service Providers
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Message Provider</InputLabel>
                  <Select
                    value={wizardData.messageProvider}
                    onChange={(e) => setWizardData(prev => ({ ...prev, messageProvider: e.target.value }))}
                  >
                    <MenuItem value="discord">Discord</MenuItem>
                    <MenuItem value="slack">Slack</MenuItem>
                    <MenuItem value="mattermost">Mattermost</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>LLM Provider</InputLabel>
                  <Select
                    value={wizardData.llmProvider}
                    onChange={(e) => setWizardData(prev => ({ ...prev, llmProvider: e.target.value }))}
                  >
                    <MenuItem value="openai">OpenAI</MenuItem>
                    <MenuItem value="flowise">Flowise</MenuItem>
                    <MenuItem value="openwebui">OpenWebUI</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 'credentials':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Platform Configuration
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Configure platform-specific settings and credentials. Sensitive data is encrypted.
            </Alert>
            <Grid container spacing={3}>
              {wizardData.messageProvider === 'discord' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Discord Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Discord Bot Token"
                      type="password"
                      value={wizardData.discordToken || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, discordToken: e.target.value }))}
                      helperText="Required: Bot token from Discord Developer Portal"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Discord Client ID"
                      value={wizardData.discordClientId || ''}
                      onChange={(e) => setWizardData(prev => ({ ...prev, discordClientId: e.target.value }))}
                      helperText="Optional: Application ID from Discord Developer Portal"
                    />
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
          </Box>
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