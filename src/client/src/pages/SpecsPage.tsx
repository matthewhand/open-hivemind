import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Input from '../components/DaisyUI/Input';
import Textarea from '../components/DaisyUI/Textarea';
import Badge from '../components/DaisyUI/Badge';

import Modal from '../components/DaisyUI/Modal';
import Pagination from '../components/DaisyUI/Pagination';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import { Search, Plus, BookOpen } from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import useSpecs from '../hooks/useSpecs';
import useUrlParams from '../hooks/useUrlParams';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { apiService } from '../services/api';

/** Build a filesystem-safe, path-traversal-free id matching the server regex /^[a-zA-Z0-9_-]+$/. */
export const slugifyTopic = (topic: string): string =>
  topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'spec';

/**
 * Produce an id derived from the topic that does not collide with any id in `existingIds`.
 * Different topics can slugify to the same base (e.g. "My Spec!" and "My___Spec" both -> "my-spec",
 * and any all-symbol topic -> "spec"), so on collision we append an incrementing suffix.
 */
export const buildUniqueSpecId = (topic: string, existingIds: Iterable<string>): string => {
  const taken = new Set(existingIds);
  const base = slugifyTopic(topic);
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  // Keep the suffixed id within the same 64-char budget as the base slug.
  while (taken.has(`${base.slice(0, 64 - `-${suffix}`.length)}-${suffix}`)) {
    suffix += 1;
  }
  return `${base.slice(0, 64 - `-${suffix}`.length)}-${suffix}`;
};

const SpecsPage: React.FC = () => {
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const navigate = useNavigate();
  const { specs, loading, error, refetch } = useSpecs();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ topic: '', author: '', tags: '', content: '' });
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    page: { type: 'number', default: 1 },
  });
  const searchTerm = urlParams.search;
  const setSearchTerm = (v: string) => { setUrlParam('search', v); setUrlParam('page', 1); };
  const page = urlParams.page;
  const setPage = (v: number) => setUrlParam('page', v);
  const [pageSize] = useState(10);

  const filteredSpecs = specs.filter(
    (spec) =>
      spec.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spec.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedSpecs = filteredSpecs.slice((page - 1) * pageSize, page * pageSize);

  const totalPages = Math.ceil(filteredSpecs.length / pageSize);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleViewSpec = (id: string): void => {
    navigate(`/admin/specs/${id}`);
  };

  const openCreate = (): void => {
    setForm({ topic: '', author: '', tags: '', content: '' });
    setIsCreateOpen(true);
  };

  const closeCreate = (): void => {
    if (creating) {
      return;
    }
    setIsCreateOpen(false);
  };

  const handleCreate = async (): Promise<void> => {
    const topic = form.topic.trim();
    const content = form.content.trim();

    if (!topic) {
      errorToast('Topic required', 'Please enter a topic for the specification.');
      return;
    }
    if (!content) {
      errorToast('Content required', 'Please enter the specification content.');
      return;
    }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      id: buildUniqueSpecId(topic, specs.map((s) => s.id)),
      topic,
      author: form.author.trim() || 'Unknown',
      tags,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      content,
    };

    setCreating(true);
    try {
      const response = await apiService.post<{ success: boolean; error?: string }>(
        '/api/specs',
        payload
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to create specification');
      }
      setIsCreateOpen(false);
      successToast('Specification created', `"${topic}" has been saved.`);
      await refetch();
    } catch (err) {
      errorToast(
        'Failed to create specification',
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <SkeletonPage variant="cards" statsCount={0} showFilters />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <div className="text-center">
            <Card.Title className="text-error">Error Loading Specifications</Card.Title>
            <p className="opacity-70">{error}</p>
            <Button className="btn-primary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="specs-page">
      <PageHeader
        title="Specifications"
        description="View, search, and manage persisted specifications"
        icon={BookOpen}
      />

      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" />
          <Input
            className="pl-10"
            placeholder="Search specifications..."
            aria-label="Search specifications"
            value={searchTerm}
            onChange={handleSearch}
            data-testid="specs-search-input"
          />
        </div>
        <Button className="btn-primary" onClick={openCreate} data-testid="add-spec-button">
          <Plus className="w-4 h-4 mr-2" />
          Add Specification
        </Button>
      </div>

      {/* Results Summary */}
      <div className="mb-4" data-testid="specs-count">
        <p className="text-sm opacity-70">
          {filteredSpecs.length} specification{filteredSpecs.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" data-testid="specs-grid">
        {paginatedSpecs.map((spec) => (
          <Card key={spec.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <BookOpen className="w-6 h-6 text-primary flex-shrink-0" />
                <Badge variant="neutral" size="sm">
                  {spec.tags.length} tag{spec.tags.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <Card.Title tag="h3" className="text-lg mb-2">{spec.topic}</Card.Title>
              <p className="text-sm opacity-70 mb-4 line-clamp-3">
                By {spec.author} • {new Date(spec.timestamp).toLocaleDateString()}
              </p>

              <div className="flex flex-wrap gap-1 mb-4">
                {spec.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="info" size="xs">
                    {tag}
                  </Badge>
                ))}
                {spec.tags.length > 3 && (
                  <Badge variant="neutral" size="xs">
                    +{spec.tags.length - 3} more
                  </Badge>
                )}
              </div>

              <Card.Actions>
                <Button size="sm" className="btn-ghost" onClick={() => handleViewSpec(spec.id)}>
                  View Details
                </Button>
              </Card.Actions>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalItems={filteredSpecs.length} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}

      {/* Empty State */}
      {filteredSpecs.length === 0 && (
        <div className="text-center py-12" data-testid="specs-empty-state">
          <BookOpen className="w-16 h-16 mx-auto text-primary mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No specifications found</h2>
          <p className="opacity-70 mb-4">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first specification'}
          </p>
          <Button className="btn-primary" onClick={openCreate} data-testid="create-spec-button">
            <Plus className="w-4 h-4 mr-2" />
            Create Specification
          </Button>
        </div>
      )}

      {/* Create Specification Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Create Specification"
        closable={!creating}
        actions={[
          { label: 'Cancel', onClick: closeCreate, variant: 'ghost', disabled: creating },
          { label: 'Create', onClick: () => void handleCreate(), variant: 'primary', loading: creating },
        ]}
      >
        <div className="space-y-4" data-testid="create-spec-form">
          <div>
            <label className="label" htmlFor="spec-topic">
              <span className="label-text">Topic</span>
            </label>
            <Input
              id="spec-topic"
              placeholder="Specification topic"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              data-testid="spec-topic-input"
            />
          </div>
          <div>
            <label className="label" htmlFor="spec-author">
              <span className="label-text">Author</span>
            </label>
            <Input
              id="spec-author"
              placeholder="Author (optional)"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              data-testid="spec-author-input"
            />
          </div>
          <div>
            <label className="label" htmlFor="spec-tags">
              <span className="label-text">Tags</span>
            </label>
            <Input
              id="spec-tags"
              placeholder="Comma-separated tags (optional)"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              data-testid="spec-tags-input"
            />
          </div>
          <div>
            <label className="label" htmlFor="spec-content">
              <span className="label-text">Content (Markdown)</span>
            </label>
            <Textarea
              id="spec-content"
              className="w-full min-h-32"
              placeholder="Specification content..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              data-testid="spec-content-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SpecsPage;
