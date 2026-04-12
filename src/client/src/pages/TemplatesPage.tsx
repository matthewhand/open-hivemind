import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Search, Filter, Plus, CheckCircle, Clock,
  Tag, Package, AlertCircle, RefreshCw, ChevronRight,
  Download, Trash2, Copy, Eye, Edit3, User, Calendar
} from 'lucide-react';
import { useErrorToast, useSuccessToast } from '../components/DaisyUI/ToastNotification';
import { usePageLifecycle } from '../hooks/usePageLifecycle';
import PageHeader from '../components/DaisyUI/PageHeader';
import CodeBlock from '../components/DaisyUI/CodeBlock';
import Tabs from '../components/DaisyUI/Tabs';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import { Alert } from '../components/DaisyUI/Alert';
import { Badge } from '../components/DaisyUI/Badge';
import Card from '../components/DaisyUI/Card';
import Input from '../components/DaisyUI/Input';
import Textarea from '../components/DaisyUI/Textarea';
import { apiService } from '../services/api';
import { ErrorService } from '../services/ErrorService';
import { useApiQuery } from '../hooks/useApiQuery';

interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'discord' | 'slack' | 'mattermost' | 'webhook' | 'llm' | 'general';
  tags: string[];
  config: any;
  isBuiltIn: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

