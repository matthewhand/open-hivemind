/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Sparkles, Filter, RefreshCw, Plus, ArrowRight } from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { LoadingSpinner } from '../components/DaisyUI';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  const fetchTemplates = async () => {
    setLoading(true);
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
    return colors[platform?.toLowerCase()] || 'badge-ghost';
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPlatform = selectedPlatform === 'all' || template.platform?.toLowerCase() === selectedPlatform.toLowerCase();

      return matchesSearch && matchesPlatform;
    });
  }, [templates, searchTerm, selectedPlatform]);

  const platformOptions = [
    { label: 'All Platforms', value: 'all' },
    { label: 'Discord', value: 'discord' },
    { label: 'Slack', value: 'slack' },
    { label: 'Mattermost', value: 'mattermost' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot Templates"
        description="Quick-start templates to help you create bots faster"
        icon={LayoutTemplate}
        actions={
          <div className="flex gap-2">
            <button
              className="btn btn-ghost"
              onClick={fetchTemplates}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/bots/create')}
            >
              <Plus className="w-4 h-4 mr-2" /> Custom Bot
            </button>
          </div>
        }
      />

      <SearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search templates by name, description, or tags..."
        filters={[
          {
            key: 'platform',
            value: selectedPlatform,
            onChange: setSelectedPlatform,
            options: platformOptions,
            className: "w-48"
          }
        ]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        templates.length === 0 ? (
           <EmptyState
            icon={LayoutTemplate}
            title="No templates available"
            description="There are currently no templates configured in the system."
            actionLabel="Create Custom Bot"
            onAction={() => navigate('/admin/bots/create')}
            variant="noData"
          />
        ) : (
          <EmptyState
            icon={Filter}
            title="No matches found"
            description="Try adjusting your search filters"
            variant="noResults"
            onAction={() => { setSearchTerm(''); setSelectedPlatform('all'); }}
            actionLabel="Clear Filters"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`card bg-base-100 shadow-xl h-full border transition-all hover:shadow-2xl ${
                template.featured ? 'border-primary/50' : 'border-base-200'
              }`}
            >
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="card-title text-lg">
                    {template.name}
                  </h2>
                  {template.featured && (
                    <div className="badge badge-primary gap-1">
                      <Sparkles className="w-3 h-3" /> Featured
                    </div>
                  )}
                </div>

                <p className="text-sm text-base-content/70 mb-4 flex-grow">
                  {template.description}
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <div className={`badge ${getPlatformColor(template.platform)} badge-outline`}>
                      {template.platform.charAt(0).toUpperCase() + template.platform.slice(1)}
                    </div>
                    <div className="badge badge-neutral badge-outline text-xs">
                      {template.persona}
                    </div>
                    <div className="badge badge-neutral badge-outline text-xs">
                      {template.llmProvider}
                    </div>
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <div key={tag} className="badge badge-ghost badge-sm text-xs opacity-70">
                          #{tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-actions mt-auto pt-4 border-t border-base-200">
                  <button
                    className="btn btn-primary btn-outline btn-sm w-full gap-2 group"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
