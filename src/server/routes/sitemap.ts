import type { Request, Response } from 'express';
import { Router } from 'express';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';

const router = Router();

interface SitemapUrl {
  url: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  lastmod?: string;
  description?: string;
  access?: 'public' | 'authenticated' | 'owner';
}

// Define all routes with metadata
const getRouteDefinitions = (): SitemapUrl[] => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3028';
  const now = new Date().toISOString();

  return [
    // Root and main entry points
    {
      url: '/',
      changefreq: 'daily',
      priority: 1.0,
      lastmod: now,
      description: 'Open-Hivemind - Multi-Agent AI Platform',
      access: 'public',
    },
    {
      url: '/uber',
      changefreq: 'daily',
      priority: 1.0,
      lastmod: now,
      description: 'Main Dashboard - Uber Interface',
      access: 'public',
    },
    
    // Dashboard pages
    {
      url: '/uber/overview',
      changefreq: 'daily',
      priority: 0.9,
      lastmod: now,
      description: 'System Overview and Status',
      access: 'public',
    },
    
    // Bot management
    {
      url: '/uber/bots',
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: now,
      description: 'Bot Management Hub',
      access: 'public',
    },
    {
      url: '/uber/bots/create',
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: now,
      description: 'Create New Bot Instance',
      access: 'public',
    },
    {
      url: '/uber/bots/templates',
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: now,
      description: 'Bot Templates Gallery',
      access: 'public',
    },
    
    // Persona management
    {
      url: '/uber/personas',
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: now,
      description: 'AI Persona Management',
      access: 'public',
    },
    
    // MCP Server management (Owner-only)
    {
      url: '/uber/mcp',
      changefreq: 'weekly',
      priority: 0.6,
      lastmod: now,
      description: 'MCP Server Management',
      access: 'owner',
    },
    {
      url: '/uber/mcp/servers',
      changefreq: 'weekly',
      priority: 0.6,
      lastmod: now,
      description: 'MCP Server Configuration',
      access: 'owner',
    },
    {
      url: '/uber/mcp/tools',
      changefreq: 'daily',
      priority: 0.6,
      lastmod: now,
      description: 'MCP Tools Management',
      access: 'owner',
    },
    
    // Security and guards
    {
      url: '/uber/guards',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: now,
      description: 'Access Control Guards',
      access: 'owner',
    },
    
    // Monitoring and activity
    {
      url: '/uber/monitoring',
      changefreq: 'hourly',
      priority: 0.8,
      lastmod: now,
      description: 'System Monitoring Dashboard',
      access: 'public',
    },
    {
      url: '/uber/activity',
      changefreq: 'hourly',
      priority: 0.7,
      lastmod: now,
      description: 'Real-time Activity Monitor',
      access: 'public',
    },
    
    // Settings and configuration
    {
      url: '/uber/settings',
      changefreq: 'monthly',
      priority: 0.6,
      lastmod: now,
      description: 'System Settings and Configuration',
      access: 'public',
    },
    
    // Utilities
    {
      url: '/uber/export',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: now,
      description: 'Data Export Tools',
      access: 'public',
    },
    {
      url: '/uber/static',
      changefreq: 'weekly',
      priority: 0.4,
      lastmod: now,
      description: 'Static Pages and Resources',
      access: 'public',
    },
    {
      url: '/uber/showcase',
      changefreq: 'weekly',
      priority: 0.3,
      lastmod: now,
      description: 'DaisyUI Component Showcase',
      access: 'public',
    },
    
    // Legacy interfaces
    {
      url: '/webui',
      changefreq: 'monthly',
      priority: 0.4,
      lastmod: now,
      description: 'Legacy WebUI Interface',
      access: 'public',
    },
    {
      url: '/admin',
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: now,
      description: 'Admin Interface',
      access: 'authenticated',
    },
    
    // Authentication
    {
      url: '/login',
      changefreq: 'yearly',
      priority: 0.3,
      lastmod: now,
      description: 'User Login',
      access: 'public',
    },
    
    // API documentation (if publicly accessible)
    {
      url: '/api',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: now,
      description: 'API Documentation',
      access: 'public',
    },
    
    // Health endpoints
    {
      url: '/health',
      changefreq: 'daily',
      priority: 0.2,
      lastmod: now,
      description: 'Health Check Endpoint',
      access: 'public',
    },
    {
      url: '/health/detailed',
      changefreq: 'daily',
      priority: 0.2,
      lastmod: now,
      description: 'Detailed Health Information',
      access: 'public',
    },
  ];
};