const CATEGORIES = [
  { value: 'all', label: 'All Templates', icon: Package },
  { value: 'discord', label: 'Discord', icon: Package },
  { value: 'slack', label: 'Slack', icon: Package },
  { value: 'mattermost', label: 'Mattermost', icon: Package },
  { value: 'webhook', label: 'Webhook', icon: Package },
  { value: 'llm', label: 'LLM', icon: Package },
  { value: 'general', label: 'General', icon: Package },
];

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ConfigurationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ConfigurationTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [botName, setBotName] = useState('');
  const [botDescription, setBotDescription] = useState('');
  const [deletingTemplate, setDeletingTemplate] = useState<ConfigurationTemplate | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [drawerTemplate, setDrawerTemplate] = useState<ConfigurationTemplate | null>(null);
  const [drawerTab, setDrawerTab] = useState('details');

  const toastError = useErrorToast();
  const toastSuccess = useSuccessToast();

  // Fetch templates
  const {
    data: templatesResponse,
    loading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useApiQuery<any>('/api/admin/templates', { ttl: 60_000 });

  // Sync cached query results into local state
  useEffect(() => {
    if (templatesResponse?.data?.templates) {
      setTemplates(templatesResponse.data.templates);
    }
  }, [templatesResponse]);

  useEffect(() => {
    setLoading(templatesLoading);
  }, [templatesLoading]);

  useEffect(() => {
    if (templatesError) {
      ErrorService.report(templatesError, { action: 'fetchTemplates' });
      toastError('Failed to load templates');
    }
  }, [templatesError, toastError]);

  const fetchTemplates = async () => {
    await refetchTemplates();
  };

  // Initialize page
  const { data, loading: pageLoading } = usePageLifecycle({
    title: 'Configuration Templates',
    fetchData: async () => {
      await fetchTemplates();
      return {};
    },
    initialData: {},
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    setCurrentPage(1);
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const paginatedTemplates = useMemo(() =>
    filteredTemplates.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredTemplates, currentPage, pageSize]);

  // Build carousel items from most popular templates
  const featuredCarouselItems = useMemo(() => {
    const popular = [...templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 4);

    if (popular.length === 0) {
      return [
        {
          image: '',
          title: 'Configuration Templates',
          description: 'Pre-built bot configurations for Discord, Slack, Mattermost, and more.',
          bgGradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        },
      ];
    }

    const gradients = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',
      'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      'linear-gradient(135deg, #f59e0b, #fbbf24)',
      'linear-gradient(135deg, #10b981, #34d399)',
    ];

    return popular.map((t, i) => ({
      image: '',
      title: t.name,
      description: t.description || `A ${t.category} template used ${t.usageCount} times.`,
      bgGradient: gradients[i % gradients.length],
    }));
  }, [templates]);

  // Group templates by category (from paginated subset)
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ConfigurationTemplate[]> = {};
    paginatedTemplates.forEach((template) => {
      if (!groups[template.category]) {
        groups[template.category] = [];
      }
      groups[template.category].push(template);
    });
    return groups;
  }, [paginatedTemplates]);

  const handleOpenDrawer = (template: ConfigurationTemplate) => {
    setDrawerTemplate(template);
    setDrawerTab('details');
  };

  const handleCloseDrawer = () => {
    setDrawerTemplate(null);
  };

  const handleExportTemplate = (template: ConfigurationTemplate) => {
    const blob = new Blob([JSON.stringify(template.config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess('Template exported as JSON');
  };

  const handleDuplicateTemplate = async (template: ConfigurationTemplate) => {
    try {
      await apiService.post('/api/admin/templates', {
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        tags: template.tags,
        config: template.config,
      });
      toastSuccess(`Template duplicated as "${template.name} (Copy)"`);
      await fetchTemplates();
    } catch (err) {
      ErrorService.report(err, { action: 'duplicateTemplate', templateId: template.id });
      toastError(err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  };

  const handlePreviewTemplate = (template: ConfigurationTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const handleApplyTemplate = (template: ConfigurationTemplate) => {
    setSelectedTemplate(template);
    setBotName('');
    setBotDescription(template.description);
    setShowApplyModal(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedTemplate || !botName.trim()) {
      toastError('Bot name is required');
      return;
    }

    setApplyingTemplate(true);
    try {
      const response = await apiService.post<any>(
        `/api/admin/templates/${selectedTemplate.id}/apply`,
        {
          name: botName.trim(),
          description: botDescription.trim(),
        }
      );

      toastSuccess(`Bot "${botName}" created from template successfully`);
      setShowApplyModal(false);
      setBotName('');
      setBotDescription('');
      setSelectedTemplate(null);

      // Refresh templates to update usage count
      await fetchTemplates();
    } catch (err) {
      ErrorService.report(err, { action: 'applyTemplate', templateId: selectedTemplate.id });
      toastError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;

    try {
      await apiService.delete(`/api/admin/templates/${deletingTemplate.id}`);
      toastSuccess('Template deleted successfully');
      setDeletingTemplate(null);
      await fetchTemplates();
    } catch (err) {
      ErrorService.report(err, { action: 'deleteTemplate', templateId: deletingTemplate.id });
      toastError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || Package;
  };

  if (loading && templates.length === 0) {
    return <SkeletonPage variant="cards" statsCount={4} showFilters />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration Templates"
        description="Browse and apply pre-built bot configuration templates"
        icon={<FileText className="w-8 h-8 text-primary" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTemplates}
              disabled={loading}
              title="Refresh templates"
              aria-label="Refresh templates"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* Category Tabs */}
      <Tabs variant="lifted"
        tabs={CATEGORIES.map((category) => {
          const Icon = category.icon;
          const count =
            category.value === 'all'
              ? templates.length
              : templates.filter((t) => t.category === category.value).length;

          return {
            key: category.value,
            label: (
              <span className="flex items-center gap-2 whitespace-nowrap">
                {category.label}
                <Badge size="sm">{count}</Badge>
              </span>
            ),
            icon: <Icon className="w-4 h-4" />,
          };
        })}
        activeTab={selectedCategory}
        onChange={setSelectedCategory}
        className="bg-base-200 p-2 overflow-x-auto flex-nowrap"
      />

      {/* Search Bar */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search templates by name, description, or tags..."
      />

      {/* Featured Templates Carousel */}
      {templates.length > 0 && (
        <div className="rounded-xl overflow-hidden">
          <Carousel items={featuredCarouselItems} autoplay interval={6000} variant="full-width" />
        </div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'No templates found' : 'No templates available'}
          description={
            searchQuery
              ? 'No templates match your search criteria.'
              : 'There are no configuration templates available.'
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                {React.createElement(getCategoryIcon(category), {
                  className: 'w-5 h-5 text-primary',
                })}
                {category} Templates
                <Badge size="lg">{categoryTemplates.length}</Badge>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`shadow-lg border hover:shadow-xl transition-shadow cursor-pointer ${
                      drawerTemplate?.id === template.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-base-300'
                    }`}
                    onClick={() => handleOpenDrawer(template)}
                  >
                      <div className="flex items-start justify-between mb-3">
                        <Card.Title tag="h3" className="text-lg">{template.name}</Card.Title>
                        {template.isBuiltIn && (
                          <Badge variant="primary" size="sm">Built-in</Badge>
                        )}
                      </div>

                      <p className="text-sm text-base-content/70 mb-4 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Tags */}
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {template.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="ghost" size="sm" className="gap-1">
                              <Tag className="w-3 h-3" />
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="ghost" size="sm">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-base-content/60 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Used {template.usageCount}x</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <Card.Actions className="gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="btn-square"
                          onClick={(e) => { e.stopPropagation(); handlePreviewTemplate(template); }}
                          title="Preview template"
                          aria-label="Preview template"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!template.isBuiltIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="btn-square text-error"
                            onClick={(e) => { e.stopPropagation(); setDeletingTemplate(template); }}
                            title="Delete template"
                            aria-label="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleApplyTemplate(template); }}
                        >
                          Apply Template
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Card.Actions>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-center mt-6">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTemplates.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              style="standard"
            />
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedTemplate(null);
        }}
        title={selectedTemplate?.name || 'Template Preview'}
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase opacity-50 mb-1 block">
                Description
              </label>
              <p className="text-sm">{selectedTemplate.description}</p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Category</label>
              <Badge variant="primary" className="capitalize">{selectedTemplate.category}</Badge>
            </div>

            <div>
              <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag, idx) => (
                  <Badge key={idx} variant="ghost">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase opacity-50 mb-1 block">
                Configuration
              </label>
              <CodeBlock className="bg-base-200 p-4" maxHeight="max-h-96">
                {JSON.stringify(selectedTemplate.config, null, 2)}
              </CodeBlock>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-base-300">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedTemplate(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowPreviewModal(false);
                  handleApplyTemplate(selectedTemplate);
                }}
              >
                Apply Template
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply Template Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false);
          setSelectedTemplate(null);
          setBotName('');
          setBotDescription('');
        }}
        title="Apply Template"
      >
        <div className="space-y-4">
          <Alert status="info">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">
              Creating a bot from template: <strong>{selectedTemplate?.name}</strong>
            </span>
          </Alert>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Bot Name *</span>
            </label>
            <Input
              type="text"
              placeholder="Enter bot name"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              disabled={applyingTemplate}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Description</span>
            </label>
            <Textarea
              placeholder="Enter bot description"
              rows={3}
              value={botDescription}
              onChange={(e) => setBotDescription(e.target.value)}
              disabled={applyingTemplate}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-base-300">
            <Button
              variant="ghost"
              onClick={() => {
                setShowApplyModal(false);
                setSelectedTemplate(null);
                setBotName('');
                setBotDescription('');
              }}
              disabled={applyingTemplate}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmApply}
              disabled={applyingTemplate || !botName.trim()}
            >
              {applyingTemplate ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Bot
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingTemplate}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${deletingTemplate?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="error"
        onConfirm={handleDeleteTemplate}
        onClose={() => setDeletingTemplate(null)}
      />

      {/* Template Detail Drawer */}
      <DetailDrawer
        isOpen={!!drawerTemplate}
        onClose={handleCloseDrawer}
        title={drawerTemplate?.name}
        subtitle={drawerTemplate ? `${drawerTemplate.category} template` : undefined}
        renderDock={
          drawerTemplate && (
            <>
              <button
                className="text-primary hover:bg-primary/10 transition-colors"
                onClick={() => {
                  handleCloseDrawer();
                  handleApplyTemplate(drawerTemplate);
                }}
                title="Create Bot from Template"
              >
                <Plus className="w-5 h-5" />
                <span className="dock-label text-[10px]">Create</span>
              </button>
              <button
                className="text-info hover:bg-info/10 transition-colors"
                onClick={() => handleDuplicateTemplate(drawerTemplate)}
                title="Duplicate Template"
              >
                <Copy className="w-5 h-5" />
                <span className="dock-label text-[10px]">Duplicate</span>
              </button>
              {!drawerTemplate.isBuiltIn && (
                <button
                  className="text-secondary hover:bg-secondary/10 transition-colors"
                  onClick={() => {
                    handleCloseDrawer();
                    handlePreviewTemplate(drawerTemplate);
                  }}
                  title="Edit Template"
                >
                  <Edit3 className="w-5 h-5" />
                  <span className="dock-label text-[10px]">Edit</span>
                </button>
              )}
              <button
                className="text-accent hover:bg-accent/10 transition-colors"
                onClick={() => handleExportTemplate(drawerTemplate)}
                title="Export as JSON"
              >
                <Download className="w-5 h-5" />
                <span className="dock-label text-[10px]">Export</span>
              </button>
              {!drawerTemplate.isBuiltIn && (
                <button
                  className="text-error hover:bg-error/10 transition-colors"
                  onClick={() => {
                    handleCloseDrawer();
                    setDeletingTemplate(drawerTemplate);
                  }}
                  title="Delete Template"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="dock-label text-[10px]">Delete</span>
                </button>
              )}
            </>
          )
        }
      >
        {drawerTemplate && (
          <div className="space-y-4">
            {/* Drawer Tabs */}
            <Tabs
              tabs={[
                { key: 'details', label: 'Details' },
                { key: 'config', label: 'Configuration' },
              ]}
              activeTab={drawerTab}
              onChange={setDrawerTab}
              variant="boxed"
              size="sm"
            />

            {drawerTab === 'details' && (
              <div className="space-y-4">
                {/* Category & Built-in Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="primary" className="capitalize">{drawerTemplate.category}</Badge>
                  {drawerTemplate.isBuiltIn && (
                    <Badge variant="info" size="sm">Built-in</Badge>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Description</label>
                  <p className="text-sm">{drawerTemplate.description || 'No description provided.'}</p>
                </div>

                <Divider />

                {/* Tags */}
                <div>
                  <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Tags</label>
                  {drawerTemplate.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {drawerTemplate.tags.map((tag, idx) => (
                        <Badge key={idx} variant="ghost" size="sm" className="gap-1">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-base-content/50 italic">No tags</p>
                  )}
                </div>

                <Divider />

                {/* Usage & Author Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-base-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{drawerTemplate.usageCount}</div>
                    <div className="text-xs text-base-content/60">Bots Created</div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-secondary">
                      {Object.keys(drawerTemplate.config || {}).length}
                    </div>
                    <div className="text-xs text-base-content/60">Config Keys</div>
                  </div>
                </div>

                {/* Author / Creation Info */}
                <div className="space-y-2 text-sm">
                  {drawerTemplate.createdBy && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <User className="w-4 h-4" />
                      <span>Created by <strong>{drawerTemplate.createdBy}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-base-content/70">
                    <Calendar className="w-4 h-4" />
                    <span>Created {new Date(drawerTemplate.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base-content/70">
                    <Clock className="w-4 h-4" />
                    <span>Updated {new Date(drawerTemplate.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {drawerTab === 'config' && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase opacity-50 block">
                  Full Configuration
                </label>
                <CodeBlock className="bg-base-200 p-4" maxHeight="max-h-[60vh]">
                  {JSON.stringify(drawerTemplate.config, null, 2)}
                </CodeBlock>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default TemplatesPage;
