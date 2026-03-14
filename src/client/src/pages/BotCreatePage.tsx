/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Save, ArrowLeft, Gamepad2, Hash, MessageSquare, Send, Check } from 'lucide-react';
import Breadcrumbs from '../components/DaisyUI/Breadcrumbs';
import { Alert } from '../components/DaisyUI/Alert';
import PageHeader from '../components/DaisyUI/PageHeader';
import Button from '../components/DaisyUI/Button';
import Input from '../components/DaisyUI/Input';
import Textarea from '../components/DaisyUI/Textarea';
import Select from '../components/DaisyUI/Select';
import { useLlmStatus } from '../hooks/useLlmStatus';
import AIAssistButton from '../components/AIAssistButton';
import { apiService } from '../services/api';

const CONFIG_LIMITS = {
  SYSTEM_INSTRUCTION_MIN_LENGTH: 10,
  SYSTEM_INSTRUCTION_WARNING_LENGTH: 2000,
};

const BotCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { status: llmStatus } = useLlmStatus();
  const defaultLlmConfigured = llmStatus?.defaultConfigured ?? false;
  const defaultProviderName = llmStatus?.defaultProviders?.[0]?.name;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'discord',
    persona: 'default',
    llmProvider: '',
    systemInstruction: '',
    mcpServers: [] as string[],
  });

  const [personas, setPersonas] = useState<any[]>([]);
  const [llmProfiles, setLlmProfiles] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [personasResult, profilesResult] = await Promise.allSettled([
          apiService.getPersonas(),
          apiService.getLlmProfiles(),
        ]);
        const personasData = personasResult.status === 'fulfilled' ? personasResult.value : [];
        const profilesData = profilesResult.status === 'fulfilled' ? profilesResult.value : {};

        let mcpResponse: any = { data: [] };
        try {
          const res = await fetch('/api/admin/mcp-servers');
          if (res.ok) {
            mcpResponse = await res.json();
          }
        } catch {
          // Silent fallback for MCP servers
        }

        setPersonas(personasData || []);
        setLlmProfiles(profilesData?.llm || profilesData?.profiles?.llm || []);
        const servers = mcpResponse?.data || mcpResponse || [];
        setMcpServers(Array.isArray(servers) ? servers : []);
      } catch (err) {
        console.error('Failed to load data', err);
        setAlert({ type: 'error', message: 'Failed to load configuration data' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const breadcrumbItems = [
    { label: 'Bots', href: '/admin/bots' },
    { label: 'Create Bot', href: '/admin/bots/create', isActive: true },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setAlert(null);

    try {
      await apiService.createBot({
        name: formData.name,
        description: formData.description,
        messageProvider: formData.platform,
        llmProvider: formData.llmProvider || undefined,
        persona: formData.persona,
        systemInstruction: formData.systemInstruction || undefined,
        mcpServers: formData.mcpServers,
      } as any);

      setAlert({ type: 'success', message: 'Bot created successfully!' });
      setTimeout(() => navigate('/admin/bots'), 1500);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create bot',
      });
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const platforms = [
    { id: 'discord', name: 'Discord', icon: Gamepad2, color: 'text-indigo-500' },
    { id: 'slack', name: 'Slack', icon: Hash, color: 'text-purple-500' },
    { id: 'mattermost', name: 'Mattermost', icon: MessageSquare, color: 'text-blue-500' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'text-sky-500' },
  ];

  const selectedPersona = personas.find(p => p.id === formData.persona);
  const chatCapableProfiles = llmProfiles.filter((profile: any) => profile?.modelType !== 'embedding');
  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Create New Bot"
        description="Configure a new bot instance with persona and provider settings."
        icon={Bot}
        gradient="primary"
        actions={
          <Button variant="ghost" onClick={() => navigate('/admin/bots')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bots
          </Button>
        }
      />

      {alert && (
        <Alert
          status={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Bot Identity Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Bot Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Bot Name <span className="text-error">*</span></span>
                      <AIAssistButton
                        label="Generate Name"
                        prompt={`Generate a creative name for a chat bot${formData.description ? ` that is described as: "${formData.description}"` : ''
                          }.`}
                        systemPrompt="You are a creative naming assistant. Output only the name, nothing else. Do not use quotes."
                        onSuccess={(result) => handleInputChange('name', result)}
                      />
                    </label>
                    <Input
                      placeholder="e.g. HelpBot"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="input-bordered"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Description</span>
                      <AIAssistButton
                        label="Generate Description"
                        prompt={`Generate a short, engaging description (max 2 sentences) for a chat bot${formData.name ? ` named "${formData.name}"` : ''
                          }.`}
                        systemPrompt="You are a creative writing assistant. Output only the description, nothing else."
                        onSuccess={(result) => handleInputChange('description', result)}
                      />
                    </label>
                    <Textarea
                      placeholder="Describe what this bot will do..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="h-24 textarea-bordered"
                    />
                  </div>
                </div>
              </div>

              {/* Platform Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Message Platform</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {platforms.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = formData.platform === platform.id;
                    return (
                      <div
                        key={platform.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleInputChange('platform', platform.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleInputChange('platform', platform.id);
                          }
                        }}
                        className={`
                          cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md
                          flex flex-col items-center justify-center gap-2 relative
                          ${isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-base-200 hover:border-primary/50 bg-base-100'}
                        `}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-primary">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                        <Icon className={`w-8 h-8 ${platform.color}`} />
                        <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                          {platform.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Persona & Intelligence */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Intelligence & Personality</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Persona */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Persona</span>
                    </label>
                    <Select
                      value={formData.persona}
                      onChange={(e) => handleInputChange('persona', e.target.value)}
                      className="select-bordered w-full"
                    >
                      <option value="default">Default Assistant</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>

                    {/* Persona Preview Card */}
                    <div className="mt-3 p-4 bg-base-200/50 rounded-lg border border-base-200 text-sm">
                      <div className="font-semibold mb-1">
                        {formData.persona === 'default' ? 'Default Assistant' : selectedPersona?.name}
                      </div>
                      <div className="text-base-content/70 italic">
                        {formData.persona === 'default'
                          ? "A helpful, general-purpose AI assistant ready to answer questions and assist with tasks."
                          : selectedPersona?.description || "No description available."}
                      </div>
                    </div>
                  </div>

                  {/* System Instruction */}
                  <div className="form-control w-full md:col-span-2">
                    <label className="label">
                      <span className="label-text font-medium">System Instruction</span>
                      <AIAssistButton
                        label="Generate Instruction"
                        prompt={`Generate a system instruction for a chat bot${formData.name ? ` named "${formData.name}"` : ''
                          }${formData.description ? ` that is described as: "${formData.description}"` : ''
                          }.`}
                        systemPrompt="You are a system instruction generation assistant. Output only the prompt, nothing else."
                        onSuccess={(result) => handleInputChange('systemInstruction', result)}
                      />
                    </label>
                    <Textarea
                      placeholder="e.g., You are a helpful and concise assistant."
                      value={formData.systemInstruction}
                      onChange={(e) => handleInputChange('systemInstruction', e.target.value)}
                      className="h-24 textarea-bordered"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex-1">
                        {formData.systemInstruction && formData.systemInstruction.length < CONFIG_LIMITS.SYSTEM_INSTRUCTION_MIN_LENGTH && (
                          <div className="text-warning text-xs">
                            System instruction is very short. Consider providing more detail.
                          </div>
                        )}
                        {formData.systemInstruction && formData.systemInstruction.length > CONFIG_LIMITS.SYSTEM_INSTRUCTION_WARNING_LENGTH && (
                          <div className="text-error text-xs">
                            System instruction is very long (max {CONFIG_LIMITS.SYSTEM_INSTRUCTION_WARNING_LENGTH} chars recommended).
                          </div>
                        )}
                      </div>
                      <div className={`text-xs opacity-50 ${formData.systemInstruction.length > CONFIG_LIMITS.SYSTEM_INSTRUCTION_WARNING_LENGTH ? 'text-error font-bold' : ''}`}>
                        {formData.systemInstruction.length}/{CONFIG_LIMITS.SYSTEM_INSTRUCTION_WARNING_LENGTH}
                      </div>
                    </div>
                  </div>

                  {/* LLM Provider */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">
                        LLM Provider {defaultLlmConfigured ? '(optional)' : <span className="text-error">*</span>}
                      </span>
                      <a href="/admin/integrations/llm" target="_blank" rel="noopener noreferrer" className="link link-primary text-xs">Manage Providers</a>
                    </label>
                    <Select
                      value={formData.llmProvider}
                      onChange={(e) => handleInputChange('llmProvider', e.target.value)}
                      className="select-bordered w-full"
                    >
                      <option value="">
                        {defaultLlmConfigured
                          ? `Use System Default ${llmStatus?.defaultProviders?.[0]?.name ? `(${llmStatus.defaultProviders[0].name})` : ''}`
                          : 'Select Provider...'}
                      </option>
                      {chatCapableProfiles.map((p) => (
                        <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                      ))}
                    </Select>
                    <label className="label">
                      {!defaultLlmConfigured && !formData.llmProvider && (
                        <span className="label-text-alt text-error">
                          System default is not configured. Please select a provider.
                        </span>
                      )}
                      {defaultLlmConfigured && !formData.llmProvider && (
                        <span className="label-text-alt text-success flex items-center gap-1">
                          <Check className="w-3 h-3" /> Using system default configuration
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Tools & Capabilities */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Tools & Capabilities</h3>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">MCP Servers</span>
                    <a href="/admin/mcp/servers" target="_blank" rel="noopener noreferrer" className="link link-primary text-xs">Manage MCP Servers</a>
                  </label>
                  <div className="text-sm text-base-content/70 mb-3">
                    Select the Model Context Protocol (MCP) servers this bot can access to use external tools and data.
                  </div>
                  {mcpServers.length === 0 ? (
                    <div className="p-4 bg-base-200/50 rounded-lg border border-base-200 text-sm text-center">
                      No MCP servers available.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-base-200 rounded-lg bg-base-100">
                      {mcpServers.map((server) => {
                        const isSelected = formData.mcpServers.includes(server.id || server.name);
                        return (
                          <label
                            key={server.id || server.name}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-base-200 hover:border-primary/30'
                              }`}
                          >
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary checkbox-sm mt-0.5"
                              checked={isSelected}
                              onChange={(e) => {
                                const serverId = server.id || server.name;
                                if (!serverId) {
                                  console.warn('Server ID or name is required');
                                  return;
                                }
                                setFormData(prev => ({
                                  ...prev,
                                  mcpServers: e.target.checked
                                    ? [...prev.mcpServers, serverId]
                                    : prev.mcpServers.filter(id => id !== serverId)
                                }));
                              }}
                              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${server.name}`}
                              aria-describedby={`server-desc-${server.id || server.name}`}
                            />
                            <div>
                              <div className="font-medium text-sm">{server.name}</div>
                              {server.description && (
                                <div id={`server-desc-${server.id || server.name}`} className="text-xs text-base-content/70 mt-1 line-clamp-2">
                                  {server.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button
                  variant="primary"
                  type="submit"
                  loading={isCreating}
                  disabled={!formData.name || (!defaultLlmConfigured && !formData.llmProvider)}
                  className="btn-wide"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Bot
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotCreatePage;
