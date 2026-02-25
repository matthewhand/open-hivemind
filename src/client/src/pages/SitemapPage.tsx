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
    const lowerSearch = searchTerm.toLowerCase();
    return (
      url.url.toLowerCase().includes(lowerSearch) ||
      url.description.toLowerCase().includes(lowerSearch)
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

  const renderTableView = () => (
    <div className="overflow-x-auto bg-base-100 rounded-lg shadow border border-base-200 mb-8">
      <table className="table w-full">
        <thead>
          <tr className="bg-base-200">
            <th>URL</th>
            <th>Description</th>
            <th>Access</th>
            <th>Priority</th>
            <th>Last Mod</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUrls.map((url) => (
            <tr key={url.url} className="hover">
              <td className="font-mono font-bold text-sm">{url.url}</td>
              <td className="text-sm max-w-xs truncate" title={url.description}>{url.description}</td>
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
              <td className="text-xs font-mono">{new Date(url.lastmod).toLocaleDateString()}</td>
              <td>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => handleOpenUrl(url.fullUrl)}
                  title="Open Page"
                >
                  <LaunchIcon className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {filteredUrls.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-8 text-base-content/60">
                No pages found matching "{searchTerm}"
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
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
         <div className="text-center py-12 text-base-content/60 bg-base-200 rounded-lg mb-8">
           <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
           <p>No pages found matching "{searchTerm}"</p>
         </div>
      )}
    </>
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Pages</div>
            <div className="stat-value">{sitemapData?.totalUrls || 0}</div>
          </div>
        </div>
        <div className="stats shadow lg:col-span-3">
           <div className="stat">
            <div className="stat-title">Last Generated</div>
            <div className="stat-value text-lg">
               {sitemapData ? new Date(sitemapData.generated).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6 items-end justify-between bg-base-100 p-4 rounded-lg shadow-sm border border-base-200">
         {/* Search & Filter */}
         <div className="flex flex-col md:flex-row flex-1 gap-2 w-full">
            <div className="join w-full max-w-md">
              <input
                type="text"
                placeholder="Search pages..."
                className="input input-bordered join-item w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn join-item btn-square">
                  <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </div>

            <select
              className="select select-bordered"
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
            >
              <option value="all">All Access</option>
              <option value="public">Public</option>
              <option value="authenticated">Authenticated</option>
              <option value="owner">Owner</option>
            </select>
         </div>

         {/* View & Actions */}
         <div className="flex gap-2">
           <div className="join mr-2">
             <button
               className={`btn join-item ${viewMode === 'grid' ? 'btn-active' : ''}`}
               onClick={() => setViewMode('grid')}
               title="Grid View"
             >
               <Squares2X2Icon className="w-5 h-5" />
             </button>
             <button
               className={`btn join-item ${viewMode === 'list' ? 'btn-active' : ''}`}
               onClick={() => setViewMode('list')}
               title="List View"
             >
               <ListBulletIcon className="w-5 h-5" />
             </button>
           </div>

           <button
            className="btn btn-outline"
            onClick={handleDownloadXml}
            title="Download XML"
           >
            <DownloadIcon className="w-5 h-5" />
           </button>

           <button
            className="btn btn-outline btn-square"
            onClick={fetchSitemap}
            title="Refresh"
          >
            <RefreshIcon className="w-5 h-5" />
          </button>
         </div>
      </div>

      {/* Filter Stats */}
      {(searchTerm || accessFilter !== 'all') && (
        <div className="mb-4 text-sm text-base-content/70">
          Showing {filteredUrls.length} result{filteredUrls.length !== 1 ? 's' : ''}
          {searchTerm && <span> matching "<strong>{searchTerm}</strong>"</span>}
          {accessFilter !== 'all' && <span> with access "<strong>{accessFilter}</strong>"</span>}
        </div>
      )}

      {viewMode === 'grid' ? renderGridView() : renderTableView()}

      {/* Sitemap Links Footer */}
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