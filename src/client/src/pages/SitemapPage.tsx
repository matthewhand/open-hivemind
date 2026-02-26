import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Download,
  RefreshCw,
  Map as MapIcon,
} from 'lucide-react';
import { Breadcrumbs, Alert } from '../components/DaisyUI';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { SelectOption } from '../components/DaisyUI/Select';

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
  const [searchValue, setSearchValue] = useState('');

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

  const filteredUrls = sitemapData?.urls.filter(url => {
    const matchesAccess = accessFilter === 'all' || url.access === accessFilter;
    const matchesSearch = !searchValue ||
      url.url.toLowerCase().includes(searchValue.toLowerCase()) ||
      url.description.toLowerCase().includes(searchValue.toLowerCase());
    return matchesAccess && matchesSearch;
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
      <div className="space-y-6">
        <PageHeader
          title="Dynamic Sitemap"
          description="Complete navigation structure and page hierarchy"
          icon={MapIcon}
        />
        <div className="alert alert-error">
          <span>Error loading sitemap: {error}</span>
          <button className="btn btn-sm btn-ghost" onClick={fetchSitemap}>Retry</button>
        </div>
      </div>
    );
  }

  const accessOptions: SelectOption[] = [
    { label: 'All Pages', value: 'all' },
    { label: 'Public Only', value: 'public' },
    { label: 'Authenticated', value: 'authenticated' },
    { label: 'Owner Only', value: 'owner' },
  ];

  const hasResults = Object.keys(groupedUrls).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Sitemap"
        description="Complete navigation structure and page hierarchy"
        icon={MapIcon}
        actions={
          <>
            <button className="btn btn-ghost gap-2" onClick={handleDownloadXml}>
              <Download className="w-4 h-4" /> XML
            </button>
            <button className="btn btn-ghost btn-circle" onClick={fetchSitemap} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stats shadow w-full">
          <div className="stat">
            <div className="stat-title">Total Pages</div>
            <div className="stat-value">{sitemapData?.totalUrls || 0}</div>
            <div className="stat-desc">Indexed URLs</div>
          </div>
        </div>
        <div className="stats shadow w-full">
          <div className="stat">
            <div className="stat-title">Last Generated</div>
            <div className="stat-value text-lg">
              {sitemapData ? new Date(sitemapData.generated).toLocaleTimeString() : 'N/A'}
            </div>
            <div className="stat-desc">
              {sitemapData ? new Date(sitemapData.generated).toLocaleDateString() : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <SearchFilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search pages..."
        filters={[
          {
            key: 'access',
            value: accessFilter,
            onChange: setAccessFilter,
            options: accessOptions,
            className: 'w-full sm:w-48'
          }
        ]}
      />

      {/* Grouped URLs */}
      {!loading && !hasResults ? (
        <EmptyState
          title="No pages found"
          description={searchValue ? `No pages match "${searchValue}"` : "No pages found in sitemap"}
          variant={searchValue ? "noResults" : "noData"}
          onAction={searchValue ? () => setSearchValue('') : undefined}
          actionLabel={searchValue ? "Clear Search" : undefined}
        />
      ) : (
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
                        <ExternalLink className="w-4 h-4" />
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
