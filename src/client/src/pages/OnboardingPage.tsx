/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Rocket, Cpu, Bot, MessageSquare, CheckCircle2,
  ArrowRight, ArrowLeft, SkipForward, Sparkles,
} from 'lucide-react';
import Input from '../components/DaisyUI/Input';
import Validator, { ValidatorHint } from '../components/DaisyUI/Validator';
import Steps from '../components/DaisyUI/Steps';
import Button from '../components/DaisyUI/Button';
import FormField from '../components/DaisyUI/FormField';
import ProgressBar from '../components/DaisyUI/ProgressBar';
import StepWizard from '../components/DaisyUI/StepWizard';
import { Alert } from '../components/DaisyUI/Alert';
import { Badge } from '../components/DaisyUI/Badge';
import { apiService } from '../services/api';
import Card from '../components/DaisyUI/Card';
import Link from '../components/DaisyUI/Link';
import Select from '../components/DaisyUI/Select';
import Textarea from '../components/DaisyUI/Textarea';
import Carousel from '../components/DaisyUI/Carousel';
import Countdown from '../components/DaisyUI/Countdown';
import Figure from '../components/DaisyUI/Figure';
import Stack from '../components/DaisyUI/Stack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LlmProfile {
  key: string;
  name: string;
  provider: string;
  modelType?: string;
}

// ---------------------------------------------------------------------------
// Zod schemas (one per form step)
// ---------------------------------------------------------------------------

const llmStepSchema = z.object({
  llmProvider: z.string(),
  apiKey: z.string(),
  model: z.string(),
});

type LlmStepValues = z.infer<typeof llmStepSchema>;

const botStepSchema = z.object({
  botName: z.string(),
  persona: z.string(),
});

type BotStepValues = z.infer<typeof botStepSchema>;

const messengerStepSchema = z.object({
  messenger: z.string(),
  messengerToken: z.string(),
});

type MessengerStepValues = z.infer<typeof messengerStepSchema>;

// ---------------------------------------------------------------------------
// Step content components
// ---------------------------------------------------------------------------

const WelcomeStep: React.FC = () => (
  <div className="text-center space-y-6 py-4">
    <div className="flex justify-center">
      <Stack>
        <div className="p-6 bg-primary/10 rounded-full">
          <Sparkles className="w-16 h-16 text-primary" />
        </div>
        <div className="p-6 bg-secondary/10 rounded-full">
          <Bot className="w-16 h-16 text-secondary" />
        </div>
        <div className="p-6 bg-accent/10 rounded-full">
          <MessageSquare className="w-16 h-16 text-accent" />
        </div>
      </Stack>
    </div>
    <h2 className="text-3xl font-bold">Welcome to Open-Hivemind</h2>
    <p className="text-lg text-base-content/70 max-w-xl mx-auto">
      Open-Hivemind is a multi-agent AI platform that lets you create intelligent bots
      and connect them to messaging platforms like Discord, Slack, and Mattermost.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
      <Figure
        caption={<span className="text-xs text-base-content/60">Connect OpenAI, Anthropic, and more</span>}
        className="bg-base-200 rounded-xl p-4 text-center"
      >
        <Cpu className="w-8 h-8 mx-auto mb-2 text-primary" />
        <h4 className="font-semibold text-sm">LLM Providers</h4>
      </Figure>
      <Figure
        caption={<span className="text-xs text-base-content/60">Create specialized agents</span>}
        className="bg-base-200 rounded-xl p-4 text-center"
      >
        <Bot className="w-8 h-8 mx-auto mb-2 text-secondary" />
        <h4 className="font-semibold text-sm">AI Bots</h4>
      </Figure>
      <Figure
        caption={<span className="text-xs text-base-content/60">Discord, Slack, Mattermost</span>}
        className="bg-base-200 rounded-xl p-4 text-center"
      >
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-accent" />
        <h4 className="font-semibold text-sm">Messengers</h4>
      </Figure>
    </div>
    <p className="text-sm text-base-content/50">
      This wizard will guide you through initial setup in just a few minutes.
    </p>
  </div>
);

interface ConfigureLlmStepProps {
  form: UseFormReturn<LlmStepValues>;
  llmProfiles: LlmProfile[];
}

const providerOptions = [
  { value: '', label: 'Select a provider...' },
  { value: 'openai', label: 'OpenAI (GPT-4, GPT-3.5)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'openrouter', label: 'OpenRouter' },
];

const modelSuggestions: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama3', 'mistral', 'codellama', 'phi3'],
  openrouter: ['openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514', 'meta-llama/llama-3-70b'],
};

