/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Save, Gamepad2, Hash, MessageSquare, Send, Info } from 'lucide-react';
import {
  Breadcrumbs,
  Alert,
  PageHeader,
  Button,
  Input,
  Textarea,
  Select,
} from '../components/DaisyUI';
import { useLlmStatus } from '../hooks/useLlmStatus';
import AIAssistButton from '../components/AIAssistButton';
import { apiService } from '../services/api';

const BotCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { status: llmStatus } = useLlmStatus();
  const defaultLlmConfigured = llmStatus?.defaultConfigured ?? false;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'discord',
    persona: 'default',
    llmProvider: '',
  });

  const [personas, setPersonas] = useState<any[]>([]);
  const [llmProfiles, setLlmProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [personasData, profilesData] = await Promise.all([
          apiService.getPersonas(),
          apiService.getLlmProfiles(),
        ]);
        setPersonas(personasData || []);
        setLlmProfiles(profilesData?.profiles?.llm || []);
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
    { id: 'discord', name: 'Discord', icon: Gamepad2 },
    { id: 'slack', name: 'Slack', icon: Hash },
    { id: 'mattermost', name: 'Mattermost', icon: MessageSquare },
    { id: 'telegram', name: 'Telegram', icon: Send },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Create New Bot"
        description="Configure a new bot instance with persona and provider settings."
        icon={Bot}
        gradient="primary"
      />

      {alert && (
        <Alert
          status={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="card bg-base-100 shadow-xl max-w-3xl mx-auto">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bot Name */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Bot Name <span className="text-error">*</span></span>
                  <AIAssistButton
                    label="Generate Name"
                    prompt={`Generate a creative name for a chat bot${
                      formData.description ? ` that is described as: "${formData.description}"` : ''
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
                />
              </div>

              {/* Description */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                  <AIAssistButton
                    label="Generate Description"
                    prompt={`Generate a short, engaging description (max 2 sentences) for a chat bot${
                      formData.name ? ` named "${formData.name}"` : ''
                    }.`}
                    systemPrompt="You are a creative writing assistant. Output only the description, nothing else."
                    onSuccess={(result) => handleInputChange('description', result)}
                  />
                </label>
                <Textarea
                  placeholder="Describe what this bot will do..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Platform */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">Message Platform <span className="text-error">*</span></span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = formData.platform === platform.id;
                      return (
                        <div
                          key={platform.id}
                          className={`
                            cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all
                            ${isSelected
                              ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100'
                              : 'border-base-300 hover:border-base-content/30 hover:bg-base-200/50'}
                          `}
                          onClick={() => handleInputChange('platform', platform.id)}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-base-content/50'}`} />
                          <span className={`font-semibold text-xs ${isSelected ? 'text-primary' : ''}`}>
                            {platform.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Persona */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">Persona</span>
                  </label>
                  <Select
                    value={formData.persona}
                    onChange={(e) => handleInputChange('persona', e.target.value)}
                  >
                    <option value="default">Default Assistant</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>

                  {/* Preview */}
                  {formData.persona !== 'default' && (
                    <div className="mt-2 p-3 bg-base-200 rounded-lg text-xs opacity-80 border border-base-300">
                      <span className="font-bold block mb-1">
                        {personas.find((p) => p.id === formData.persona)?.name}
                      </span>
                      {personas.find((p) => p.id === formData.persona)?.description}
                    </div>
                  )}
                  {formData.persona === 'default' && (
                    <div className="mt-2 p-3 bg-base-200/50 rounded-lg text-xs opacity-60 italic">
                      Standard assistant behavior without specific persona traits.
                    </div>
                  )}
                </div>
              </div>

              {/* LLM Provider */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">
                    LLM Provider {defaultLlmConfigured ? '(optional)' : <span className="text-error">*</span>}
                  </span>
                  <a
                    href="/admin/integrations/llm"
                    target="_blank"
                    className="link link-primary text-xs"
                    rel="noreferrer"
                  >
                    Manage Providers
                  </a>
                </label>
                <Select
                  value={formData.llmProvider}
                  onChange={(e) => handleInputChange('llmProvider', e.target.value)}
                >
                  <option value="">
                    {defaultLlmConfigured ? 'Use System Default' : 'Select Provider...'}
                  </option>
                  {llmProfiles.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.provider})
                    </option>
                  ))}
                </Select>

                {/* Default Info */}
                {!formData.llmProvider && defaultLlmConfigured && llmStatus?.defaultProviders && (
                  <div className="label-text-alt mt-2 text-info flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Using system default:{' '}
                    <span className="font-semibold">
                      {llmStatus.defaultProviders.map((p: any) => p.name).join(', ')}
                    </span>
                  </div>
                )}

                {!defaultLlmConfigured && !formData.llmProvider && (
                  <div className="text-error text-xs mt-1">
                    System default is not configured. Please select a provider.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="primary"
                  type="submit"
                  loading={isCreating}
                  disabled={!formData.name || (!defaultLlmConfigured && !formData.llmProvider)}
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
