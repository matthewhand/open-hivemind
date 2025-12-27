import React, { useState, useEffect } from 'react';
import {
  ArrowTopRightOnSquareIcon as LaunchIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ArrowPathIcon as RefreshIcon,
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

  const breadcrumbItems = [
    { label: 'Sitemap', href: '/uber/sitemap', isActive: true },
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

  const groupedUrls = sitemapData?.urls.reduce((acc, url) => {
    let category = 'Other';

    if (url.url === '/') {
      category = 'Root';
    } else if (url.url.startsWith('/uber')) {
      if (url.url.includes('/bots')) { category = 'Bot Management'; }
      else if (url.url.includes('/mcp')) { category = 'MCP Servers'; }
      else if (url.url.includes('/monitoring') || url.url.includes('/activity')) { category = 'Monitoring'; }
      else if (url.url.includes('/settings')) { category = 'Settings'; }
      else { category = 'Main Dashboard'; }
    } else if (url.url.startsWith('/webui') || url.url.startsWith('/admin')) {
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

      {/* Grouped URLs */}
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