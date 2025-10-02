import React from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActions, Button } from '@mui/material';
import { Add as AddIcon, ViewList as ListIcon, LibraryBooks as TemplatesIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import BotManager from '../components/BotManager';
import { Breadcrumbs } from '../components/DaisyUI';

const BotsPage: React.FC = () => {
  const navigate = useNavigate();
  const breadcrumbItems = [{ label: 'Bots', href: '/uber/bots', isActive: true }];

  const quickActions = [
    {
      title: 'Create New Bot',
      description: 'Set up a new bot instance with custom configuration',
      icon: <AddIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/uber/bots/create'),
      color: 'primary'
    },
    {
      title: 'Bot Templates',
      description: 'Browse pre-configured templates for quick bot setup',
      icon: <TemplatesIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/uber/bots/templates'),
      color: 'secondary'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Bot Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your bot instances, create new bots, and configure settings
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: `${action.color}.main`, mb: 2 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button 
                  variant="contained" 
                  color={action.color as any}
                  onClick={action.action}
                >
                  {action.title.split(' ')[0]}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Existing Bot Manager */}
      <BotManager />
    </Box>
  );
};

export default BotsPage;