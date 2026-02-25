/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, EmptyState, PageHeader } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import { PlusIcon, Square3Stack3DIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const breadcrumbItems = [
    { label: 'Bots', href: '/uber/bots' },
    { label: 'Templates', href: '/uber/bots/templates', isActive: true },
  ];

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/config/templates');
      if (res.ok) {
        const json = await res.json();
        const apiTemplates = json.templates || []; // Corrected to match api/config/templates response structure
        // Map backend fields to frontend interface if necessary
        const mapped = apiTemplates.map((t: any) => ({
          ...t,
          platform: t.provider || t.messageProvider || 'unknown', // Fallback
          llmProvider: t.content?.llmProvider || t.llmProvider || 'default',
          persona: t.content?.persona || t.persona || 'default',
          tags: t.tags || [],
        }));
        setTemplates(mapped);
      } else {
        throw new Error(`Failed to fetch templates: ${res.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.platform.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }, [templates, searchQuery]);

  const handleUseTemplate = (template: BotTemplate) => {
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

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      discord: 'badge-primary',
      slack: 'badge-secondary',
      mattermost: 'badge-info',
      telegram: 'badge-success',
    };
    return colors[platform.toLowerCase()] || 'badge-ghost';
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Bot Templates"
        description="Quick-start templates to help you create bots faster. Choose a template and customize it for your needs."
        icon={Square3Stack3DIcon}
      />

      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search templates by name, platform, or tag..."
        />
      </div>

      {error && (
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <span>{error}</span>
          <button className="btn btn-sm" onClick={fetchTemplates}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">Loading templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Custom Bot Card - Always first */}
          <div className="card bg-base-100 shadow-xl border border-dashed border-base-content/30 hover:border-primary transition-colors cursor-pointer group" onClick={() => navigate('/admin/bots/create')}>
            <div className="card-body items-center justify-center text-center">
              <div className="p-4 bg-base-200 rounded-full group-hover:bg-primary/10 transition-colors mb-4">
                <PlusIcon className="w-8 h-8 text-base-content/50 group-hover:text-primary transition-colors" />
              </div>
              <h2 className="card-title group-hover:text-primary transition-colors">Create Custom Bot</h2>
              <p className="text-sm text-base-content/70">Start from scratch with a blank configuration</p>
            </div>
          </div>

          {filteredTemplates.length === 0 && searchQuery && (
            <div className="col-span-full">
              <EmptyState
                icon={Square3Stack3DIcon}
                title="No templates found"
                description={`No templates match "${searchQuery}"`}
                actionLabel="Clear Search"
                onAction={() => setSearchQuery('')}
              />
            </div>
          )}

          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`card bg-base-100 shadow-xl h-full border ${template.featured ? 'border-primary border-2' : 'border-base-200'
                } hover:shadow-2xl transition-shadow`}
            >
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="card-title line-clamp-1" title={template.name}>
                    {template.name}
                  </h2>
                  {template.featured && (
                    <div className="badge badge-primary shrink-0">Featured</div>
                  )}
                </div>

                <p className="text-sm text-base-content/70 mb-4 line-clamp-2" title={template.description}>
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className={`badge ${getPlatformColor(template.platform)} badge-sm`}>
                    {template.platform.charAt(0).toUpperCase() + template.platform.slice(1)}
                  </div>
                  <div className="badge badge-outline badge-sm" title="Persona">{template.persona}</div>
                  <div className="badge badge-outline badge-sm" title="LLM Provider">{template.llmProvider}</div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag) => (
                    <div key={tag} className="badge badge-ghost badge-xs opacity-70">
                      {tag}
                    </div>
                  ))}
                </div>

                <div className="card-actions mt-auto">
                  <button
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BotTemplatesPage;
