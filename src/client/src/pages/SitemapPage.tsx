import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Download,
  RefreshCw,
  Map as MapIcon,
  List,
  LayoutGrid,
  FileText,
  Shield,
  Globe,
  Lock,
} from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { SelectOption } from '../components/DaisyUI/Select';
import { useToast } from '../components/DaisyUI/ToastNotification';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [searchValue, setSearchValue] = useState('');
  const { addToast } = useToast();

  const fetchSitemap = async () => {
    setLoading(true);
    try {
      const queryParam = accessFilter !== 'all' ? `?access=${accessFilter}` : '';
      const response = await fetch(`/sitemap.json${queryParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch sitemap');
      }

      const data = await response.json();
      setSitemapData(data);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to load sitemap',
      });
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

  const handleExportCsv = () => {
    if (!sitemapData?.urls) return;

    const headers = ['URL', 'Description', 'Access', 'Priority', 'Change Frequency', 'Last Modified'];
    const rows = sitemapData.urls.map(url => [
      url.fullUrl,
      url.description,
      url.access,
      url.priority,
      url.changefreq,
      url.lastmod
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitemap-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    addToast({ type: 'success', title: 'Exported', message: 'Sitemap exported to CSV' });
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

  const stats = {
    total: sitemapData?.totalUrls || 0,
    public: sitemapData?.urls.filter(u => u.access === 'public').length || 0,
    auth: sitemapData?.urls.filter(u => u.access === 'authenticated').length || 0,
    owner: sitemapData?.urls.filter(u => u.access === 'owner').length || 0,
  };

  const accessOptions: SelectOption[] = [
    { label: 'All Pages', value: 'all' },
    { label: 'Public Only', value: 'public' },
    { label: 'Authenticated', value: 'authenticated' },
    { label: 'Owner Only', value: 'owner' },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dynamic Sitemap"
        description="Visualize and manage your application structure"
        icon={MapIcon}
        actions={
          <>
            <div className="join">
              <button
                className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                className={`join-item btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button className="btn btn-ghost btn-sm gap-2" onClick={handleExportCsv}>
              <FileText className="w-4 h-4" /> Export CSV
            </button>
            <button className="btn btn-ghost btn-sm gap-2" onClick={handleDownloadXml}>
              <Download className="w-4 h-4" /> XML
            </button>
            <button className="btn btn-ghost btn-circle btn-sm" onClick={fetchSitemap} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <MapIcon className="w-8 h-8 opacity-20" />
            </div>
            <div className="stat-title">Total Pages</div>
            <div className="stat-value text-primary">{stats.total}</div>
            <div className="stat-desc">Indexed Routes</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-success">
              <Globe className="w-8 h-8 opacity-20" />
            </div>
            <div className="stat-title">Public</div>
            <div className="stat-value text-success">{stats.public}</div>
            <div className="stat-desc">Accessible to everyone</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-warning">
              <Lock className="w-8 h-8 opacity-20" />
            </div>
            <div className="stat-title">Authenticated</div>
            <div className="stat-value text-warning">{stats.auth}</div>
            <div className="stat-desc">Login required</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-error">
              <Shield className="w-8 h-8 opacity-20" />
            </div>
            <div className="stat-title">Owner Only</div>
            <div className="stat-value text-error">{stats.owner}</div>
            <div className="stat-desc">Admin access</div>
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

      {loading ? (
        <div className="p-12 text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/50">Building sitemap structure...</p>
        </div>
      ) : Object.keys(groupedUrls).length === 0 ? (
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
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 opacity-80 border-b border-base-300 pb-2">
              {category}
              <span className="badge badge-sm badge-ghost">{urls.length}</span>
            </h2>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {urls.map((url) => (
                  <div key={url.url} className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-mono text-sm break-all font-bold">
                          {url.url}
                        </h3>
                        <button
                          className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100"
                          onClick={() => handleOpenUrl(url.fullUrl)}
                          title="Open Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-base-content/70 mb-3 line-clamp-2">
                        {url.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-auto">
                        <div className={`badge badge-xs ${getAccessColor(url.access)}`}>
                          {url.access}
                        </div>
                        <div className={`badge badge-xs badge-outline ${getPriorityColor(url.priority)}`}>
                          P: {url.priority}
                        </div>
                        <div className="badge badge-xs badge-ghost">
                          {url.changefreq}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto bg-base-100 rounded-lg border border-base-200">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th>Description</th>
                      <th>Access</th>
                      <th>Priority</th>
                      <th>Last Mod</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urls.map((url) => (
                      <tr key={url.url} className="hover">
                        <td className="font-mono font-bold text-xs">{url.url}</td>
                        <td className="text-xs max-w-md truncate" title={url.description}>{url.description}</td>
                        <td>
                          <span className={`badge badge-xs ${getAccessColor(url.access)}`}>{url.access}</span>
                        </td>
                        <td>
                          <span className={`badge badge-xs badge-outline ${getPriorityColor(url.priority)}`}>{url.priority}</span>
                        </td>
                        <td className="text-xs opacity-70">{new Date(url.lastmod).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => handleOpenUrl(url.fullUrl)}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default SitemapPage;
