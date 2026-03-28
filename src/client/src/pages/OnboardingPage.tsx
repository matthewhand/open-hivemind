/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket, Cpu, Bot, MessageSquare, CheckCircle2,
  ArrowRight, ArrowLeft, SkipForward, Sparkles,
} from 'lucide-react';
import Input from '../components/DaisyUI/Input';
import Button from '../components/DaisyUI/Button';

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
// Step content components
// ---------------------------------------------------------------------------

const WelcomeStep: React.FC = () => (
  <div className="text-center space-y-6 py-4">
    <div className="flex justify-center">
      <div className="p-6 bg-primary/10 rounded-full">
        <Sparkles className="w-16 h-16 text-primary" />
      </div>
    </div>
    <h2 className="text-3xl font-bold">Welcome to Open-Hivemind</h2>
    <p className="text-lg text-base-content/70 max-w-xl mx-auto">
      Open-Hivemind is a multi-agent AI platform that lets you create intelligent bots
      and connect them to messaging platforms like Discord, Slack, and Mattermost.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
      <div className="card bg-base-200 p-4 text-center">
        <Cpu className="w-8 h-8 mx-auto mb-2 text-primary" />
        <h4 className="font-semibold text-sm">LLM Providers</h4>
        <p className="text-xs text-base-content/60">Connect OpenAI, Anthropic, and more</p>
      </div>
      <div className="card bg-base-200 p-4 text-center">
        <Bot className="w-8 h-8 mx-auto mb-2 text-secondary" />
        <h4 className="font-semibold text-sm">AI Bots</h4>
        <p className="text-xs text-base-content/60">Create specialized agents</p>
      </div>
      <div className="card bg-base-200 p-4 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-accent" />
        <h4 className="font-semibold text-sm">Messengers</h4>
        <p className="text-xs text-base-content/60">Discord, Slack, Mattermost</p>
      </div>
    </div>
    <p className="text-sm text-base-content/50">
      This wizard will guide you through initial setup in just a few minutes.
    </p>
  </div>
);

interface ConfigureLlmStepProps {
  llmProvider: string;
  apiKey: string;
  model: string;
  llmProfiles: LlmProfile[];
  onChangeLlmProvider: (v: string) => void;
  onChangeApiKey: (v: string) => void;
  onChangeModel: (v: string) => void;
}

const ConfigureLlmStep: React.FC<ConfigureLlmStepProps> = ({
  llmProvider, apiKey, model, llmProfiles,
  onChangeLlmProvider, onChangeApiKey, onChangeModel,
}) => {
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

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">Configure LLM Provider</h3>
        <p className="text-base-content/70 text-sm">
          Choose which large language model will power your bots.
        </p>
      </div>

      {llmProfiles.length > 0 && (
        <div className="alert alert-info">
          <Cpu className="w-5 h-5" />
          <span>
            You have {llmProfiles.length} LLM profile(s) already configured.
            You can skip this step if you want to use existing profiles.
          </span>
        </div>
      )}

      <div className="form-control">
        <label className="label" htmlFor="onboarding-llm-provider">
          <span className="label-text font-medium">LLM Provider</span>
        </label>
        <select
          id="onboarding-llm-provider"
          className="select select-bordered w-full"
          value={llmProvider}
          onChange={(e) => {
            onChangeLlmProvider(e.target.value);
            onChangeModel('');
          }}
        >
          {providerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {llmProvider && llmProvider !== 'ollama' && (
        <div className="form-control">
          <label className="label" htmlFor="onboarding-api-key">
            <span className="label-text font-medium">API Key</span>
          </label>
          <Input
            id="onboarding-api-key"
            type="password"
            placeholder={`Enter your ${llmProvider} API key`}
            value={apiKey}
            onChange={(e) => onChangeApiKey(e.target.value)}
          />
          <label className="label">
            <span className="label-text-alt text-base-content/50">
              Your key is stored securely and never leaves this server.
            </span>
          </label>
        </div>
      )}

      {llmProvider && (
        <div className="form-control">
          <label className="label" htmlFor="onboarding-model">
            <span className="label-text font-medium">Model</span>
          </label>
          <select
            id="onboarding-model"
            className="select select-bordered w-full"
            value={model}
            onChange={(e) => onChangeModel(e.target.value)}
          >
            <option value="">Select a model...</option>
            {(modelSuggestions[llmProvider] || []).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

interface CreateBotStepProps {
  botName: string;
  persona: string;
  llmProvider: string;
  onChangeBotName: (v: string) => void;
  onChangePersona: (v: string) => void;
}

const CreateBotStep: React.FC<CreateBotStepProps> = ({
  botName, persona, llmProvider, onChangeBotName, onChangePersona,
}) => (
  <div className="space-y-6">
    <div className="text-center mb-4">
      <h3 className="text-xl font-bold">Create Your First Bot</h3>
      <p className="text-base-content/70 text-sm">
        Give your bot a name and personality. You can always change these later.
      </p>
    </div>

    <div className="form-control">
      <label className="label" htmlFor="onboarding-bot-name">
        <span className="label-text font-medium">Bot Name <span className="text-error">*</span></span>
      </label>
      <Input
        id="onboarding-bot-name"
        placeholder="e.g. HelpBot, CodeAssistant, TeamBot"
        value={botName}
        onChange={(e) => onChangeBotName(e.target.value)}
        autoFocus
      />
    </div>

    <div className="form-control">
      <label className="label" htmlFor="onboarding-persona">
        <span className="label-text font-medium">Persona / System Prompt</span>
      </label>
      <textarea
        id="onboarding-persona"
        className="textarea textarea-bordered h-28 w-full"
        placeholder="You are a helpful assistant that..."
        value={persona}
        onChange={(e) => onChangePersona(e.target.value)}
      />
      <label className="label">
        <span className="label-text-alt text-base-content/50">
          Describe how the bot should behave. Leave blank for a general-purpose assistant.
        </span>
      </label>
    </div>

    {llmProvider && (
      <div className="alert bg-base-200">
        <Cpu className="w-5 h-5 text-primary" />
        <span>
          This bot will use <strong className="capitalize">{llmProvider}</strong> as its LLM provider (configured in the previous step).
        </span>
      </div>
    )}
  </div>
);

interface ConnectMessengerStepProps {
  messenger: string;
  messengerToken: string;
  onChangeMessenger: (v: string) => void;
  onChangeMessengerToken: (v: string) => void;
}

const ConnectMessengerStep: React.FC<ConnectMessengerStepProps> = ({
  messenger, messengerToken, onChangeMessenger, onChangeMessengerToken,
}) => {
  const instructions: Record<string, React.ReactNode> = {
    discord: (
      <div className="space-y-2 text-sm">
        <p>1. Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="link link-primary">Discord Developer Portal</a></p>
        <p>2. Create a New Application, then go to the Bot section</p>
        <p>3. Click &quot;Reset Token&quot; to generate a bot token</p>
        <p>4. Enable Message Content Intent under Privileged Gateway Intents</p>
        <p>5. Use the OAuth2 URL Generator to invite the bot to your server</p>
      </div>
    ),
    slack: (
      <div className="space-y-2 text-sm">
        <p>1. Go to <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="link link-primary">Slack API Apps</a></p>
        <p>2. Create a New App from scratch</p>
        <p>3. Under OAuth &amp; Permissions, add bot scopes: <code className="badge badge-sm">chat:write</code>, <code className="badge badge-sm">channels:read</code>, <code className="badge badge-sm">app_mentions:read</code></p>
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

      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'discord', label: 'Discord', color: 'bg-[#5865F2]' },
          { id: 'slack', label: 'Slack', color: 'bg-[#4A154B]' },
          { id: 'mattermost', label: 'Mattermost', color: 'bg-[#0058CC]' },
        ].map((m) => (
          <button
            key={m.id}
            className={`card p-4 text-center cursor-pointer transition-all border-2 ${
              messenger === m.id
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-base-300 hover:border-primary/30'
            }`}
            onClick={() => onChangeMessenger(m.id)}
            type="button"
          >
            <div className={`w-10 h-10 ${m.color} rounded-lg mx-auto mb-2 flex items-center justify-center`}>
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-sm">{m.label}</span>
          </button>
        ))}
      </div>

      {messenger && (
        <>
          <div className="card bg-base-200 p-4">
            <h4 className="font-semibold mb-2 capitalize">Setup Instructions for {messenger}</h4>
            {instructions[messenger]}
          </div>

          <div className="form-control">
            <label className="label" htmlFor="onboarding-messenger-token">
              <span className="label-text font-medium">Bot Token</span>
            </label>
            <Input
              id="onboarding-messenger-token"
              type="password"
              placeholder={`Paste your ${messenger} bot token`}
              value={messengerToken}
              onChange={(e) => onChangeMessengerToken(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
};

interface DoneStepProps {
  llmProvider: string;
  botName: string;
  messenger: string;
}

const DoneStep: React.FC<DoneStepProps> = ({ llmProvider, botName, messenger }) => (
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

    <div className="card bg-base-200 max-w-md mx-auto">
      <div className="card-body">
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
      </div>
    </div>

    <p className="text-sm text-base-content/50">
      You can change any of these settings from the admin dashboard at any time.
    </p>
  </div>
);

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

  // Step 2 - LLM
  const [llmProvider, setLlmProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [llmProfiles, setLlmProfiles] = useState<LlmProfile[]>([]);

  // Step 3 - Bot
  const [botName, setBotName] = useState('');
  const [persona, setPersona] = useState('');

  // Step 4 - Messenger
  const [messenger, setMessenger] = useState('');
  const [messengerToken, setMessengerToken] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing LLM profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/config/llm-profiles');
        if (res.ok) {
          const data = await res.json();
          setLlmProfiles(data?.llm || data?.profiles?.llm || data?.data || []);
        }
      } catch {
        // Non-critical, ignore
      }
    };
    fetchProfiles();
  }, []);

  // Persist step progress to backend
  const syncStep = useCallback(async (s: number) => {
    try {
      await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: s }),
      });
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

    try {
      // Save LLM config if provided
      if (llmProvider && apiKey) {
        await fetch('/api/config/global', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configName: llmProvider,
            updates: {
              [`${llmProvider}.apiKey`]: apiKey,
              ...(model ? { [`${llmProvider}.model`]: model } : {}),
            },
          }),
        });
      }

      // Create bot if name provided
      if (botName.trim()) {
        await fetch('/api/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: botName,
            description: persona || 'Created during onboarding',
            messageProvider: messenger || 'discord',
            ...(llmProvider ? { llmProvider } : {}),
            persona: 'default',
          }),
        });
      }

      // Mark onboarding complete
      await fetch('/api/onboarding/complete', { method: 'POST' });

      navigate('/admin/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAll = async () => {
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
    } catch {
      // Best-effort
    }
    navigate('/admin/overview');
  };

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

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
        <div className="flex justify-between text-sm text-base-content/60 mb-2">
          <span>Setup Progress</span>
          <span>{Math.round(progressPercent)}% Complete</span>
        </div>
        <progress
          className="progress progress-primary w-full"
          value={progressPercent}
          max="100"
        />
      </div>

      {/* Steps indicator (DaisyUI steps) */}
      <div className="px-6 py-4 max-w-4xl mx-auto w-full">
        <ul className="steps w-full">
          {stepMeta.map((s, i) => {
            const stepNum = i + 1;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;
            return (
              <li
                key={s.label}
                className={`step ${isCompleted || isActive ? 'step-primary' : ''}`}
                data-content={isCompleted ? '\u2713' : String(stepNum)}
              >
                <span className={`text-xs ${isActive ? 'font-bold' : ''}`}>{s.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pb-6 max-w-4xl mx-auto w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body min-h-[400px]">
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {step === 1 && <WelcomeStep />}
            {step === 2 && (
              <ConfigureLlmStep
                llmProvider={llmProvider}
                apiKey={apiKey}
                model={model}
                llmProfiles={llmProfiles}
                onChangeLlmProvider={setLlmProvider}
                onChangeApiKey={setApiKey}
                onChangeModel={setModel}
              />
            )}
            {step === 3 && (
              <CreateBotStep
                botName={botName}
                persona={persona}
                llmProvider={llmProvider}
                onChangeBotName={setBotName}
                onChangePersona={setPersona}
              />
            )}
            {step === 4 && (
              <ConnectMessengerStep
                messenger={messenger}
                messengerToken={messengerToken}
                onChangeMessenger={setMessenger}
                onChangeMessengerToken={setMessengerToken}
              />
            )}
            {step === 5 && (
              <DoneStep
                llmProvider={llmProvider}
                botName={botName}
                messenger={messenger}
              />
            )}
          </div>
        </div>
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
