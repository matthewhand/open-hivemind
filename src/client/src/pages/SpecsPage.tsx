import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import Input from '../components/DaisyUI/Input';
import Badge from '../components/DaisyUI/Badge';

import Pagination from '../components/DaisyUI/Pagination';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import { Search, Plus, BookOpen } from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import useSpecs from '../hooks/useSpecs';
import useUrlParams from '../hooks/useUrlParams';
import { useInfoToast } from '../components/DaisyUI/ToastNotification';

const SpecsPage: React.FC = () => {
  const infoToast = useInfoToast();
  const navigate = useNavigate();
  const { specs, loading, error, refetch } = useSpecs();
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

  const handleNotImplemented = (): void => {
    infoToast('Coming Soon', 'This feature is currently under development.');
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
    <div className="container mx-auto p-6">
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
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <Button className="btn-primary" onClick={handleNotImplemented}>
          <Plus className="w-4 h-4 mr-2" />
          Add Specification
        </Button>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm opacity-70">
          {filteredSpecs.length} specification{filteredSpecs.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
          <Pagination current={page} total={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Empty State */}
      {filteredSpecs.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-primary mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No specifications found</h3>
          <p className="opacity-70 mb-4">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first specification'}
          </p>
          <Button className="btn-primary" onClick={handleNotImplemented}>
            <Plus className="w-4 h-4 mr-2" />
            Create Specification
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpecsPage;
