import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, FormControl, InputLabel, Select, MenuItem, Button, Alert as MuiAlert } from '@mui/material';
import { Launch as LaunchIcon, Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Breadcrumbs } from '../components/DaisyUI';

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
    { label: 'Sitemap', href: '/uber/sitemap', isActive: true }
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
      case 'public': return 'success';
      case 'authenticated': return 'warning';
      case 'owner': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 0.8) return 'success';
    if (priority >= 0.5) return 'warning';
    return 'default';
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
      if (url.url.includes('/bots')) category = 'Bot Management';
      else if (url.url.includes('/mcp')) category = 'MCP Servers';
      else if (url.url.includes('/monitoring') || url.url.includes('/activity')) category = 'Monitoring';
      else if (url.url.includes('/settings')) category = 'Settings';
      else category = 'Main Dashboard';
    } else if (url.url.startsWith('/webui') || url.url.startsWith('/admin')) {
      category = 'Legacy Interfaces';
    } else if (url.url.startsWith('/health') || url.url.startsWith('/api')) {
      category = 'System APIs';
    } else if (url.url === '/login') {
      category = 'Authentication';
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(url);
    return acc;
  }, {} as Record<string, SitemapUrl[]>) || {};

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading sitemap...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Breadcrumbs items={breadcrumbItems} />
        <MuiAlert severity="error" sx={{ mt: 2 }}>
          Error loading sitemap: {error}
        </MuiAlert>
        <Button onClick={fetchSitemap} startIcon={<RefreshIcon />} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          🗺️ Dynamic Sitemap
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete navigation structure and page hierarchy
        </Typography>
      </Box>

      {/* Statistics and Controls */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Pages
              </Typography>
              <Typography variant="h4">
                {sitemapData?.totalUrls || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Generated
              </Typography>
              <Typography variant="body1">
                {sitemapData ? new Date(sitemapData.generated).toLocaleString() : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Access Level</InputLabel>
            <Select
              value={accessFilter}
              label="Access Level"
              onChange={(e) => setAccessFilter(e.target.value)}
            >
              <MenuItem value="all">All Pages</MenuItem>
              <MenuItem value="public">Public Only</MenuItem>
              <MenuItem value="authenticated">Authenticated</MenuItem>
              <MenuItem value="owner">Owner Only</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: 'flex', gap: 1, height: '100%', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleDownloadXml}
              startIcon={<DownloadIcon />}
              fullWidth
            >
              Download XML
            </Button>
            <Button
              variant="outlined"
              onClick={fetchSitemap}
              startIcon={<RefreshIcon />}
            >
              <RefreshIcon />
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Grouped URLs */}
      {Object.entries(groupedUrls).map(([category, urls]) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {category}
            <Chip label={urls.length} size="small" />
          </Typography>
          
          <Grid container spacing={2}>
            {urls.map((url, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h3" sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.9rem',
                        wordBreak: 'break-all'
                      }}>
                        {url.url}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleOpenUrl(url.fullUrl)}
                        startIcon={<LaunchIcon />}
                        sx={{ ml: 1, minWidth: 'auto' }}
                      >
                        <LaunchIcon fontSize="small" />
                      </Button>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {url.description}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip 
                        label={url.access}
                        color={getAccessColor(url.access) as any}
                        size="small"
                      />
                      <Chip 
                        label={`Priority: ${url.priority}`}
                        color={getPriorityColor(url.priority) as any}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={url.changefreq}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Last modified: {new Date(url.lastmod).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* Sitemap Links */}
      <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Sitemap Formats
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Access the sitemap in different formats:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => window.open('/sitemap.xml', '_blank')}
          >
            XML Sitemap (SEO)
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.open('/sitemap.json', '_blank')}
          >
            JSON API
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.open('/sitemap', '_blank')}
          >
            Human-Readable HTML
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SitemapPage;