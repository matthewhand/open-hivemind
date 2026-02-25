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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const breadcrumbItems = [
    { label: 'Sitemap', href: '/admin/sitemap', isActive: true },
  ];

  const fetchSitemap = async () => {
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

  const getAccessColor = (access: string) => {
    switch (access) {
      case 'public': return 'badge-success';
      case 'authenticated': return 'badge-warning';
      case 'owner': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 0.8) { return 'badge-success'; }
    if (priority >= 0.5) { return 'badge-warning'; }
    return 'badge-ghost';
  };

  const handleDownloadXml = () => {
    const queryParam = accessFilter !== 'all' ? `?access=${accessFilter}` : '';
    window.open(`/sitemap.xml${queryParam}`, '_blank');
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredUrls = sitemapData?.urls.filter((url) => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    return (
      url.url.toLowerCase().includes(lowerTerm) ||
      url.description.toLowerCase().includes(lowerTerm)
    );
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Pages</div>
            <div className="stat-value">{sitemapData?.totalUrls || 0}</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Generated</div>
            <div className="stat-value text-sm">
              {sitemapData ? new Date(sitemapData.generated).toLocaleTimeString() : 'N/A'}
            </div>
            <div className="stat-desc">
              {sitemapData ? new Date(sitemapData.generated).toLocaleDateString() : ''}
            </div>
          </div>
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Access Level</span>
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

        <div className="flex gap-2 items-end">
          <button
            className="btn btn-outline flex-1"
            onClick={handleDownloadXml}
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            XML
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

       {/* Toolbar: Search and View Toggle */}
       <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center bg-base-100 p-4 rounded-box shadow-sm border border-base-200">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search pages..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
        </div>

        <div className="join">
          <button
            className={`join-item btn ${viewMode === 'grid' ? 'btn-active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>
          <button
            className={`join-item btn ${viewMode === 'list' ? 'btn-active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <ListBulletIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredUrls.length === 0 ? (
        <div className="text-center p-12 bg-base-100 rounded-box border border-base-200">
          <p className="text-base-content/70">No pages found matching your filters.</p>
          <button
            className="btn btn-link"
            onClick={() => { setSearchTerm(''); setAccessFilter('all'); }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
         /* Grid View (Grouped) */
        Object.entries(groupedUrls).map(([category, urls]) => (
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
        ))
      ) : (
        /* List View (Table) */
        <div className="overflow-x-auto bg-base-100 rounded-box shadow-xl border border-base-200">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Page</th>
                <th>Access</th>
                <th>Priority</th>
                <th>Change Freq</th>
                <th>Last Modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUrls.map((url) => (
                <tr key={url.url}>
                  <td className="max-w-xs md:max-w-md">
                    <div className="font-bold break-all font-mono text-sm">{url.url}</div>
                    <div className="text-xs opacity-70 truncate" title={url.description}>
                      {url.description}
                    </div>
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
                  <td>
                    <span className="text-xs uppercase">{url.changefreq}</span>
                  </td>
                  <td className="text-xs">
                    {new Date(url.lastmod).toLocaleDateString()}
                  </td>
                  <td>
                     <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleOpenUrl(url.fullUrl)}
                        title="Open Page"
                      >
                        <LaunchIcon className="w-4 h-4" />
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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