import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSitemap, type SitemapData } from '@/hooks/useSitemap';

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and link behavior
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => mockLink),
});
Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn(),
});
Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn(),
});

// Wrapper component to provide router context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
);

describe('useSitemap Hook', () => {
  const mockSitemapData: SitemapData = {
    generated: '2023-10-26T10:00:00Z',
    baseUrl: 'https://example.com',
    totalUrls: 3,
    urls: [
      {
        url: '/',
        fullUrl: 'https://example.com/',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: '2023-10-26T10:00:00Z',
        description: 'Home page',
        access: 'public',
      },
      {
        url: '/dashboard',
        fullUrl: 'https://example.com/dashboard',
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: '2023-10-25T10:00:00Z',
        description: 'Dashboard page',
        access: 'authenticated',
      },
      {
        url: '/admin',
        fullUrl: 'https://example.com/admin',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: '2023-10-24T10:00:00Z',
        description: 'Admin page',
        access: 'owner',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });
    
    expect(result.current.sitemapData).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch sitemap data successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSitemapData),
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.sitemapData).toEqual(mockSitemapData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(fetch).toHaveBeenCalledWith('/sitemap.json');
  });

  it('should handle fetch error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.sitemapData).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch sitemap: Not Found');
    });
  });

  it('should refresh sitemap data', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSitemapData),
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.sitemapData).toEqual(mockSitemapData);
    });

    // Clear the fetch mock
    (fetch as jest.Mock).mockClear();

    // Call refreshSitemap
    await act(async () => {
      await result.current.refreshSitemap();
    });

    expect(fetch).toHaveBeenCalledWith('/sitemap.json');
  });

  it('should generate XML correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSitemapData),
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.sitemapData).toEqual(mockSitemapData);
    });

    const xml = result.current.generateXml();
    
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/dashboard</loc>');
    expect(xml).toContain('<loc>https://example.com/admin</loc>');
    expect(xml).toContain('</urlset>');
  });

  it('should generate XML with access filter', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSitemapData),
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.sitemapData).toEqual(mockSitemapData);
    });

    const xml = result.current.generateXml('authenticated');
    
    expect(xml).toContain('<loc>https://example.com/dashboard</loc>');
    expect(xml).not.toContain('<loc>https://example.com/</loc>');
    expect(xml).not.toContain('<loc>https://example.com/admin</loc>');
  });

  it('should export XML correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSitemapData),
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.sitemapData).toEqual(mockSitemapData);
    });

    act(() => {
      result.current.exportXml('public');
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('sitemap-public.xml');
    expect(mockLink.click).toHaveBeenCalled();
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should find route correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSitemapData),
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.sitemapData).toEqual(mockSitemapData);
    });

    const route = result.current.findRoute('/dashboard');
    expect(route).toEqual(mockSitemapData.urls[1]);

    const nonExistentRoute = result.current.findRoute('/non-existent');
    expect(nonExistentRoute).toBeUndefined();
  });

  it('should get breadcrumbs correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSitemapData),
    });

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.sitemapData).toEqual(mockSitemapData);
    });

    const breadcrumbs = result.current.getBreadcrumbs('/dashboard');
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]).toEqual(mockSitemapData.urls[1]);

    const emptyBreadcrumbs = result.current.getBreadcrumbs('/non-existent');
    expect(emptyBreadcrumbs).toHaveLength(0);
  });

  it('should return empty XML when sitemap data is null', () => {
    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    const xml = result.current.generateXml();
    expect(xml).toBe('');
  });

  it('should handle network error', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSitemap(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });
});