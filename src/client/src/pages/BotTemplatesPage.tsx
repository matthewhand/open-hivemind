/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/DaisyUI';

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  persona: string;
  llmProvider: string;
  tags: string[];
  featured: boolean;
}

const BotTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const breadcrumbItems = [
    { label: 'Bots', href: '/uber/bots' },
    { label: 'Templates', href: '/uber/bots/templates', isActive: true },
  ];

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/bots/templates');
      if (res.ok) {
        const json = await res.json();
        const apiTemplates = json.data?.templates || [];
        // Map backend fields to frontend interface if necessary
        const mapped = apiTemplates.map((t: any) => ({
          ...t,
          platform: t.messageProvider, // Map messageProvider to platform
        }));
        setTemplates(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleUseTemplate = (template: BotTemplate) => {
    // In real app, this would pre-populate the create form
    navigate('/uber/bots/create', {
      state: {
        template: {
          platform: template.platform,
          persona: template.persona,
          llmProvider: template.llmProvider,
          name: `${template.name} Copy`,
          description: template.description,
        },
      },
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      discord: 'badge-primary',
      slack: 'badge-secondary',
      mattermost: 'badge-info',
      telegram: 'badge-success',
    };
    return colors[platform] || 'badge-ghost';
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-2">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Bot Templates
        </h1>
        <p className="text-base-content/70">
          Quick-start templates to help you create bots faster. Choose a template and customize it for your needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`card bg-base-100 shadow-xl h-full border ${template.featured ? 'border-primary border-2' : 'border-base-200'
              }`}
          >
            <div className="card-body">
              <div className="flex justify-between items-start mb-2">
                <h2 className="card-title">
                  {template.name}
                </h2>
                {template.featured && (
                  <div className="badge badge-primary">Featured</div>
                )}
              </div>

              <p className="text-sm text-base-content/70 mb-4">
                {template.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className={`badge ${getPlatformColor(template.platform)}`}>
                  {template.platform.charAt(0).toUpperCase() + template.platform.slice(1)}
                </div>
                <div className="badge badge-outline">{template.persona}</div>
                <div className="badge badge-outline">{template.llmProvider}</div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {template.tags.map((tag) => (
                  <div key={tag} className="badge badge-ghost badge-sm">
                    {tag}
                  </div>
                ))}
              </div>

              <div className="card-actions mt-auto">
                <button
                  className="btn btn-primary w-full"
                  onClick={() => handleUseTemplate(template)}
                >
                  Use Template
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button
          className="btn btn-outline"
          onClick={() => navigate('/uber/bots/create')}
        >
          Create Custom Bot
        </button>
      </div>
    </div>
  );
};

export default BotTemplatesPage;