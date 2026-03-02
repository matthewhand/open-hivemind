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
import { PROVIDER_SCHEMAS } from '../provider-configs';
import { ProviderConfigForm } from './ProviderConfigForm';

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
  messageProviderConfig: Record<string, any>;
  llmProviderConfig: Record<string, any>;
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
    messageProviderConfig: {},
    llmProviderConfig: {},
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
        if (!wizardData.botName.trim()) { errors.push('Bot name is required'); }
        else if (wizardData.botName.length < 3) { errors.push('Bot name must be at least 3 characters'); }
        else if (!/^[a-zA-Z0-9_-]+$/.test(wizardData.botName)) { errors.push('Bot name can only contain letters, numbers, hyphens, and underscores'); }
        else if (existingBots.some(bot => bot.name === wizardData.botName)) { errors.push('Bot name already exists'); }
        break;

      case 'providers':
        if (!wizardData.messageProvider) { errors.push('Message provider is required'); }
        if (!wizardData.llmProvider) { errors.push('LLM provider is required'); }
        break;

      case 'credentials':
        if (wizardData.messageProvider && PROVIDER_SCHEMAS[wizardData.messageProvider]) {
          const schema = PROVIDER_SCHEMAS[wizardData.messageProvider];
          schema.fields.forEach(f => {
            if (f.required && !wizardData.messageProviderConfig[f.name]) {
              errors.push(`${f.label} is required for ${schema.displayName}`);
            }
          });
        }
        if (wizardData.llmProvider && PROVIDER_SCHEMAS[wizardData.llmProvider]) {
          const schema = PROVIDER_SCHEMAS[wizardData.llmProvider];
          schema.fields.forEach(f => {
            if (f.required && !wizardData.llmProviderConfig[f.name]) {
              errors.push(`${f.label} is required for ${schema.displayName}`);
            }
          });
        }
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
      // 1. Setup providers first
      if (wizardData.messageProvider) {
        await fetch(`/api/admin/providers/${wizardData.messageProvider}/bots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: wizardData.botName,
            ...wizardData.messageProviderConfig,
            llm: wizardData.llmProvider,
          }),
        });
      }

      // 2. Setup LLM Profile (global save if not existing - optionally just push onto the profile)
      // Since LLM handles aren't bot-scoped natively through hot-reload but global or integrated into bot
      // We will inject the credentials right into the bot configuration below for the hot reloader.

      const botConfig = {
        name: wizardData.botName,
        messageProvider: wizardData.messageProvider,
        llmProvider: wizardData.llmProvider,
        environment: wizardData.environment,
        [wizardData.messageProvider]: wizardData.messageProviderConfig,
        [wizardData.llmProvider]: wizardData.llmProviderConfig,
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
        const msgSchema = wizardData.messageProvider ? PROVIDER_SCHEMAS[wizardData.messageProvider] : null;
        const llmSchema = wizardData.llmProvider ? PROVIDER_SCHEMAS[wizardData.llmProvider] : null;

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Platform Configuration</h3>
            <Alert status="info" message="Configure platform-specific settings and credentials. Sensitive data is encrypted." />

            {msgSchema && (
              <div className="space-y-3 pt-4">
                <p className="font-medium text-lg">{msgSchema.displayName} Settings</p>
                <ProviderConfigForm
                  providerType={wizardData.messageProvider}
                  schema={msgSchema}
                  initialConfig={wizardData.messageProviderConfig}
                  onConfigChange={(cfg) => setWizardData(prev => ({ ...prev, messageProviderConfig: cfg }))}
                />
              </div>
            )}

            {llmSchema && (
              <div className="space-y-3 pt-4 border-t border-base-200">
                <p className="font-medium text-lg border-b pb-2">{llmSchema.displayName} Settings</p>
                <ProviderConfigForm
                  providerType={wizardData.llmProvider}
                  schema={llmSchema}
                  initialConfig={wizardData.llmProviderConfig}
                  onConfigChange={(cfg) => setWizardData(prev => ({ ...prev, llmProviderConfig: cfg }))}
                />
              </div>
            )}

            {!msgSchema && !llmSchema && (
              <p className="text-sm text-base-content/70">Please go back and select a provider to configure.</p>
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
                <div><p className="text-sm text-base-content/70">Environment</p><Badge variant="primary" size="small">{wizardData.environment}</Badge></div>
                <div><p className="text-sm text-base-content/70">Message Provider</p><p>{wizardData.messageProvider}</p></div>
                <div><p className="text-sm text-base-content/70">LLM Provider</p><p>{wizardData.llmProvider}</p></div>
              </div>
            </Card>

            <Card className="bg-base-200">
              <h4 className="font-semibold mb-3">Platform Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wizardData.messageProviderConfig && Object.entries(wizardData.messageProviderConfig).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-sm text-base-content/70">{wizardData.messageProvider} - {key}</p>
                    <p className="font-mono text-sm">{String(val).includes('token') || String(val).includes('key') ? '••••••••' : String(val)}</p>
                  </div>
                ))}
                {wizardData.llmProviderConfig && Object.entries(wizardData.llmProviderConfig).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-sm text-base-content/70">{wizardData.llmProvider} - {key}</p>
                    <p className="font-mono text-sm">{String(val).includes('key') || String(val).includes('secret') ? '••••••••' : String(val)}</p>
                  </div>
                ))}
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