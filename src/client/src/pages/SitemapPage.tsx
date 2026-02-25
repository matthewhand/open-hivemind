import React, { useState, useEffect } from 'react';
import {
  Map as MapIcon,
  Download as DownloadIcon,
  RefreshCw as RefreshIcon,
  ExternalLink as LaunchIcon,
  Search as SearchIcon,
} from 'lucide-react';
import { Breadcrumbs, Alert } from '../components/DaisyUI';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter URLs based on search query
  const filteredUrls = sitemapData?.urls.filter(url => {
    const query = searchQuery.toLowerCase();
    return (
      url.url.toLowerCase().includes(query) ||
      (url.description || '').toLowerCase().includes(query)
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

  const sortedCategories = Object.keys(groupedUrls).sort();

  if (loading && !sitemapData) {
    return (
      <div className="p-6 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-2">Loading sitemap...</p>
      </div>
    );
  }

  if (error && !sitemapData) {
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

      <PageHeader
        title="Dynamic Sitemap"
        description="Complete navigation structure and page hierarchy"
        icon={MapIcon}
        actions={
          <>
            <button
              className="btn btn-ghost gap-2"
              onClick={fetchSitemap}
              disabled={loading}
            >
              <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              className="btn btn-primary gap-2"
              onClick={handleDownloadXml}
            >
              <DownloadIcon className="w-4 h-4" />
              Download XML
            </button>
          </>
        }
      />

      {/* Statistics and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">Total Pages</div>
            <div className="stat-value">{sitemapData?.totalUrls || 0}</div>
            <div className="stat-desc">Indexed URLs</div>
          </div>
        </div>

        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">Generated</div>
            <div className="stat-value text-lg">
              {sitemapData ? new Date(sitemapData.generated).toLocaleTimeString() : 'N/A'}
            </div>
            <div className="stat-desc">
              {sitemapData ? new Date(sitemapData.generated).toLocaleDateString() : ''}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search URLs..."
            filters={[
              {
                key: 'access',
                value: accessFilter,
                onChange: setAccessFilter,
                options: [
                  { label: 'All Pages', value: 'all' },
                  { label: 'Public Only', value: 'public' },
                  { label: 'Authenticated', value: 'authenticated' },
                  { label: 'Owner Only', value: 'owner' },
                ],
                className: 'w-full sm:w-48'
              }
            ]}
          />
        </div>
      </div>

      {/* Content */}
      {filteredUrls.length === 0 ? (
         <EmptyState
            icon={SearchIcon}
            title={sitemapData?.urls.length === 0 ? "No URLs found" : "No matching URLs"}
            description={sitemapData?.urls.length === 0 ? "The sitemap is empty." : `No results found for "${searchQuery}"`}
            actionLabel={sitemapData?.urls.length === 0 ? undefined : "Clear Search"}
            onAction={sitemapData?.urls.length === 0 ? undefined : () => setSearchQuery('')}
            variant={sitemapData?.urls.length === 0 ? "noData" : "noResults"}
          />
      ) : (
        /* Grouped URLs */
        sortedCategories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {category}
              <div className="badge badge-neutral">{groupedUrls[category].length}</div>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedUrls[category].map((url) => (
                <div key={url.url} className="card bg-base-100 shadow-xl h-full border border-base-200 hover:shadow-2xl transition-shadow">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-mono text-sm break-all font-bold text-primary" title={url.url}>
                        {url.url}
                      </h3>
                      <button
                        className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100"
                        onClick={() => handleOpenUrl(url.fullUrl)}
                        title="Open URL"
                      >
                        <LaunchIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-base-content/70 mb-3 line-clamp-2" title={url.description}>
                      {url.description || 'No description available'}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <div className={`badge badge-sm ${getAccessColor(url.access)}`}>
                        {url.access}
                      </div>
                      <div className={`badge badge-sm badge-outline ${getPriorityColor(url.priority)}`}>
                        {url.priority}
                      </div>
                      <div className="badge badge-sm badge-outline opacity-70">
                        {url.changefreq}
                      </div>
                    </div>

                    <div className="text-[10px] text-base-content/40 mt-auto pt-2 border-t border-base-content/5">
                      Last modified: {new Date(url.lastmod).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Sitemap Links Footer */}
      <div className="bg-base-200/50 rounded-box p-6 mt-8 border border-base-200">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <DownloadIcon className="w-5 h-5" />
          Export Options
        </h3>
        <p className="text-sm text-base-content/70 mb-4">
          Access the sitemap in different machine-readable formats:
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-outline btn-sm gap-2"
            onClick={() => window.open('/sitemap.xml', '_blank')}
          >
            XML Sitemap (SEO)
          </button>
          <button
            className="btn btn-outline btn-sm gap-2"
            onClick={() => window.open('/sitemap.json', '_blank')}
          >
            JSON API
          </button>
          <button
            className="btn btn-outline btn-sm gap-2"
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
