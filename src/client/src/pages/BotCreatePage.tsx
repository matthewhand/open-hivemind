import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent } from '@mui/material';
import { Breadcrumbs, Alert, Select } from '../components/DaisyUI';
import { useNavigate } from 'react-router-dom';

const BotCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'discord',
    persona: 'friendly-helper',
    llmProvider: 'openai'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const breadcrumbItems = [
    { label: 'Bots', href: '/uber/bots' },
    { label: 'Create Bot', href: '/uber/bots/create', isActive: true }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/webui/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Bot created successfully!' });
        setTimeout(() => navigate('/uber/bots'), 2000);
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: error.message || 'Failed to create bot' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error occurred' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
        Create New Bot
      </Typography>

      {alert && (
        <Alert 
          status={alert.type === 'success' ? 'success' : 'error'} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Bot Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                fullWidth
                helperText="Enter a unique name for your bot"
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={3}
                fullWidth
                helperText="Describe what this bot will do"
              />

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Platform</span>
                </label>
                <Select
                  options={[
                    { value: 'discord', label: 'Discord' },
                    { value: 'slack', label: 'Slack' },
                    { value: 'mattermost', label: 'Mattermost' },
                    { value: 'telegram', label: 'Telegram' },
                  ]}
                  value={formData.platform}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Persona</span>
                </label>
                <Select
                  options={[
                    { value: 'friendly-helper', label: 'Friendly Helper' },
                    { value: 'dev-assistant', label: 'Developer Assistant' },
                    { value: 'teacher', label: 'Teacher' },
                  ]}
                  value={formData.persona}
                  onChange={(e) => handleInputChange('persona', e.target.value)}
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">LLM Provider</span>
                </label>
                <Select
                  options={[
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'anthropic', label: 'Anthropic' },
                    { value: 'openwebui', label: 'Open WebUI' },
                    { value: 'flowise', label: 'Flowise' },
                  ]}
                  value={formData.llmProvider}
                  onChange={(e) => handleInputChange('llmProvider', e.target.value)}
                />
              </div>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/uber/bots')}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isCreating || !formData.name}
                >
                  {isCreating ? 'Creating...' : 'Create Bot'}
                </Button>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BotCreatePage;