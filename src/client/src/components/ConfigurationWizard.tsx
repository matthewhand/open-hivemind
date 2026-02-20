/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Alert, Badge } from './DaisyUI';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ServerIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
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
  discordClientId?: string;
  discordGuildId?: string;
  slackToken?: string;
  slackAppToken?: string;
  mattermostServerUrl?: string;
  mattermostToken?: string;
  openaiKey?: string;
  flowiseApiKey?: string;
  openwebuiApiKey?: string;
  environment: string;
}

const steps: WizardStep[] = [
  { id: 'basics', title: 'Basic Setup', description: 'Configure basic bot information', icon: <Cog6ToothIcon className="w-5 h-5" />, required: true },
  { id: 'providers', title: 'Service Providers', description: 'Select message and LLM providers', icon: <ServerIcon className="w-5 h-5" />, required: true },
  { id: 'credentials', title: 'Credentials', description: 'Configure API keys and tokens', icon: <ShieldCheckIcon className="w-5 h-5" />, required: true },
  { id: 'review', title: 'Review & Deploy', description: 'Review configuration and deploy', icon: <CheckIcon className="w-5 h-5" />, required: true },
];

const ConfigurationWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [wizardData, setWizardData] = useState<WizardData>({
    botName: '',
    messageProvider: '',
    llmProvider: '',
    environment: 'development',
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

  const handleBack = () => setActiveStep(prev => prev - 1);

  const validateCurrentStep = (): boolean => {
    const step = steps[activeStep];
    const errors: string[] = [];

    switch (step.id) {
    case 'basics':
      if (!wizardData.botName.trim()) {errors.push('Bot name is required');}
      else if (wizardData.botName.length < 3) {errors.push('Bot name must be at least 3 characters');}
      else if (!/^[a-zA-Z0-9_-]+$/.test(wizardData.botName)) {errors.push('Bot name can only contain letters, numbers, hyphens, and underscores');}
      else if (existingBots.some(bot => bot.name === wizardData.botName)) {errors.push('Bot name already exists');}
      break;

    case 'providers':
      if (!wizardData.messageProvider) {errors.push('Message provider is required');}
      if (!wizardData.llmProvider) {errors.push('LLM provider is required');}
      break;

    case 'credentials':
      if (wizardData.messageProvider === 'discord' && !wizardData.discordToken) {errors.push('Discord bot token is required');}
      if (wizardData.messageProvider === 'slack' && !wizardData.slackToken) {errors.push('Slack bot token is required');}
      if (wizardData.messageProvider === 'mattermost' && (!wizardData.mattermostToken || !wizardData.mattermostServerUrl)) {errors.push('Mattermost credentials are required');}
      if (wizardData.llmProvider === 'openai' && !wizardData.openaiKey) {errors.push('OpenAI API key is required');}
      if (wizardData.llmProvider === 'flowise' && !wizardData.flowiseApiKey) {errors.push('Flowise API key is required');}
      if (wizardData.llmProvider === 'openwebui' && !wizardData.openwebuiApiKey) {errors.push('OpenWebUI API key is required');}
      break;
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
      return false;
    }

    setError(null);
    return true;
  };

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);

    try {
      const botConfig = {
        name: wizardData.botName,
        messageProvider: wizardData.messageProvider,
        llmProvider: wizardData.llmProvider,
        environment: wizardData.environment,
        discord: wizardData.messageProvider === 'discord' ? { token: wizardData.discordToken } : undefined,
        slack: wizardData.messageProvider === 'slack' ? { botToken: wizardData.slackToken } : undefined,
        openai: wizardData.llmProvider === 'openai' ? { apiKey: wizardData.openaiKey } : undefined,
      };

      const response = await fetch('/api/config/hot-reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'create', botName: wizardData.botName, changes: botConfig }),
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Bot Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Bot Name *</span></label>
              <Input value={wizardData.botName} onChange={(e) => setWizardData(prev => ({ ...prev, botName: e.target.value }))} />
              <label className="label"><span className="label-text-alt">Unique name for your bot</span></label>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Environment</span></label>
              <Select value={wizardData.environment} onChange={(e) => setWizardData(prev => ({ ...prev, environment: e.target.value }))} options={[
                { value: 'development', label: 'Development' },
                { value: 'staging', label: 'Staging' },
                { value: 'production', label: 'Production' },
              ]} />
            </div>
          </div>
        </div>
      );

    case 'providers':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Service Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Message Provider *</span></label>
              <Select value={wizardData.messageProvider} onChange={(e) => setWizardData(prev => ({ ...prev, messageProvider: e.target.value }))} options={[
                { value: '', label: 'Select a provider' },
                { value: 'discord', label: 'Discord' },
                { value: 'slack', label: 'Slack' },
                { value: 'mattermost', label: 'Mattermost' },
              ]} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">LLM Provider *</span></label>
              <Select value={wizardData.llmProvider} onChange={(e) => setWizardData(prev => ({ ...prev, llmProvider: e.target.value }))} options={[
                { value: '', label: 'Select a provider' },
                { value: 'openai', label: 'OpenAI' },
                { value: 'flowise', label: 'Flowise' },
                { value: 'openwebui', label: 'OpenWebUI' },
              ]} />
            </div>
          </div>
        </div>
      );

    case 'credentials':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Platform Configuration</h3>
          <Alert status="info" message="Configure platform-specific settings and credentials. Sensitive data is encrypted." />

          {wizardData.messageProvider === 'discord' && (
            <div className="space-y-3">
              <p className="font-medium">Discord Settings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text">Bot Token *</span></label>
                  <Input type="password" value={wizardData.discordToken || ''} onChange={(e) => setWizardData(prev => ({ ...prev, discordToken: e.target.value }))} />
                  <label className="label"><span className="label-text-alt">Required: Bot token from Discord Developer Portal</span></label>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Client ID</span></label>
                  <Input value={wizardData.discordClientId || ''} onChange={(e) => setWizardData(prev => ({ ...prev, discordClientId: e.target.value }))} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Guild ID</span></label>
                  <Input value={wizardData.discordGuildId || ''} onChange={(e) => setWizardData(prev => ({ ...prev, discordGuildId: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {wizardData.messageProvider === 'slack' && (
            <div className="space-y-3">
              <p className="font-medium">Slack Settings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Bot Token *</span></label>
                  <Input type="password" value={wizardData.slackToken || ''} onChange={(e) => setWizardData(prev => ({ ...prev, slackToken: e.target.value }))} />
                  <label className="label"><span className="label-text-alt">Required: Bot token from Slack App settings</span></label>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">App Token</span></label>
                  <Input type="password" value={wizardData.slackAppToken || ''} onChange={(e) => setWizardData(prev => ({ ...prev, slackAppToken: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {wizardData.messageProvider === 'mattermost' && (
            <div className="space-y-3">
              <p className="font-medium">Mattermost Settings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text">Server URL *</span></label>
                  <Input value={wizardData.mattermostServerUrl || ''} onChange={(e) => setWizardData(prev => ({ ...prev, mattermostServerUrl: e.target.value }))} placeholder="https://mattermost.example.com" />
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text">Access Token *</span></label>
                  <Input type="password" value={wizardData.mattermostToken || ''} onChange={(e) => setWizardData(prev => ({ ...prev, mattermostToken: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {wizardData.llmProvider && (
            <div className="space-y-3">
              <p className="font-medium">LLM Settings</p>
              {wizardData.llmProvider === 'openai' && (
                <div className="form-control">
                  <label className="label"><span className="label-text">OpenAI API Key *</span></label>
                  <Input type="password" value={wizardData.openaiKey || ''} onChange={(e) => setWizardData(prev => ({ ...prev, openaiKey: e.target.value }))} />
                  <label className="label"><span className="label-text-alt">Required: Get this from OpenAI API settings</span></label>
                </div>
              )}
              {wizardData.llmProvider === 'flowise' && (
                <div className="form-control">
                  <label className="label"><span className="label-text">Flowise API Key *</span></label>
                  <Input type="password" value={wizardData.flowiseApiKey || ''} onChange={(e) => setWizardData(prev => ({ ...prev, flowiseApiKey: e.target.value }))} />
                </div>
              )}
              {wizardData.llmProvider === 'openwebui' && (
                <div className="form-control">
                  <label className="label"><span className="label-text">OpenWebUI API Key *</span></label>
                  <Input type="password" value={wizardData.openwebuiApiKey || ''} onChange={(e) => setWizardData(prev => ({ ...prev, openwebuiApiKey: e.target.value }))} />
                </div>
              )}
            </div>
          )}
        </div>
      );

    case 'review':
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Configuration Review</h3>

          <Card className="bg-base-200">
            <h4 className="font-semibold mb-3">Bot Configuration Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-base-content/70">Bot Name</p><p className="font-medium">{wizardData.botName}</p></div>
              <div><p className="text-sm text-base-content/70">Environment</p><Badge variant="primary" size="sm">{wizardData.environment}</Badge></div>
              <div><p className="text-sm text-base-content/70">Message Provider</p><p>{wizardData.messageProvider}</p></div>
              <div><p className="text-sm text-base-content/70">LLM Provider</p><p>{wizardData.llmProvider}</p></div>
            </div>
          </Card>

          <Card className="bg-base-200">
            <h4 className="font-semibold mb-3">Platform Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wizardData.messageProvider === 'discord' && (
                <>
                  <div><p className="text-sm text-base-content/70">Bot Token</p><p className="font-mono text-sm">{wizardData.discordToken ? `••••••••${wizardData.discordToken.slice(-4)}` : 'Not configured'}</p></div>
                  {wizardData.discordClientId && <div><p className="text-sm text-base-content/70">Client ID</p><p className="text-sm">{wizardData.discordClientId}</p></div>}
                </>
              )}
              {wizardData.messageProvider === 'slack' && (
                <div><p className="text-sm text-base-content/70">Bot Token</p><p className="font-mono text-sm">{wizardData.slackToken ? `••••••••${wizardData.slackToken.slice(-4)}` : 'Not configured'}</p></div>
              )}
              {wizardData.messageProvider === 'mattermost' && (
                <>
                  <div><p className="text-sm text-base-content/70">Server URL</p><p className="text-sm">{wizardData.mattermostServerUrl}</p></div>
                  <div><p className="text-sm text-base-content/70">Token</p><p className="font-mono text-sm">{wizardData.mattermostToken ? `••••••••${wizardData.mattermostToken.slice(-4)}` : 'Not configured'}</p></div>
                </>
              )}
            </div>
          </Card>

          <Alert status="info" message="Clicking 'Deploy' will create the bot and apply the configuration immediately. Please review all settings carefully before proceeding." />
        </div>
      );

    default:
      return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Configuration Wizard</h1>
      <p className="text-base-content/70 mb-6">Step-by-step guided setup for your Open-Hivemind bot</p>

      {/* Stepper */}
      <div className="mb-6">
        <ul className="steps steps-horizontal w-full">
          {steps.map((step, index) => (
            <li key={step.id} className={`step ${index <= activeStep ? 'step-primary' : ''}`}>
              <div className="flex flex-col items-center gap-1 mt-2">
                {step.icon}
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <p className="text-sm text-base-content/70 mb-2">Progress: Step {activeStep + 1} of {steps.length}</p>
        <progress className="progress progress-primary w-full" value={((activeStep + 1) / steps.length) * 100} max="100"></progress>
      </div>

      {/* Alerts */}
      {error && <Alert status="error" message={error} className="mb-4" />}
      {success && <Alert status="success" message={success} className="mb-4" />}

      {/* Step Content */}
      <Card className="mb-6">
        {renderStepContent(activeStep)}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button disabled={activeStep === 0} onClick={handleBack} variant="secondary" buttonStyle="outline" className="flex items-center gap-2">
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button onClick={handleDeploy} disabled={loading} variant="primary" className="flex items-center gap-2">
            <CloudArrowUpIcon className="w-4 h-4" />
            {loading ? 'Deploying...' : 'Deploy Bot'}
          </Button>
        ) : (
          <Button onClick={handleNext} variant="primary" className="flex items-center gap-2">
            Next
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConfigurationWizard;