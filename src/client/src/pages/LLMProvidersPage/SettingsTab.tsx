import React, { useState } from 'react';
import Card from '../../components/DaisyUI/Card';
import Button from '../../components/DaisyUI/Button';
import Badge from '../../components/DaisyUI/Badge';
import Toggle from '../../components/DaisyUI/Toggle';
import Select from '../../components/DaisyUI/Select';
import {
  Brain as BrainIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  MessageSquare as ChatIcon,
  Cpu as CpuIcon,
  Clock as ClockIcon,
  Reply as ReplyIcon,
  Coffee as CoffeeIcon,
  Monitor as MonitorIcon,
  Search as SearchIcon,
  ToggleLeft as ToggleOffIcon,
  ToggleRight as ToggleOnIcon,
} from 'lucide-react';
import { LLM_PROVIDER_CONFIGS } from '../../types/bot';
import { isChatCapable, isEmbeddingCapable } from './utils';

export const SettingsTab: React.FC<{
  profiles: any[];
  defaultStatus: any;
  loading: boolean;
  defaultChatbotProfile: string;
  defaultEmbeddingProvider: string;
  webuiIntelligenceProvider: string;
  perUseCaseEnabled: boolean;
  taskProfiles: Record<string, string>;
  chatProfiles: any[];
  embeddingProfiles: any[];
  onDefaultChatbotChange: (val: string) => void;
  onDefaultEmbeddingChange: (val: string) => void;
  onWebuiIntelligenceChange: (val: string) => void;
  onPerUseCaseChange: (val: boolean) => void;
  onTaskProfileChange: (key: string, val: string) => void;
}> = ({
  defaultStatus,
  loading,
  defaultChatbotProfile,
  defaultEmbeddingProvider,
  webuiIntelligenceProvider,
  perUseCaseEnabled,
  taskProfiles,
  chatProfiles,
  embeddingProfiles,
  onDefaultChatbotChange,
  onDefaultEmbeddingChange,
  onWebuiIntelligenceChange,
  onPerUseCaseChange,
  onTaskProfileChange,
}) => {
    const [advancedMode, setAdvancedMode] = useState(false);

    const getProviderIcon = (type: string) => {
      const config = (LLM_PROVIDER_CONFIGS as any)[type as any];
      return config?.icon || <BrainIcon className="w-5 h-5" />;
    };

    return (
      <div className="space-y-6">
        {/* Basic Settings -- always visible */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Default Chatbot LLM Profile */}
          <Card className="bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-5">
              <h3 className="font-bold flex items-center gap-2 mb-1">
                <ChatIcon className="w-4 h-4 text-primary" /> Default Chatbot Profile
              </h3>
              <p className="text-xs opacity-60 mb-3">
                Profile used for all bot chat responses when per-use-case mode is off.
              </p>
              <div className="form-control w-full">
                <select
                  className="select select-bordered select-sm w-full"
                  value={defaultChatbotProfile}
                  onChange={(e) => onDefaultChatbotChange(e.target.value)}
                  disabled={loading}
                  aria-busy={loading}
                >
                  <option value="">Use System Default</option>
                  {chatProfiles.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Default Embedding Provider */}
          <Card className="bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-5">
              <h3 className="font-bold flex items-center gap-2 mb-1">
                <CpuIcon className="w-4 h-4 text-secondary" /> Default Embedding Provider
              </h3>
              <p className="text-xs opacity-60 mb-3">
                Embedding-capable provider/profile used by memory and semantic search features.
              </p>
              <div className="form-control w-full">
                <select
                  className="select select-bordered select-sm w-full"
                  value={defaultEmbeddingProvider}
                  onChange={(e) => onDefaultEmbeddingChange(e.target.value)}
                  disabled={loading}
                  aria-busy={loading}
                >
                  <option value="">None Selected</option>
                  {embeddingProfiles.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Advanced Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <Toggle
            label="Advanced"
            color="primary"
            size="sm"
            checked={advancedMode}
            onChange={(e) => setAdvancedMode(e.target.checked)}
          />
        </div>

        {/* Advanced Settings -- hidden behind toggle */}
        {advancedMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* System Default (env-var fallback) */}
              <Card
                className={`bg-base-100 shadow-sm border ${defaultStatus?.configured ? 'border-success/20' : 'border-warning/20'}`}
              >
                <div className="card-body p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold flex items-center gap-2">
                      <ConfigIcon className="w-4 h-4" /> System Default
                    </h3>
                    {defaultStatus?.configured ? (
                      <Badge variant="success" size="small">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="small">
                        Not Set
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs opacity-60 mb-3">
                    Fallback loaded from environment variables. Used when no profile is assigned.
                  </p>
                  {defaultStatus?.providers?.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 p-2 bg-base-200/50 rounded text-sm"
                    >
                      {getProviderIcon(p.type)}
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="neutral" size="small" className="ml-auto">
                        Read-Only
                      </Badge>
                    </div>
                  ))}
                  {!defaultStatus?.providers?.length && (
                    <div className="alert alert-warning text-xs p-2">
                      <WarningIcon className="w-4 h-4" />
                      <span>No default provider in .env. Bots without a profile will fail.</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* WebUI Intelligence */}
              <Card className="bg-base-100 shadow-sm border border-base-200">
                <div className="card-body p-5">
                  <h3 className="font-bold flex items-center gap-2 mb-1">
                    <ZapIcon className="w-4 h-4 text-warning" /> WebUI Intelligence
                  </h3>
                  <p className="text-xs opacity-60 mb-3">
                    Powers AI assistance features inside the WebUI (e.g. generating bot names).
                  </p>
                  <div className="form-control w-full">
                    <select
                      className="select select-bordered select-sm w-full"
                      value={webuiIntelligenceProvider}
                      onChange={(e) => onWebuiIntelligenceChange(e.target.value)}
                      disabled={loading}
                      aria-busy={loading}
                    >
                      <option value="">None (Disabled)</option>
                      {chatProfiles.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.name} ({p.provider})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            </div>

            {/* Per-use-case toggle */}
            <Card className="bg-base-100 shadow-sm border border-base-200">
              <div className="card-body p-5 flex flex-row items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {perUseCaseEnabled ? (
                      <ToggleOnIcon className="w-5 h-5 text-primary" />
                    ) : (
                      <ToggleOffIcon className="w-5 h-5 opacity-40" />
                    )}
                    Per-Use-Case LLM Profiles
                  </h3>
                  <p className="text-xs opacity-60 mt-0.5">
                    When enabled, assign different profiles to summarisation, moderation, and other
                    tasks independently.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={perUseCaseEnabled}
                  onChange={(e) => onPerUseCaseChange(e.target.checked)}
                />
              </div>
            </Card>

            {/* Per-use-case task profile assignments */}
            {perUseCaseEnabled && (
              <Card className="bg-base-100 shadow-sm border border-primary/20">
                <div className="card-body p-5">
                  <h3 className="font-bold flex items-center gap-2 mb-1">
                    <BrainIcon className="w-4 h-4 text-primary" /> Task Profile Assignments
                  </h3>
                  <p className="text-xs opacity-60 mb-4">
                    Assign a specific LLM profile to each task type. Leave as &quot;Use Default&quot;
                    to fall back to the default chatbot profile.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(
                      [
                        {
                          key: 'LLM_TASK_SEMANTIC_PROVIDER',
                          label: 'Semantic Relevance',
                          icon: <SearchIcon className="w-4 h-4 text-info" />,
                          description:
                            "Determines if a message is relevant to a bot's topic",
                        },
                        {
                          key: 'LLM_TASK_SUMMARY_PROVIDER',
                          label: 'Summarization',
                          icon: <ClockIcon className="w-4 h-4 text-success" />,
                          description: 'Generates conversation summaries and log prose',
                        },
                        {
                          key: 'LLM_TASK_FOLLOWUP_PROVIDER',
                          label: 'Follow-up',
                          icon: <ReplyIcon className="w-4 h-4 text-warning" />,
                          description: 'Generates follow-up questions and continuations',
                        },
                        {
                          key: 'LLM_TASK_IDLE_PROVIDER',
                          label: 'Idle Response',
                          icon: <CoffeeIcon className="w-4 h-4 text-secondary" />,
                          description: 'Handles idle/scheduled responses when no user input',
                        },
                        {
                          key: 'LLM_TASK_WEBUI_PROVIDER',
                          label: 'WebUI Intelligence',
                          icon: <MonitorIcon className="w-4 h-4 text-accent" />,
                          description:
                            'Powers AI-assisted features within the web interface',
                        },
                      ] as const
                    ).map(({ key, label, icon, description }) => (
                      <div
                        key={key}
                        className="flex items-start gap-3 p-3 bg-base-200/40 rounded-lg border border-base-200"
                      >
                        <div className="mt-0.5">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <label className="font-medium text-sm">{label}</label>
                          <p className="text-[11px] opacity-50 mb-2">{description}</p>
                          <select
                            className="select select-bordered select-sm w-full"
                            value={taskProfiles[key] || ''}
                            onChange={(e) => onTaskProfileChange(key, e.target.value)}
                            disabled={loading}
                            aria-busy={loading}
                          >
                            <option value="">Use Default</option>
                            {chatProfiles.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.name} ({p.provider})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

