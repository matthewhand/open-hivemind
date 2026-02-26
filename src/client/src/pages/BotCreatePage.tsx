/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Save, ArrowLeft, Gamepad2, Hash, MessageSquare, Send, Check } from 'lucide-react';
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
    { id: 'discord', name: 'Discord', icon: Gamepad2, color: 'text-indigo-500' },
    { id: 'slack', name: 'Slack', icon: Hash, color: 'text-purple-500' },
    { id: 'mattermost', name: 'Mattermost', icon: MessageSquare, color: 'text-blue-500' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'text-sky-500' },
  ];

  const selectedPersona = personas.find(p => p.id === formData.persona);

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
                      className="input-bordered"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Description</span>
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

                  {/* LLM Provider */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">
                        LLM Provider {defaultLlmConfigured ? '(optional)' : <span className="text-error">*</span>}
                      </span>
                      <a href="/admin/integrations/llm" target="_blank" className="link link-primary text-xs">Manage Providers</a>
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
                      {llmProfiles.map((p) => (
                        <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                      ))}
                    </Select>
                    {!defaultLlmConfigured && !formData.llmProvider && (
                      <div className="text-error text-xs mt-1">
                        System default is not configured. Please select a provider.
                      </div>
                    )}
                    {defaultLlmConfigured && !formData.llmProvider && (
                      <div className="text-success text-xs mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Using system default configuration
                      </div>
                    )}
                  </div>
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