// Generate XML sitemap
router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const routes = getRouteDefinitions();
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    // Filter routes based on access level if needed
    const accessLevel = req.query.access as string;
    let filteredRoutes = routes;
    
    if (accessLevel) {
      filteredRoutes = routes.filter(route => route.access === accessLevel);
    }
    
    // Create sitemap stream
    const sitemap = new SitemapStream({ hostname: baseUrl });
    
    // Add URLs to sitemap
    const sitemapXml = await streamToPromise(
      Readable.from(filteredRoutes.map(route => ({
        url: route.url,
        changefreq: route.changefreq,
        priority: route.priority,
        lastmod: route.lastmod,
      }))).pipe(sitemap),
    );
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXml.toString());
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Generate JSON sitemap for API consumption
router.get('/sitemap.json', (req: Request, res: Response) => {
  try {
    const routes = getRouteDefinitions();
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    const accessLevel = req.query.access as string;
    let filteredRoutes = routes;
    
    if (accessLevel) {
      filteredRoutes = routes.filter(route => route.access === accessLevel);
    }
    
    const sitemap = {
      generated: new Date().toISOString(),
      baseUrl,
      totalUrls: filteredRoutes.length,
      urls: filteredRoutes.map(route => ({
        ...route,
        fullUrl: `${baseUrl}${route.url}`,
      })),
    };
    
    res.json(sitemap);
  } catch (error) {
    console.error('Error generating JSON sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Generate human-readable sitemap page
router.get('/sitemap', (req: Request, res: Response) => {
  try {
    const routes = getRouteDefinitions();
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Open-Hivemind Sitemap</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .route-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .route-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #f9f9f9; }
        .route-url { font-weight: bold; color: #007bff; }
        .route-desc { color: #666; margin: 5px 0; }
        .route-meta { font-size: 0.9em; color: #888; }
        .access-badge { 
            display: inline-block; 
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 0.8em; 
            font-weight: bold;
        }
        .access-public { background: #d4edda; color: #155724; }
        .access-authenticated { background: #fff3cd; color: #856404; }
        .access-owner { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🗺️ Open-Hivemind Sitemap</h1>
        <p>Complete navigation structure and page hierarchy</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Pages:</strong> ${routes.length}</p>
    </div>
    
    ${generateSectionHTML('Main Application', routes.filter(r => r.url.startsWith('/uber')), baseUrl)}
    ${generateSectionHTML('Legacy Interfaces', routes.filter(r => r.url.startsWith('/webui') || r.url.startsWith('/admin')), baseUrl)}
    ${generateSectionHTML('System Endpoints', routes.filter(r => r.url.startsWith('/health') || r.url.startsWith('/api') || r.url === '/login'), baseUrl)}
    ${generateSectionHTML('Root Pages', routes.filter(r => r.url === '/'), baseUrl)}
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('Error generating HTML sitemap:', error);
    res.status(500).send('Failed to generate sitemap');
  }
});

function generateSectionHTML(title: string, routes: SitemapUrl[], baseUrl: string): string {
  if (routes.length === 0) {return '';}
  
  return `
    <div class="section">
        <h2>${title}</h2>
        <div class="route-grid">
            ${routes.map(route => `
                <div class="route-card">
                    <div class="route-url">
                        <a href="${baseUrl}${route.url}" target="_blank">${route.url}</a>
                    </div>
                    <div class="route-desc">${route.description}</div>
                    <div class="route-meta">
                        <span class="access-badge access-${route.access}">${route.access}</span>
                        Priority: ${route.priority} | ${route.changefreq}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;
}

export default router;