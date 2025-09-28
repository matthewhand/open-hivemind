import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, CardActions, Button, Switch, FormControlLabel, TextField, Chip, Grid, Divider } from '@mui/material';
import { Alert } from '../DaisyUI';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'messaging' | 'ai' | 'database' | 'monitoring' | 'other';
  enabled: boolean;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, any>;
}

const SettingsIntegrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'discord',
      name: 'Discord',
      description: 'Discord bot integration for community management',
      category: 'messaging',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Slack workspace integration for team collaboration',
      category: 'messaging',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'mattermost',
      name: 'Mattermost',
      description: 'Self-hosted team communication platform',
      category: 'messaging',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      description: 'Telegram bot for instant messaging',
      category: 'messaging',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models and AI capabilities',
      category: 'ai',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'Claude AI assistant integration',
      category: 'ai',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'flowise',
      name: 'Flowise',
      description: 'Visual LLM orchestration platform',
      category: 'ai',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'prometheus',
      name: 'Prometheus',
      description: 'Metrics collection and monitoring',
      category: 'monitoring',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'grafana',
      name: 'Grafana',
      description: 'Metrics visualization and dashboards',
      category: 'monitoring',
      enabled: false,
      configured: false,
      status: 'disconnected'
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleToggleIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;

    if (!integration.configured && !integration.enabled) {
      setAlert({ type: 'error', message: 'Please configure this integration before enabling it' });
      return;
    }

    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { 
            ...integration, 
            enabled: !integration.enabled,
            status: !integration.enabled ? 'connected' : 'disconnected'
          }
        : integration
    ));

    setAlert({ 
      type: 'success', 
      message: `${integration.name} ${!integration.enabled ? 'enabled' : 'disabled'} successfully` 
    });
  };

  const handleConfigure = (id: string) => {
    // In a real app, this would open a configuration dialog
    setAlert({ type: 'success', message: 'Configuration dialog would open here' });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'messaging': return 'primary';
      case 'ai': return 'secondary';
      case 'database': return 'info';
      case 'monitoring': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'disconnected': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Integrations
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Manage third-party integrations and external service connections
      </Typography>

      {alert && (
        <Alert 
          status={alert.type === 'success' ? 'success' : 'error'} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Box sx={{ mt: 3 }}>
        {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
              {category} Integrations
            </Typography>
            
            <Grid container spacing={3}>
              {categoryIntegrations.map((integration) => (
                <Grid item xs={12} md={6} lg={4} key={integration.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3">
                          {integration.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip 
                            label={integration.status}
                            color={getStatusColor(integration.status) as any}
                            size="small"
                          />
                          <Chip 
                            label={integration.category}
                            color={getCategoryColor(integration.category) as any}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {integration.description}
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={integration.enabled}
                            onChange={() => handleToggleIntegration(integration.id)}
                            disabled={!integration.configured}
                          />
                        }
                        label={integration.enabled ? 'Enabled' : 'Disabled'}
                      />

                      {!integration.configured && (
                        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                          Configuration required
                        </Typography>
                      )}
                    </CardContent>
                    
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => handleConfigure(integration.id)}
                        variant={integration.configured ? 'outlined' : 'contained'}
                      >
                        {integration.configured ? 'Reconfigure' : 'Configure'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Integration Statistics */}
      <Typography variant="h6" gutterBottom>
        Integration Statistics
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Integrations
              </Typography>
              <Typography variant="h4">
                {integrations.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Enabled
              </Typography>
              <Typography variant="h4" color="success.main">
                {integrations.filter(i => i.enabled).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Configured
              </Typography>
              <Typography variant="h4" color="info.main">
                {integrations.filter(i => i.configured).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Connected
              </Typography>
              <Typography variant="h4" color="primary.main">
                {integrations.filter(i => i.status === 'connected').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="outlined"
          size="large"
        >
          Refresh All Connections
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsIntegrations;