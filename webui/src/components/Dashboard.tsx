import React, { useEffect, useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { apiService } from '../services/api';
import type { Bot, StatusResponse } from '../services/api';

const Dashboard: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configData, statusData] = await Promise.all([
          apiService.getConfig(),
          apiService.getStatus(),
        ]);
        setBots(configData.bots);
        setStatus(statusData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (botStatus: string) => {
    switch (botStatus.toLowerCase()) {
      case 'active':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'inactive':
      case 'unavailable':
        return 'error';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'discord':
        return '🤖';
      case 'slack':
        return '💬';
      case 'mattermost':
        return '📱';
      default:
        return '🔧';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Open-Hivemind Dashboard
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={3}>
        {bots.map((bot, index) => {
          const botStatusData = status?.bots[index];
          const botStatus = botStatusData?.status || 'unknown';
          const healthDetails = botStatusData?.healthDetails;
          const connected = (botStatusData as any)?.connected ?? undefined;
          const messageCount = (botStatusData as any)?.messageCount ?? undefined;
          const errorCount = (botStatusData as any)?.errorCount ?? undefined;

          return (
            <Box key={bot.name} sx={{ minWidth: 300, flex: '1 1 auto' }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" component="h2" sx={{ mr: 1 }}>
                      {getProviderIcon(bot.messageProvider)}
                    </Typography>
                    <Typography variant="h6" component="h2">
                      {bot.name}
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Chip
                      label={`Provider: ${bot.messageProvider}`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip
                      label={`LLM: ${bot.llmProvider}`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                      Status:
                    </Typography>
                    <Chip
                      label={botStatus}
                      color={getStatusColor(botStatus)}
                      size="small"
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {typeof connected === 'boolean' && (
                      <Chip
                        label={connected ? 'Connected' : 'Disconnected'}
                        color={connected ? 'success' : 'warning'}
                        size="small"
                      />
                    )}
                    {typeof messageCount === 'number' && (
                      <Chip
                        label={`Messages: ${messageCount}`}
                        size="small"
                      />
                    )}
                    {typeof errorCount === 'number' && errorCount > 0 && (
                      <Chip
                        label={`Errors: ${errorCount}`}
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>

                  {healthDetails && Object.keys(healthDetails).length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Details:
                      </Typography>
                      {healthDetails.guilds && (
                        <Typography variant="caption" display="block">
                          Guilds: {healthDetails.guilds}
                        </Typography>
                      )}
                      {healthDetails.team && (
                        <Typography variant="caption" display="block">
                          Team: {healthDetails.team}
                        </Typography>
                      )}
                      {healthDetails.error && (
                        <Typography variant="caption" display="block" color="error">
                          Error: {healthDetails.error}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {status && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Uptime: {Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
