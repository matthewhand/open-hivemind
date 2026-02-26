/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import { Copy, Check } from 'lucide-react';

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

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedPersona, setSelectedPersona] = useState<string>('All');
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  const breadcrumbItems = [
    { label: 'Bots', href: '/admin/bots' },
    { label: 'Templates', href: '/admin/bots/templates', isActive: true },
  ];

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/bot-config/templates');
      if (res.ok) {
        const json = await res.json();
        const apiTemplates = json.data?.templates || {};

        // Backend returns an object (map), convert to array
        const templatesArray = Object.entries(apiTemplates).map(([key, t]: [string, any]) => ({
          id: key,
          name: t.name,
          description: t.description,
          platform: t.messageProvider,
          llmProvider: t.llmProvider,
          persona: t.persona || 'General', // Default if missing
          tags: t.tags || [],
          featured: false // Default
        }));

        setTemplates(templatesArray);
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
    navigate('/admin/bots/create', {
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

  const handleCopyTemplate = async (template: BotTemplate) => {
    const templateJson = JSON.stringify({
      name: template.name,
      description: template.description,
      messageProvider: template.platform,
      llmProvider: template.llmProvider,
      persona: template.persona,
      tags: template.tags,
    }, null, 2);

    try {
      await navigator.clipboard.writeText(templateJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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

  // Derive unique options for filters
  const platforms = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.platform)))], [templates]);
  const personas = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.persona)))], [templates]);
  const llmProviders = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.llmProvider)))], [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchSearch = searchTerm === '' ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPlatform = selectedPlatform === 'All' || t.platform === selectedPlatform;
      const matchPersona = selectedPersona === 'All' || t.persona === selectedPersona;
      const matchLlm = selectedLlmProvider === 'All' || t.llmProvider === selectedLlmProvider;
      return matchSearch && matchPlatform && matchPersona && matchLlm;
    });
  }, [templates, searchTerm, selectedPlatform, selectedPersona, selectedLlmProvider]);

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

        {/* Filters */}
        <div className="mt-6">
          <SearchFilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search templates..."
            filters={[
              {
                key: 'platform',
                value: selectedPlatform,
                onChange: setSelectedPlatform,
                options: platforms.map(p => ({
                  label: p === 'All' ? 'All Platforms' : p.charAt(0).toUpperCase() + p.slice(1),
                  value: p
                })),
                className: 'w-full sm:w-48'
              },
              {
                key: 'persona',
                value: selectedPersona,
                onChange: setSelectedPersona,
                options: personas.map(p => ({
                  label: p === 'All' ? 'All Personas' : p,
                  value: p
                })),
                className: 'w-full sm:w-48'
              },
              {
                key: 'llmProvider',
                value: selectedLlmProvider,
                onChange: setSelectedLlmProvider,
                options: llmProviders.map(p => ({
                  label: p === 'All' ? 'All Providers' : p,
                  value: p
                })),
                className: 'w-full sm:w-48'
              }
            ]}
            onClear={() => {
              setSearchTerm('');
              setSelectedPlatform('All');
              setSelectedPersona('All');
              setSelectedLlmProvider('All');
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
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
                    className="btn btn-primary flex-1"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </button>
                  <button
                    className="btn btn-ghost btn-square"
                    onClick={() => handleCopyTemplate(template)}
                    title="Copy template JSON"
                  >
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-lg text-base-content/60">No templates match your filters.</p>
            <button className="btn btn-ghost btn-sm mt-2" onClick={() => {
              setSearchTerm('');
              setSelectedPlatform('All');
              setSelectedPersona('All');
              setSelectedLlmProvider('All');
            }}>Clear Filters</button>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          className="btn btn-outline"
          onClick={() => navigate('/admin/bots/create')}
        >
          Create Custom Bot
        </button>
      </div>
    </div>
  );
};

export default BotTemplatesPage;