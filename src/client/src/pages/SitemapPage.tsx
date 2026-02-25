import React, { useState, useEffect } from 'react';
import {
  ArrowTopRightOnSquareIcon as LaunchIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ArrowPathIcon as RefreshIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs, Alert } from '../components/DaisyUI';

interface SitemapUrl {
  url: string;
  fullUrl: string;
  changefreq: string;
  priority: number;
  lastmod: string;
  description: string;
  access: 'public' | 'authenticated' | 'owner';
}

interface SitemapData {
  generated: string;
  baseUrl: string;
  totalUrls: number;
  urls: SitemapUrl[];
}

const SitemapPage: React.FC = () => {
  const [sitemapData, setSitemapData] = useState<SitemapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const breadcrumbItems = [
    { label: 'Sitemap', href: '/admin/sitemap', isActive: true },
  ];

  const fetchSitemap = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const queryParam = accessFilter !== 'all' ? `?access=${accessFilter}` : '';
      const response = await fetch(`/sitemap.json${queryParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch sitemap');
      }

      const data = await response.json();
      setSitemapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSitemap();
  }, [accessFilter]);

  const getAccessColor = (access: string): string => {
    switch (access) {
      case 'public': return 'badge-success';
      case 'authenticated': return 'badge-warning';
      case 'owner': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 0.8) { return 'badge-success'; }
    if (priority >= 0.5) { return 'badge-warning'; }
    return 'badge-ghost';
  };

  const handleDownloadXml = (): void => {
    const queryParam = accessFilter !== 'all' ? `?access=${accessFilter}` : '';
    window.open(`/sitemap.xml${queryParam}`, '_blank');
  };

  const handleOpenUrl = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredUrls = (sitemapData?.urls || []).filter(url => {
    const matchesSearch = url.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          url.description.toLowerCase().includes(searchTerm.toLowerCase());
    // Note: accessFilter is handled by the API call in fetchSitemap, but we can also filter client-side if needed.
    // However, the current implementation fetches new data when accessFilter changes.
    // To remain consistent with the fetch logic, we rely on the API for access filtering.
    // If we wanted purely client-side filtering, we would fetch all and filter here.
    // Given the current fetchSitemap implementation uses the query param, we'll assume sitemapData.urls is already filtered by access.
    return matchesSearch;
  }) || [];

  const groupedUrls = filteredUrls.reduce((acc, url) => {
    let category = 'Other';

    if (url.url === '/') {
      category = 'Root';
    } else if (url.url.startsWith('/admin')) {
      if (url.url.includes('/bots') || url.url.includes('/personas')) {
        category = 'Bot Management';
      } else if (url.url.includes('/mcp')) {
        category = 'MCP Servers';
      } else if (url.url.includes('/monitoring') || url.url.includes('/activity') || url.url.includes('/analytics')) {
        category = 'Monitoring & Analytics';
      } else if (url.url.includes('/settings') || url.url.includes('/config') || url.url.includes('/configuration') || url.url.includes('/system-management')) {
        category = 'System Management';
      } else if (url.url.includes('/ai/')) {
        category = 'AI Features';
      } else if (url.url.includes('/integrations')) {
        category = 'Integrations';
      } else {
        category = 'Main Dashboard';
      }
    } else if (url.url.startsWith('/webui')) {
      category = 'Legacy Interfaces';
    } else if (url.url.startsWith('/health') || url.url.startsWith('/api')) {
      category = 'System APIs';
    } else if (url.url === '/login') {
      category = 'Authentication';
    }

    if (!acc[category]) { acc[category] = []; }
    acc[category].push(url);
    return acc;
  }, {} as Record<string, SitemapUrl[]>) || {};

  const renderGridView = (): React.ReactElement => (
    <>
      {Object.entries(groupedUrls).map(([category, urls]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            {category}
            <div className="badge badge-neutral">{urls.length}</div>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urls.map((url) => (
              <div key={url.url} className="card bg-base-100 shadow-xl h-full border border-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-mono text-sm break-all font-bold">
                      {url.url}
                    </h3>
                    <button
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={() => handleOpenUrl(url.fullUrl)}
                      title="Open URL"
                    >
                      <LaunchIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-base-content/70 mb-3">
                    {url.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    <div className={`badge badge-sm ${getAccessColor(url.access)}`}>
                      {url.access}
                    </div>
                    <div className={`badge badge-sm badge-outline ${getPriorityColor(url.priority)}`}>
                      Priority: {url.priority}
                    </div>
                    <div className="badge badge-sm badge-outline">
                      {url.changefreq}
                    </div>
                  </div>

                  <div className="text-xs text-base-content/50 mt-auto">
                    Last modified: {new Date(url.lastmod).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {filteredUrls.length === 0 && (
        <div className="p-8 text-center text-base-content/70">
          No pages found matching "{searchTerm}"
        </div>
      )}
    </>
  );

  const renderTableView = (): React.ReactElement => (
    <div className="overflow-x-auto bg-base-100 rounded-lg shadow border border-base-200">
      <table className="table w-full">
        <thead>
          <tr>
            <th>URL</th>
            <th>Description</th>
            <th>Access</th>
            <th>Priority</th>
            <th>Freq</th>
            <th>Last Mod</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredUrls.map((url) => (
            <tr key={url.url} className="hover">
              <td className="font-mono text-xs font-bold">{url.url}</td>
              <td className="text-sm max-w-xs truncate" title={url.description}>
                {url.description}
              </td>
              <td>
                <div className={`badge badge-sm ${getAccessColor(url.access)}`}>
                  {url.access}
                </div>
              </td>
              <td>
                <div className={`badge badge-sm badge-outline ${getPriorityColor(url.priority)}`}>
                  {url.priority}
                </div>
              </td>
              <td className="text-xs">{url.changefreq}</td>
              <td className="text-xs whitespace-nowrap">
                {new Date(url.lastmod).toLocaleDateString()}
              </td>
              <td>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => handleOpenUrl(url.fullUrl)}
                  title="Open URL"
                >
                  <LaunchIcon className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredUrls.length === 0 && (
        <div className="p-8 text-center text-base-content/70">
          No pages found matching "{searchTerm}"
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-2">Loading sitemap...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="mt-4">
          <Alert status="error" message={`Error loading sitemap: ${error}`} />
          <button className="btn btn-primary mt-4" onClick={fetchSitemap}>
            <RefreshIcon className="w-5 h-5 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold mb-2">
          🗺️ Dynamic Sitemap
        </h1>
        <p className="text-base-content/70">
          Complete navigation structure and page hierarchy
        </p>
      </div>

      {/* Statistics and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <div className="stats shadow bg-base-100 border border-base-200 lg:col-span-1">
          <div className="stat p-4">
            <div className="stat-title text-xs">Total Pages</div>
            <div className="stat-value text-2xl">{sitemapData?.totalUrls || 0}</div>
            <div className="stat-desc text-xs mt-1">
              Generated: {sitemapData ? new Date(sitemapData.generated).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col md:flex-row gap-4 items-end">
          <div className="form-control w-full md:w-auto flex-1">
            <label className="label py-1">
              <span className="label-text text-xs">Search</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search paths or descriptions..."
                className="input input-bordered w-full pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-3 text-base-content/50" />
            </div>
          </div>

          <div className="form-control w-full md:w-auto md:w-48">
             <label className="label py-1">
              <span className="label-text text-xs">Access Level</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
            >
              <option value="all">All Pages</option>
              <option value="public">Public Only</option>
              <option value="authenticated">Authenticated</option>
              <option value="owner">Owner Only</option>
            </select>
          </div>

           <div className="join w-full md:w-auto">
            <button
              className={`btn join-item flex-1 ${viewMode === 'grid' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              className={`btn join-item flex-1 ${viewMode === 'list' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              className="btn btn-outline flex-1 md:flex-none"
              onClick={handleDownloadXml}
              title="Download XML"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
            <button
              className="btn btn-outline"
              onClick={fetchSitemap}
              title="Refresh"
            >
              <RefreshIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'grid' ? renderGridView() : renderTableView()}

      {/* Sitemap Links */}
      <div className="bg-base-200 rounded-box p-6 mt-8">
        <h3 className="text-lg font-bold mb-2">
          Sitemap Formats
        </h3>
        <p className="text-sm text-base-content/70 mb-4">
          Access the sitemap in different formats:
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => window.open('/sitemap.xml', '_blank')}
          >
            XML Sitemap (SEO)
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => window.open('/sitemap.json', '_blank')}
          >
            JSON API
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => window.open('/sitemap', '_blank')}
          >
            Human-Readable HTML
          </button>
        </div>
      </div>
    </div>
  );
};

export default SitemapPage;