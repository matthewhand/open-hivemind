import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, Breadcrumbs, Pagination } from '../components/DaisyUI';
import { MagnifyingGlassIcon, PlusIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import useSpecs from '../hooks/useSpecs';

const SpecsPage: React.FC = () => {
  const navigate = useNavigate();
  const { specs, loading, error } = useSpecs();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const filteredSpecs = specs.filter(spec =>
    spec.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spec.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedSpecs = filteredSpecs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalPages = Math.ceil(filteredSpecs.length / pageSize);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleViewSpec = (id: string) => {
    navigate(`/admin/specs/${id}`);
  };

  const breadcrumbItems = [{ label: 'Specifications', href: '/admin/specs', isActive: true }];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title text-error">Error Loading Specifications</h2>
            <p className="opacity-70">{error}</p>
            <Button className="btn-primary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">Specifications</h1>
        <p className="opacity-70">View, search, and manage persisted specifications</p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" />
          <Input
            className="pl-10"
            placeholder="Search specifications..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <Button className="btn-primary">
          <PlusIcon className="w-4 h-4 mr-2" />
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
            <div className="card-body">
              <div className="flex items-start justify-between mb-3">
                <BookOpenIcon className="w-6 h-6 text-primary flex-shrink-0" />
                <Badge variant="neutral" size="sm">
                  {spec.tags.length} tag{spec.tags.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <h3 className="card-title text-lg mb-2">{spec.topic}</h3>
              <p className="text-sm opacity-70 mb-4 line-clamp-3">
                By {spec.author} • {new Date(spec.date).toLocaleDateString()}
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

              <div className="card-actions justify-end">
                <Button
                  size="sm"
                  className="btn-ghost"
                  onClick={() => handleViewSpec(spec.id)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            current={page}
            total={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Empty State */}
      {filteredSpecs.length === 0 && (
        <div className="text-center py-12">
          <BookOpenIcon className="w-16 h-16 mx-auto text-primary mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No specifications found</h3>
          <p className="opacity-70 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first specification'}
          </p>
          <Button className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Specification
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpecsPage;