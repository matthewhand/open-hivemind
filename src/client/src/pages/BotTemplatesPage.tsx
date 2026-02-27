/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, Modal } from '../components/DaisyUI';
import { Copy, Check, Filter, X, Eye, FileJson } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);

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

  const openPreview = (template: BotTemplate) => {
    setSelectedTemplate(template);
    setPreviewModalOpen(true);
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
      const matchPlatform = selectedPlatform === 'All' || t.platform === selectedPlatform;
      const matchPersona = selectedPersona === 'All' || t.persona === selectedPersona;
      const matchLlm = selectedLlmProvider === 'All' || t.llmProvider === selectedLlmProvider;
      return matchPlatform && matchPersona && matchLlm;
    });
  }, [templates, selectedPlatform, selectedPersona, selectedLlmProvider]);

  const clearFilters = () => {
    setSelectedPlatform('All');
    setSelectedPersona('All');
    setSelectedLlmProvider('All');
  };

  const hasActiveFilters = selectedPlatform !== 'All' || selectedPersona !== 'All' || selectedLlmProvider !== 'All';

  const FilterSection = ({ title, options, selected, onSelect }: { title: string, options: string[], selected: string, onSelect: (val: string) => void }) => (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">{title}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`btn btn-sm ${selected === option ? 'btn-neutral' : 'btn-ghost border-base-300'}`}
          >
            {option === 'All' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

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

        {/* Improved Filters */}
        <div className="mt-6 p-6 bg-base-100 border border-base-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-base-content/70">
            <Filter className="w-4 h-4" />
            Filter Templates
            {hasActiveFilters && (
               <button onClick={clearFilters} className="btn btn-ghost btn-xs text-error ml-auto">
                 <X className="w-3 h-3 mr-1" /> Clear Filters
               </button>
            )}
          </div>

          <div className="space-y-4">
            <FilterSection
              title="Platform"
              options={platforms}
              selected={selectedPlatform}
              onSelect={setSelectedPlatform}
            />
            <div className="divider my-0"></div>
            <FilterSection
              title="Persona"
              options={personas}
              selected={selectedPersona}
              onSelect={setSelectedPersona}
            />
             <div className="divider my-0"></div>
             <FilterSection
              title="LLM Provider"
              options={llmProviders}
              selected={selectedLlmProvider}
              onSelect={setSelectedLlmProvider}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`card bg-base-100 shadow-xl h-full border transition-all hover:shadow-2xl ${template.featured ? 'border-primary border-2' : 'border-base-200'
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

                <p className="text-sm text-base-content/70 mb-4 min-h-[3rem]">
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
                    <div key={tag} className="badge badge-ghost badge-sm opacity-70">
                      #{tag}
                    </div>
                  ))}
                </div>

                <div className="card-actions mt-auto pt-4 border-t border-base-200">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </button>
                  <button
                    className="btn btn-ghost btn-square tooltip"
                    data-tip="Preview Configuration"
                    onClick={() => openPreview(template)}
                  >
                     <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-base-300 rounded-xl">
            <p className="text-lg font-medium text-base-content/60">No templates match your filters.</p>
            <button className="btn btn-primary btn-sm mt-4" onClick={clearFilters}>
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <p className="text-base-content/50 mb-4 text-sm">Don't see what you need?</p>
        <button
          className="btn btn-outline gap-2"
          onClick={() => navigate('/admin/bots/create')}
        >
          Create Custom Bot from Scratch
        </button>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={`Preview: ${selectedTemplate.name}`}
          size="lg"
        >
          <div className="space-y-4">
             <div className="flex items-center justify-between bg-base-200 p-3 rounded-lg">
                <div className="flex gap-2">
                   <div className={`badge ${getPlatformColor(selectedTemplate.platform)}`}>
                    {selectedTemplate.platform}
                   </div>
                   <div className="badge badge-outline">{selectedTemplate.persona}</div>
                   <div className="badge badge-outline">{selectedTemplate.llmProvider}</div>
                </div>
                <button
                  className="btn btn-xs btn-ghost gap-1"
                  onClick={() => handleCopyTemplate(selectedTemplate)}
                >
                  {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  Copy JSON
                </button>
             </div>

             <div className="mockup-code bg-base-300 text-base-content p-4 max-h-[400px] overflow-auto text-xs">
               <pre><code>{JSON.stringify({
                  name: selectedTemplate.name,
                  description: selectedTemplate.description,
                  messageProvider: selectedTemplate.platform,
                  llmProvider: selectedTemplate.llmProvider,
                  persona: selectedTemplate.persona,
                  tags: selectedTemplate.tags,
                }, null, 2)}</code></pre>
             </div>

             <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setPreviewModalOpen(false)}>Close</button>
                <button className="btn btn-primary" onClick={() => {
                   setPreviewModalOpen(false);
                   handleUseTemplate(selectedTemplate);
                }}>Use This Template</button>
             </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BotTemplatesPage;