const ConfigureLlmStep: React.FC<ConfigureLlmStepProps> = ({ form, llmProfiles }) => {
  const { register, control, watch, formState: { errors } } = form;
  const llmProvider = watch('llmProvider');

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">Configure LLM Provider</h3>
        <p className="text-base-content/70 text-sm">
          Choose which large language model will power your bots.
        </p>
      </div>

      {llmProfiles.length > 0 && (
        <Alert status="info">
          <Cpu className="w-5 h-5" />
          <span>
            You have {llmProfiles.length} LLM profile(s) already configured.
            You can skip this step if you want to use existing profiles.
          </span>
        </Alert>
      )}

      <FormField label="LLM Provider" error={errors.llmProvider}>
        <Controller
          name="llmProvider"
          control={control}
          render={({ field }) => (
            <Select
              id="onboarding-llm-provider"
              className="select-bordered"
              value={field.value}
              onChange={(e) => {
                field.onChange(e.target.value);
                form.setValue('model', '');
              }}
            >
              {providerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          )}
        />
      </FormField>

      {llmProvider && llmProvider !== 'ollama' && (
        <FormField label="API Key" error={errors.apiKey} hint="Your key is stored securely and never leaves this server.">
          <Validator>
            <Input
              id="onboarding-api-key"
              type="password"
              placeholder={`Enter your ${llmProvider} API key`}
              required
              {...register('apiKey')}
            />
            <ValidatorHint>An API key is required for {llmProvider}</ValidatorHint>
          </Validator>
        </FormField>
      )}

      {llmProvider && (
        <FormField label="Model" error={errors.model}>
          <Controller
            name="model"
            control={control}
            render={({ field }) => (
              <Select
                id="onboarding-model"
                className="select-bordered"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              >
                <option value="">Select a model...</option>
                {(modelSuggestions[llmProvider] || []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            )}
          />
        </FormField>
      )}
    </div>
  );
};

interface CreateBotStepProps {
  form: UseFormReturn<BotStepValues>;
  llmProvider: string;
}

const CreateBotStep: React.FC<CreateBotStepProps> = ({ form, llmProvider }) => {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">Create Your First Bot</h3>
        <p className="text-base-content/70 text-sm">
          Give your bot a name and personality. You can always change these later.
        </p>
      </div>

      <FormField label="Bot Name" error={errors.botName} required>
        <Validator>
          <Input
            id="onboarding-bot-name"
            placeholder="e.g. HelpBot, CodeAssistant, TeamBot"
            required
            minLength={2}
            autoFocus
            {...register('botName')}
          />
          <ValidatorHint>Bot name must be at least 2 characters</ValidatorHint>
        </Validator>
      </FormField>

      <FormField
        label="Persona / System Prompt"
        error={errors.persona}
        hint="Describe how the bot should behave. Leave blank for a general-purpose assistant."
      >
        <Textarea
          id="onboarding-persona"
          className="h-28 w-full"
          placeholder="You are a helpful assistant that..."
          {...register('persona')}
        />
      </FormField>

      {llmProvider && (
        <Alert status="info" icon={<Cpu className="w-5 h-5 text-primary" />} className="bg-base-200">
          <span>
            This bot will use <strong className="capitalize">{llmProvider}</strong> as its LLM provider (configured in the previous step).
          </span>
        </Alert>
      )}
    </div>
  );
};

interface ConnectMessengerStepProps {
  form: UseFormReturn<MessengerStepValues>;
}

const ConnectMessengerStep: React.FC<ConnectMessengerStepProps> = ({ form }) => {
  const { register, control, watch, formState: { errors } } = form;
  const messenger = watch('messenger');

  const instructions: Record<string, React.ReactNode> = {
    discord: (
      <div className="space-y-2 text-sm">
        <p>1. Go to the <Link href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" color="primary">Discord Developer Portal</Link></p>
        <p>2. Create a New Application, then go to the Bot section</p>
        <p>3. Click &quot;Reset Token&quot; to generate a bot token</p>
        <p>4. Enable Message Content Intent under Privileged Gateway Intents</p>
        <p>5. Use the OAuth2 URL Generator to invite the bot to your server</p>
      </div>
    ),
    slack: (
      <div className="space-y-2 text-sm">
        <p>1. Go to <Link href="https://api.slack.com/apps" target="_blank" rel="noreferrer" color="primary">Slack API Apps</Link></p>
        <p>2. Create a New App from scratch</p>
        <p>3. Under OAuth &amp; Permissions, add bot scopes: <Badge size="sm">chat:write</Badge>, <Badge size="sm">channels:read</Badge>, <Badge size="sm">app_mentions:read</Badge></p>
        <p>4. Install to your workspace and copy the Bot User OAuth Token</p>
      </div>
    ),
    mattermost: (
      <div className="space-y-2 text-sm">
        <p>1. In Mattermost, go to Integrations &gt; Bot Accounts</p>
        <p>2. Click &quot;Add Bot Account&quot;</p>
        <p>3. Fill in the details and create the bot</p>
        <p>4. Copy the generated access token</p>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">Connect a Messenger</h3>
        <p className="text-base-content/70 text-sm">
          Choose a messaging platform to connect your bot to.
        </p>
      </div>

      <Controller
        name="messenger"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'discord', label: 'Discord', color: 'bg-[#5865F2]' },
              { id: 'slack', label: 'Slack', color: 'bg-[#4A154B]' },
              { id: 'mattermost', label: 'Mattermost', color: 'bg-[#0058CC]' },
            ].map((m) => (
              <button
                key={m.id}
                className={`card p-4 text-center cursor-pointer transition-all border-2 ${
                  field.value === m.id
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/30'
                }`}
                onClick={() => field.onChange(m.id)}
                type="button"
              >
                <div className={`w-10 h-10 ${m.color} rounded-lg mx-auto mb-2 flex items-center justify-center`}>
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-sm">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      />

      {messenger && (
        <>
          <Card bgVariant="ghost" className="bg-base-200" compact>
            <h4 className="font-semibold mb-2 capitalize">Setup Instructions for {messenger}</h4>
            {instructions[messenger]}
          </Card>

          <FormField label="Bot Token" error={errors.messengerToken}>
            <Input
              id="onboarding-messenger-token"
              type="password"
              placeholder={`Paste your ${messenger} bot token`}
              {...register('messengerToken')}
            />
          </FormField>
        </>
      )}
    </div>
  );
};

interface DoneStepProps {
  llmProvider: string;
  botName: string;
  messenger: string;
  onAutoRedirect?: () => void;
}

const DONE_STEP_COUNTDOWN_MS = 30_000; // 30 seconds auto-redirect

const DoneStep: React.FC<DoneStepProps> = ({ llmProvider, botName, messenger, onAutoRedirect }) => {
  const [redirectTarget] = useState(() => Date.now() + DONE_STEP_COUNTDOWN_MS);

  return (
    <div className="text-center space-y-6 py-4">
      <div className="flex justify-center">
        <div className="p-6 bg-success/10 rounded-full">
          <CheckCircle2 className="w-16 h-16 text-success" />
        </div>
      </div>
      <h2 className="text-3xl font-bold">You are All Set!</h2>
      <p className="text-lg text-base-content/70 max-w-lg mx-auto">
        Your Open-Hivemind instance is configured and ready to go.
      </p>

      <Card bgVariant="ghost" className="bg-base-200 max-w-md mx-auto">
          <h4 className="font-bold mb-3">Configuration Summary</h4>
          <div className="space-y-2 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-base-content/60">LLM Provider:</span>
              <span className="font-semibold capitalize">{llmProvider || 'Skipped'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Bot:</span>
              <span className="font-semibold">{botName || 'Skipped'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Messenger:</span>
              <span className="font-semibold capitalize">{messenger || 'Skipped'}</span>
            </div>
          </div>
      </Card>

      <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
        <span>Redirecting to dashboard in</span>
        <Countdown targetDate={redirectTarget} size="sm" compact onComplete={onAutoRedirect} />
      </div>

      <p className="text-sm text-base-content/50">
        You can change any of these settings from the admin dashboard at any time.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main OnboardingPage Component
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 5;

const stepMeta = [
  { label: 'Welcome' },
  { label: 'LLM' },
  { label: 'Bot' },
  { label: 'Messenger' },
  { label: 'Done' },
];

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);

  // Per-step react-hook-form instances
  const llmForm = useForm<LlmStepValues>({
    resolver: zodResolver(llmStepSchema),
    defaultValues: { llmProvider: '', apiKey: '', model: '' },
  });

  const botForm = useForm<BotStepValues>({
    resolver: zodResolver(botStepSchema),
    defaultValues: { botName: '', persona: '' },
  });

  const messengerForm = useForm<MessengerStepValues>({
    resolver: zodResolver(messengerStepSchema),
    defaultValues: { messenger: '', messengerToken: '' },
  });

  // Existing LLM profiles (fetched on mount)
  const [llmProfiles, setLlmProfiles] = useState<LlmProfile[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing LLM profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data: any = await apiService.get('/api/config/llm-profiles');
        setLlmProfiles(data?.llm || data?.profiles?.llm || data?.data || []);
      } catch {
        // Non-critical, ignore
      }
    };
    fetchProfiles();
  }, []);

  // Persist step progress to backend
  const syncStep = useCallback(async (s: number) => {
    try {
      await apiService.post('/api/onboarding/step', { step: s });
    } catch {
      // Best-effort, don't block navigation
    }
  }, []);

  const goNext = () => {
    const next = Math.min(step + 1, TOTAL_STEPS);
    setStep(next);
    syncStep(next);
    setError(null);
  };

  const goBack = () => {
    const prev = Math.max(step - 1, 1);
    setStep(prev);
    syncStep(prev);
    setError(null);
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);

    const llmValues = llmForm.getValues();
    const botValues = botForm.getValues();
    const messengerValues = messengerForm.getValues();

    try {
      // Save LLM config if provided
      if (llmValues.llmProvider && llmValues.apiKey) {
        await apiService.put('/api/config/global', {
          configName: llmValues.llmProvider,
          updates: {
            [`${llmValues.llmProvider}.apiKey`]: llmValues.apiKey,
            ...(llmValues.model ? { [`${llmValues.llmProvider}.model`]: llmValues.model } : {}),
          },
        });
      }

      // Create bot if name provided
      if (botValues.botName.trim()) {
        await apiService.post('/api/bots', {
          name: botValues.botName,
          description: botValues.persona || 'Created during onboarding',
          messageProvider: messengerValues.messenger || 'discord',
          ...(llmValues.llmProvider ? { llmProvider: llmValues.llmProvider } : {}),
          persona: 'default',
        });
      }

      // Mark onboarding complete
      await apiService.post('/api/onboarding/complete');

      navigate('/admin/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAll = async () => {
    try {
      await apiService.post('/api/onboarding/complete');
    } catch {
      // Best-effort
    }
    navigate('/admin/overview');
  };

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  // Read current values for the summary step
  const llmProvider = llmForm.watch('llmProvider');
  const botName = botForm.watch('botName');
  const messenger = messengerForm.watch('messenger');

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Top bar */}
      <div className="bg-base-100 border-b border-base-300 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg">Open-Hivemind Setup</span>
        </div>
        {step < TOTAL_STEPS && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleSkipAll}
          >
            Skip Setup
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-6 pb-2 max-w-4xl mx-auto w-full">
        <ProgressBar
          value={progressPercent}
          max={100}
          color="primary"
          label="Setup Progress"
          showPercentage={true}
        />
      </div>

      {/* Steps indicator (DaisyUI steps) */}
      <div className="px-6 py-4 max-w-4xl mx-auto w-full">
        <Steps
          className="w-full"
          items={stepMeta.map((s, i) => {
            const stepNum = i + 1;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;
            return {
              color: isCompleted || isActive ? 'primary' : undefined,
              dataContent: isCompleted ? '\u2713' : String(stepNum),
              label: <span className={`text-xs ${isActive ? 'font-bold' : ''}`}>{s.label}</span>,
            };
          })}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pb-6 max-w-4xl mx-auto w-full">
        <Card className="shadow-xl">
          <div className="min-h-[400px]">
            {error && (
              <Alert status="error" className="mb-4" onClose={() => setError(null)}>
                <span>{error}</span>
              </Alert>
            )}

            {step === 1 && <WelcomeStep />}
            {step === 2 && (
              <ConfigureLlmStep
                form={llmForm}
                llmProfiles={llmProfiles}
              />
            )}
            {step === 3 && (
              <CreateBotStep
                form={botForm}
                llmProvider={llmProvider}
              />
            )}
            {step === 4 && (
              <ConnectMessengerStep
                form={messengerForm}
              />
            )}
            {step === 5 && (
              <DoneStep
                llmProvider={llmProvider}
                botName={botName}
                messenger={messenger}
                onAutoRedirect={handleFinish}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Navigation buttons */}
      <div className="bg-base-100 border-t border-base-300 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            {step > 1 && step < TOTAL_STEPS && (
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step > 1 && step < TOTAL_STEPS && (
              <Button variant="ghost" onClick={goNext}>
                <SkipForward className="w-4 h-4 mr-1" /> Skip
              </Button>
            )}

            {step < TOTAL_STEPS && (
              <Button variant="primary" onClick={goNext}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === TOTAL_STEPS && (
              <Button
                variant="primary"
                onClick={handleFinish}
                loading={saving}
                className="btn-wide"
              >
                {!saving && <CheckCircle2 className="w-4 h-4 mr-1" />}
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
