import React from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActions, Button } from '@mui/material';
import { Launch as LaunchIcon, Home as HomeIcon, HourglassEmpty as LoadingIcon, DesktopMac as ScreensaverIcon } from '@mui/icons-material';
import { Breadcrumbs } from '../components/DaisyUI';

const StaticPagesPage: React.FC = () => {
  const breadcrumbItems = [{ label: 'Static Pages', href: '/uber/static', isActive: true }];

  const staticPages = [
    {
      title: 'Enhanced Homepage',
      description: 'Beautiful landing page with enhanced UI and animations',
      icon: <HomeIcon sx={{ fontSize: 40 }} />,
      url: '/enhanced-homepage.html',
      color: 'primary'
    },
    {
      title: 'Loading Page',
      description: 'Elegant loading screen with progress indicators',
      icon: <LoadingIcon sx={{ fontSize: 40 }} />,
      url: '/loading.html',
      color: 'secondary'
    },
    {
      title: 'Screensaver',
      description: 'Interactive screensaver display for idle states',
      icon: <ScreensaverIcon sx={{ fontSize: 40 }} />,
      url: '/screensaver.html',
      color: 'info'
    }
  ];

  const handleOpenPage = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Static Pages
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and access static HTML pages and resources
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {staticPages.map((page, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: `${page.color}.main`, mb: 2 }}>
                  {page.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {page.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {page.description}
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, fontFamily: 'monospace', color: 'text.secondary' }}>
                  {page.url}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button 
                  variant="contained" 
                  color={page.color as any}
                  onClick={() => handleOpenPage(page.url)}
                  startIcon={<LaunchIcon />}
                >
                  Open Page
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          About Static Pages
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          These static HTML pages are served directly from the public directory and can be used for:
        </Typography>
        <ul>
          <li><Typography variant="body2">Landing pages and marketing content</Typography></li>
          <li><Typography variant="body2">Loading screens during application startup</Typography></li>
          <li><Typography variant="body2">Screensavers for kiosk or display modes</Typography></li>
          <li><Typography variant="body2">Offline fallback pages</Typography></li>
        </ul>
      </Box>
    </Box>
  );
};

export default StaticPagesPage;