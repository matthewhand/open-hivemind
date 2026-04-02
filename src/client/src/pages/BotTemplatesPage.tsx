/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import EmptyState from '../components/DaisyUI/EmptyState';
import { SkeletonGrid } from '../components/DaisyUI/Skeleton';
import { Copy, Check, Search, RefreshCw } from 'lucide-react';
import Carousel from '../components/DaisyUI/Carousel';
import SearchFilterBar from '../components/SearchFilterBar';
import useUrlParams from '../hooks/useUrlParams';
import { apiService } from '../services/api';
import Badge from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';

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

  // Filter States (URL-persisted)
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    platform: { type: 'string', default: 'All' },
    persona: { type: 'string', default: 'All' },
    llm: { type: 'string', default: 'All' },
  });
  const selectedPlatform = urlParams.platform;
  const setSelectedPlatform = (v: string) => setUrlParam('platform', v);
  const selectedPersona = urlParams.persona;
  const setSelectedPersona = (v: string) => setUrlParam('persona', v);
  const selectedLlmProvider = urlParams.llm;
  const setSelectedLlmProvider = (v: string) => setUrlParam('llm', v);
  const searchTerm = urlParams.search;
  const setSearchTerm = (v: string) => setUrlParam('search', v);
  const [copied, setCopied] = useState(false);


  const fetchTemplates = useCallback(async () => {
    try {
      const json = await apiService.get('/api/bot-config/templates');
      const apiTemplates = (json as any).data?.templates || {};

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
    } catch (error) {
      // Silent: empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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
      // Clipboard may not be available
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'discord': return 'primary' as const;
      case 'slack': return 'secondary' as const;
      case 'mattermost': return 'info' as const;
      case 'webhook': return 'success' as const;
      default: return 'neutral' as const;
    }
  };

  // Derive unique options for filters
  const platformOptions = useMemo(() => {
    const unique = Array.from(new Set(templates.map(t => t.platform)));
    return [
      { label: 'All Platforms', value: 'All' },
      ...unique.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))
    ];
  }, [templates]);

  const personaOptions = useMemo(() => {
    const unique = Array.from(new Set(templates.map(t => t.persona)));
    return [
      { label: 'All Personas', value: 'All' },
      ...unique.map(p => ({ label: p, value: p }))
    ];
  }, [templates]);

  const llmOptions = useMemo(() => {
    const unique = Array.from(new Set(templates.map(t => t.llmProvider)));
    return [
      { label: 'All Providers', value: 'All' },
      ...unique.map(p => ({ label: p, value: p }))
    ];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchPlatform = selectedPlatform === 'All' || t.platform === selectedPlatform;
      const matchPersona = selectedPersona === 'All' || t.persona === selectedPersona;
      const matchLlm = selectedLlmProvider === 'All' || t.llmProvider === selectedLlmProvider;
      const matchSearch = searchTerm === '' ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchPlatform && matchPersona && matchLlm && matchSearch;
    });
  }, [templates, selectedPlatform, selectedPersona, selectedLlmProvider, searchTerm]);

  const handleClearFilters = () => {
    setSelectedPlatform('All');
    setSelectedPersona('All');
    setSelectedLlmProvider('All');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonGrid count={6} showImage />
      </div>
    );
  }

  return (
    <div className="p-6">


      <div className="mt-4 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bot Templates
            </h1>
            <p className="text-base-content/70">
              Quick-start templates to help you create bots faster. Choose a template and customize it for your needs.
            </p>
          </div>
          <Button
            buttonStyle="outline"
            onClick={() => navigate('/admin/bots/create')}
          >
            Create Custom Bot
          </Button>
        </div>

        {/* Recommended Templates Carousel */}
        {templates.length > 0 && (
          <div className="mb-8 mt-6">
            <h2 className="text-xl font-semibold mb-4">Recommended Templates</h2>
            <Carousel
              items={templates.slice(0, 3).map(t => ({
                image: '',
                title: t.name,
                description: t.description,
                bgGradient: t.platform === 'discord' ? 'linear-gradient(135deg, #5865F2, #7289DA)' :
                  t.platform === 'slack' ? 'linear-gradient(135deg, #E01E5A, #36C5F0)' :
                    'linear-gradient(135deg, #4f46e5, #7c3aed)'
              }))}
              autoplay={true}
              interval={5000}
              variant="card-style"
            />
          </div>
        )}

        {/* Filters */}
        <SearchFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search templates..."
          filters={[
            {
              key: 'platform',
              value: selectedPlatform,
              onChange: setSelectedPlatform,
              options: platformOptions,
              className: 'w-full sm:w-40'
            },
            {
              key: 'persona',
              value: selectedPersona,
              onChange: setSelectedPersona,
              options: personaOptions,
              className: 'w-full sm:w-40'
            },
            {
              key: 'llm',
              value: selectedLlmProvider,
              onChange: setSelectedLlmProvider,
              options: llmOptions,
              className: 'w-full sm:w-40'
            }
          ]}
          onClear={handleClearFilters}
        />
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
                    <Badge variant="primary">Featured</Badge>
                  )}
                </div>

                <p className="text-sm text-base-content/70 mb-4">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant={getPlatformColor(template.platform)}>
                    {template.platform.charAt(0).toUpperCase() + template.platform.slice(1)}
                  </Badge>
                  <Badge style="outline">{template.persona}</Badge>
                  <Badge style="outline">{template.llmProvider}</Badge>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="neutral" size="small" style="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="card-actions mt-auto">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                  <Button
                    variant="ghost"
                    className="btn-square"
                    onClick={() => handleCopyTemplate(template)}
                    title="Copy template JSON"
                    aria-label="Copy template JSON"
                  >
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              title="No templates found"
              description="No templates match your current filters."
              actionLabel="Clear Filters"
              onAction={handleClearFilters}
              icon={Search}
              variant="noResults"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BotTemplatesPage;
