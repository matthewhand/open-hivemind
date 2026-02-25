/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, MessageSquare, Brain, Tag } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

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
    return colors[platform?.toLowerCase()] || 'badge-ghost';
  };

  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    if (platformFilter) {
      result = result.filter(t => t.platform.toLowerCase() === platformFilter);
    }

    return result;
  }, [templates, searchQuery, platformFilter]);

  // Extract unique platforms for filter
  const platformOptions = useMemo(() => {
    const platforms = Array.from(new Set(templates.map(t => t.platform)));
    return platforms.map(p => ({
      label: p.charAt(0).toUpperCase() + p.slice(1),
      value: p.toLowerCase(),
    }));
  }, [templates]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="text-base-content/70">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Bot Templates"
        description="Quick-start templates to help you create bots faster. Choose a template and customize it for your needs."
        icon={LayoutTemplate}
        actions={
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/uber/bots/create')}
          >
            Create Custom Bot
          </button>
        }
      />

      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search templates by name, description, or tags..."
        filters={[
          {
            key: 'platform',
            value: platformFilter,
            onChange: (val) => setPlatformFilter(val as string),
            options: [{ label: 'All Platforms', value: '' }, ...platformOptions],
          }
        ]}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No Templates Available"
          description="There are currently no bot templates available."
          actionLabel="Create Custom Bot"
          onAction={() => navigate('/uber/bots/create')}
          variant="noData"
        />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No Matches Found"
          description={`No templates match "${searchQuery}"`}
          actionLabel="Clear Filters"
          onAction={() => { setSearchQuery(''); setPlatformFilter(''); }}
          variant="noResults"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
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

                <p className="text-sm text-base-content/70 mb-4 h-12 line-clamp-2">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className={`badge ${getPlatformColor(template.platform)} gap-1`}>
                    <MessageSquare className="w-3 h-3" />
                    {template.platform.charAt(0).toUpperCase() + template.platform.slice(1)}
                  </div>
                  <div className="badge badge-outline gap-1">
                    <Brain className="w-3 h-3" />
                    {template.persona}
                  </div>
                  <div className="badge badge-outline">
                    {template.llmProvider}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag) => (
                    <div key={tag} className="badge badge-ghost badge-sm gap-1">
                      <Tag className="w-3 h-3" />
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
      )}
    </div>
  );
};

export default BotTemplatesPage;
