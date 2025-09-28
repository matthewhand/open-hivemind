import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip } from '@mui/material';
import { Breadcrumbs } from '../components/DaisyUI';
import { useNavigate } from 'react-router-dom';

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  persona: string;
  llmProvider: string;
  tags: string[];
  featured: boolean;
}

const BotTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const breadcrumbItems = [
    { label: 'Bots', href: '/uber/bots' },
    { label: 'Templates', href: '/uber/bots/templates', isActive: true }
  ];

  // Mock templates - in real app this would come from API
  const mockTemplates: BotTemplate[] = [
    {
      id: '1',
      name: 'Discord Community Bot',
      description: 'A friendly bot for managing Discord communities with moderation and engagement features.',
      platform: 'discord',
      persona: 'friendly-helper',
      llmProvider: 'openai',
      tags: ['community', 'moderation', 'discord'],
      featured: true
    },
    {
      id: '2',
      name: 'Development Assistant',
      description: 'Technical support bot for development teams with code review and documentation help.',
      platform: 'slack',
      persona: 'dev-assistant',
      llmProvider: 'anthropic',
      tags: ['development', 'technical', 'code-review'],
      featured: true
    },
    {
      id: '3',
      name: 'Educational Tutor',
      description: 'Patient teaching assistant for educational environments and training programs.',
      platform: 'mattermost',
      persona: 'teacher',
      llmProvider: 'openai',
      tags: ['education', 'teaching', 'training'],
      featured: false
    },
    {
      id: '4',
      name: 'Customer Support Bot',
      description: 'Professional customer service bot with FAQ and escalation capabilities.',
      platform: 'telegram',
      persona: 'friendly-helper',
      llmProvider: 'openwebui',
      tags: ['support', 'customer-service', 'faq'],
      featured: false
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTemplates(mockTemplates);
      setLoading(false);
    }, 1000);
  }, []);

  const handleUseTemplate = (template: BotTemplate) => {
    // In real app, this would pre-populate the create form
    navigate('/uber/bots/create', { 
      state: { 
        template: {
          platform: template.platform,
          persona: template.persona,
          llmProvider: template.llmProvider,
          name: `${template.name} Copy`,
          description: template.description
        }
      }
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      discord: 'primary',
      slack: 'secondary',
      mattermost: 'info',
      telegram: 'success'
    };
    return colors[platform] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading templates...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Bot Templates
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Quick-start templates to help you create bots faster. Choose a template and customize it for your needs.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: template.featured ? '2px solid' : 'none',
                borderColor: template.featured ? 'primary.main' : 'transparent'
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    {template.name}
                  </Typography>
                  {template.featured && (
                    <Chip label="Featured" color="primary" size="small" />
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {template.description}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip 
                    label={template.platform.charAt(0).toUpperCase() + template.platform.slice(1)}
                    color={getPlatformColor(template.platform) as any}
                    size="small"
                  />
                  <Chip label={template.persona} variant="outlined" size="small" />
                  <Chip label={template.llmProvider} variant="outlined" size="small" />
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {template.tags.map((tag) => (
                    <Chip key={tag} label={tag} variant="outlined" size="small" />
                  ))}
                </Box>
              </CardContent>
              
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => handleUseTemplate(template)}
                  variant="contained"
                  fullWidth
                >
                  Use Template
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/uber/bots/create')}
        >
          Create Custom Bot
        </Button>
      </Box>
    </Box>
  );
};

export default BotTemplatesPage;