import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, Alert } from '../components/DaisyUI';
import { useLlmStatus } from '../hooks/useLlmStatus';

const BotCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { status: llmStatus } = useLlmStatus();
  const defaultLlmConfigured = llmStatus?.defaultConfigured ?? false;
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'discord',
    persona: 'friendly-helper',
    llmProvider: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const breadcrumbItems = [
    { label: 'Bots', href: '/uber/bots' },
    { label: 'Create Bot', href: '/uber/bots/create', isActive: true },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/webui/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ...(formData.llmProvider ? {} : { llmProvider: undefined }),
        }),
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Bot created successfully!' });
        setTimeout(() => navigate('/uber/bots'), 2000);
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: error.message || 'Failed to create bot' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error occurred' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Breadcrumbs items={breadcrumbItems} />

      <h1 className="text-3xl font-bold mt-4 mb-6">
        Create New Bot
      </h1>

      {alert && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Bot Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="Enter a unique name for your bot"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this bot will do"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Platform</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.platform}
                onChange={(e) => handleInputChange('platform', e.target.value)}
              >
                <option value="discord">Discord</option>
                <option value="slack">Slack</option>
                <option value="mattermost">Mattermost</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Persona</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.persona}
                onChange={(e) => handleInputChange('persona', e.target.value)}
              >
                <option value="friendly-helper">Friendly Helper</option>
                <option value="dev-assistant">Developer Assistant</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">LLM Provider {defaultLlmConfigured ? '(optional)' : '*'}</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.llmProvider}
                onChange={(e) => handleInputChange('llmProvider', e.target.value)}
              >
                {defaultLlmConfigured ? (
                  <option value="">Use default LLM</option>
                ) : (
                  <option value="">Select Provider</option>
                )}
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="openwebui">Open WebUI</option>
                <option value="flowise">Flowise</option>
              </select>
              {!defaultLlmConfigured && (
                <div className="alert alert-warning mt-2">
                  <span>No default LLM is configured. Configure one or select an LLM for this bot.</span>
                  <a
                    className="btn btn-xs btn-outline ml-auto"
                    href="/admin/integrations/llm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Configure LLM
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-8">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/uber/bots')}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreating || !formData.name}
              >
                {isCreating ? <span className="loading loading-spinner"></span> : null}
                {isCreating ? 'Creating...' : 'Create Bot'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BotCreatePage;
