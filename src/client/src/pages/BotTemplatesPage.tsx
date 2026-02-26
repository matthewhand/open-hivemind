/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, Modal, Button } from '../components/DaisyUI';
import { Copy, Check, Eye, Bot, Sparkles, Code, MessageSquare, Briefcase, Hash } from 'lucide-react';

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
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedPersona, setSelectedPersona] = useState<string>('All');
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
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

        const templatesArray = Object.entries(apiTemplates).map(([key, t]: [string, any]) => ({
          id: key,
          name: t.name,
          description: t.description,
          platform: t.messageProvider,
          llmProvider: t.llmProvider,
          persona: t.persona || 'General',
          tags: t.tags || [],
          featured: false
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

  const handlePreview = (template: BotTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
    case 'discord': return <MessageSquare className="w-4 h-4" />;
    case 'slack': return <Hash className="w-4 h-4" />;
    case 'mattermost': return <MessageSquare className="w-4 h-4" />;
    case 'telegram': return <MessageSquare className="w-4 h-4" />;
    default: return <Bot className="w-4 h-4" />;
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

  const platforms = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.platform)))], [templates]);
  const personas = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.persona)))], [templates]);
  const llmProviders = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.llmProvider)))], [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchPlatform = selectedPlatform === 'All' || t.platform === selectedPlatform;
      const matchPersona = selectedPersona === 'All' || t.persona === selectedPersona;
      const matchLlm = selectedLlmProvider === 'All' || t.llmProvider === selectedLlmProvider;
      return matchPlatform && matchPersona && matchLlm;
    });
  }, [templates, selectedPlatform, selectedPersona, selectedLlmProvider]);

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
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Bot Templates</h1>
        </div>
        <p className="text-base-content/70 max-w-2xl">
          Start building faster with pre-configured bot templates. Choose from various platforms, personas, and use cases.
        </p>

        {/* Visual Filters */}
        <div className="mt-8 space-y-4">
          {/* Platform Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-sm font-semibold mr-2 text-base-content/60 uppercase tracking-wide">Platform:</span>
            {platforms.map(platform => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`btn btn-sm normal-case gap-2 transition-all ${selectedPlatform === platform
                  ? 'btn-primary shadow-md scale-105'
                  : 'btn-ghost bg-base-200/50 hover:bg-base-300'}`}
              >
                {platform !== 'All' && getPlatformIcon(platform)}
                {platform === 'All' ? 'All Platforms' : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>

          {/* Persona Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-sm font-semibold mr-2 text-base-content/60 uppercase tracking-wide">Persona:</span>
            {personas.map(persona => (
              <button
                key={persona}
                onClick={() => setSelectedPersona(persona)}
                className={`btn btn-sm normal-case transition-all ${selectedPersona === persona
                  ? 'btn-secondary shadow-md'
                  : 'btn-ghost bg-base-200/50 hover:bg-base-300'}`}
              >
                {persona === 'All' ? 'All Personas' : persona}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 border h-full group ${
                template.featured ? 'border-primary/50 ring-2 ring-primary/10' : 'border-base-200'
              }`}
            >
              <div className="card-body p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-2 rounded-xl bg-base-200 group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300`}>
                    <Bot className="w-6 h-6" />
                  </div>
                  {template.featured && (
                    <div className="badge badge-primary badge-sm">Featured</div>
                  )}
                </div>

                <h2 className="card-title text-lg font-bold mb-1">
                  {template.name}
                </h2>
                <p className="text-sm text-base-content/70 mb-4 line-clamp-2 min-h-[2.5rem]">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className={`badge badge-sm gap-1 ${getPlatformColor(template.platform)}`}>
                    {getPlatformIcon(template.platform)}
                    {template.platform}
                  </div>
                  <div className="badge badge-outline badge-sm">{template.persona}</div>
                </div>

                <div className="flex flex-wrap gap-1 mt-auto">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 bg-base-200 rounded-full text-base-content/60">
                      #{tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="text-xs px-2 py-1 text-base-content/40">+{template.tags.length - 3}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-base-200">
                  <button
                    className="btn btn-sm btn-ghost w-full"
                    onClick={() => handlePreview(template)}
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button
                    className="btn btn-sm btn-primary w-full"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-base-200/30 rounded-xl border border-dashed border-base-300">
            <Bot className="w-12 h-12 text-base-content/20 mb-4" />
            <h3 className="text-lg font-bold mb-2">No templates found</h3>
            <p className="text-base-content/60 max-w-sm mx-auto mb-4">
              Try adjusting your filters to find what you're looking for.
            </p>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSelectedPlatform('All');
                setSelectedPersona('All');
                setSelectedLlmProvider('All');
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      <div className="mt-12 text-center border-t border-base-200 pt-8">
        <p className="mb-4 text-base-content/70">Don't see what you need?</p>
        <button
          className="btn btn-outline gap-2"
          onClick={() => navigate('/admin/bots/create')}
        >
          <Code className="w-4 h-4" />
          Create Custom Bot from Scratch
        </button>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={`Template Preview: ${selectedTemplate?.name}`}
        size="lg"
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
              <div className={`p-3 rounded-full bg-base-100 shadow-sm text-primary`}>
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{selectedTemplate.name}</h3>
                <p className="text-sm opacity-70">{selectedTemplate.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 border border-base-200 rounded-lg">
                <span className="block text-xs font-bold uppercase opacity-50 mb-1">Platform</span>
                <div className="flex items-center gap-2">
                  {getPlatformIcon(selectedTemplate.platform)}
                  <span className="capitalize">{selectedTemplate.platform}</span>
                </div>
              </div>
              <div className="p-3 border border-base-200 rounded-lg">
                <span className="block text-xs font-bold uppercase opacity-50 mb-1">Persona</span>
                <span className="capitalize">{selectedTemplate.persona}</span>
              </div>
              <div className="p-3 border border-base-200 rounded-lg">
                <span className="block text-xs font-bold uppercase opacity-50 mb-1">LLM Provider</span>
                <span className="capitalize">{selectedTemplate.llmProvider}</span>
              </div>
              <div className="p-3 border border-base-200 rounded-lg">
                <span className="block text-xs font-bold uppercase opacity-50 mb-1">Tags</span>
                <div className="flex gap-1 flex-wrap">
                  {selectedTemplate.tags.map(tag => (
                    <span key={tag} className="badge badge-xs badge-ghost">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-base-300/50 p-4 rounded-lg font-mono text-xs overflow-x-auto">
              <pre>
                {JSON.stringify({
                  messageProvider: selectedTemplate.platform,
                  llmProvider: selectedTemplate.llmProvider,
                  persona: selectedTemplate.persona,
                  config: {
                    // Placeholder config structure based on platform
                    token: "YOUR_TOKEN_HERE",
                    ...(selectedTemplate.platform === 'discord' ? { applicationId: "YOUR_APP_ID" } : {}),
                    ...(selectedTemplate.platform === 'slack' ? { signingSecret: "YOUR_SECRET" } : {})
                  }
                }, null, 2)}
              </pre>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => handleCopyTemplate(selectedTemplate)}
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                Copy Config
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleUseTemplate(selectedTemplate);
                  setShowPreviewModal(false);
                }}
              >
                Use Template
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BotTemplatesPage;
