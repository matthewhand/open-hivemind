import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export interface SitemapUrl {
  url: string;
  fullUrl: string;
  changefreq: string;
  priority: number;
  lastmod: string;
  description: string;
  access: 'public' | 'authenticated' | 'owner';
}

export interface SitemapData {
  generated: string;
  baseUrl: string;
  totalUrls: number;
  urls: SitemapUrl[];
}

export interface UseSitemapReturn {
  sitemapData: SitemapData | null;
  loading: boolean;
  error: string | null;
  refreshSitemap: () => Promise<void>;
  generateXml: (accessFilter?: string) => string;
  exportXml: (accessFilter?: string) => void;
  findRoute: (path: string) => SitemapUrl | undefined;
  getBreadcrumbs: (path: string) => SitemapUrl[];
}

export const useSitemap = (): UseSitemapReturn => {
  const [sitemapData, setSitemapData] = useState<SitemapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const fetchSitemap = useCallback(async (accessFilter?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParam = accessFilter ? `?access=${accessFilter}` : '';
      const response = await fetch(`/sitemap.json${queryParam}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSitemapData(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSitemap = useCallback(async () => {
    await fetchSitemap();
  }, [fetchSitemap]);

  const generateXml = useCallback((accessFilter?: string): string => {
    if (!sitemapData) {return '';}
    
    const filteredUrls = accessFilter 
      ? sitemapData.urls.filter(url => url.access === accessFilter)
      : sitemapData.urls;

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const urlsetClose = '</urlset>';
    
    const urls = filteredUrls.map(url => `
  <url>
    <loc>${url.fullUrl}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');

    return xmlHeader + urlsetOpen + urls + '\n' + urlsetClose;
  }, [sitemapData]);

  const exportXml = useCallback((accessFilter?: string) => {
    const xml = generateXml(accessFilter);
    if (!xml) {return;}

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sitemap${accessFilter ? `-${accessFilter}` : ''}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generateXml]);

  const findRoute = useCallback((path: string): SitemapUrl | undefined => {
    if (!sitemapData) {return undefined;}
    return sitemapData.urls.find(url => url.url === path);
  }, [sitemapData]);

  const getBreadcrumbs = useCallback((path: string): SitemapUrl[] => {
    if (!sitemapData) {return [];}
    
    const breadcrumbs: SitemapUrl[] = [];
    const segments = path.split('/').filter(Boolean);
    
    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const route = findRoute(currentPath);
      if (route) {
        breadcrumbs.push(route);
      }
    }
    
    return breadcrumbs;
  }, [sitemapData, findRoute]);

  // Auto-fetch sitemap on mount
  useEffect(() => {
    fetchSitemap();
  }, [fetchSitemap]);

  // Auto-refresh sitemap when route changes (optional)
  useEffect(() => {
    // Could implement auto-refresh logic here if needed
    // For now, we'll keep the sitemap static until manually refreshed
  }, [location.pathname]);

  return {
    sitemapData,
    loading,
    error,
    refreshSitemap,
    generateXml,
    exportXml,
    findRoute,
    getBreadcrumbs,
  };
};

export { useSitemap };
export default useSitemap;