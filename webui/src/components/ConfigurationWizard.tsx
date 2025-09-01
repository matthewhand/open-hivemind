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
  Divider,
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
  discordToken?: string;
  slackToken?: string;
  openaiKey?: string;
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
              API Credentials
            </Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Credentials are encrypted and stored securely. They will not be visible in the UI.
            </Alert>
            <Grid container spacing={3}>
              {wizardData.messageProvider === 'discord' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Discord Bot Token"
                    type="password"
                    value={wizardData.discordToken || ''}
                    onChange={(e) => setWizardData(prev => ({ ...prev, discordToken: e.target.value }))}
                    helperText="Get this from Discord Developer Portal"
                    required
                  />
                </Grid>
              )}
              {wizardData.messageProvider === 'slack' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Slack Bot Token"
                    type="password"
                    value={wizardData.slackToken || ''}
                    onChange={(e) => setWizardData(prev => ({ ...prev, slackToken: e.target.value }))}
                    helperText="Get this from Slack App settings"
                    required
                  />
                </Grid>
              )}
              {wizardData.llmProvider === 'openai' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="OpenAI API Key"
                    type="password"
                    value={wizardData.openaiKey || ''}
                    onChange={(e) => setWizardData(prev => ({ ...prev, openaiKey: e.target.value }))}
                    helperText="Get this from OpenAI API settings"
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