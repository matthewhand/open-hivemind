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
  Grid,
  TextField,
  InputAdornment,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiService } from '../services/api';
import type { Bot, StatusResponse, ActivityResponse } from '../services/api';
import QuickActions from './QuickActions';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setError(null);
      const [configData, statusData, activityData] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
        apiService.getActivity(),
      ]);
      setBots(configData.bots);
      setStatus(statusData);
      setActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const getStatusGradient = (botStatus: string) => {
    switch (botStatus.toLowerCase()) {
      case 'active':
        return 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
      case 'connecting':
        return 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)';
      case 'inactive':
      case 'unavailable':
        return 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)';
      case 'error':
        return 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)';
      default:
        return 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)';
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

  const filteredBots = bots.filter(bot =>
    bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bot.messageProvider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bot.llmProvider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare chart data
  const messageVolumeData = activity?.timeline.map(bucket => ({
    time: new Date(bucket.timestamp).toLocaleTimeString(),
    discord: bucket.messageProviders.discord || 0,
    slack: bucket.messageProviders.slack || 0,
    mattermost: bucket.messageProviders.mattermost || 0,
  })) || [];

  const statusDistribution = status?.bots.reduce((acc, bot) => {
    acc[bot.status] = (acc[bot.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const statusPieData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: status,
    value: count,
    color: status === 'active' ? '#4caf50' : status === 'connecting' ? '#ff9800' : '#f44336',
  }));

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Skeleton variant="text" sx={{ fontSize: '2.5rem', mb: 2 }} />
        <Skeleton variant="rectangular" height={100} sx={{ mb: 4 }} />
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Container>
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
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          background: 'linear-gradient(45deg, #007bff 30%, #21CBF3 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
        }}
      >
        Open-Hivemind Dashboard
      </Typography>

      <QuickActions onRefresh={fetchData} />

      {/* Search Bar */}
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search bots by name, provider, or LLM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Message Volume Over Time
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={messageVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="discord"
                      stroke="#5865f2"
                      strokeWidth={2}
                      name="Discord"
                    />
                    <Line
                      type="monotone"
                      dataKey="slack"
                      stroke="#4a154b"
                      strokeWidth={2}
                      name="Slack"
                    />
                    <Line
                      type="monotone"
                      dataKey="mattermost"
                      stroke="#1b5e20"
                      strokeWidth={2}
                      name="Mattermost"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bot Status Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bot Cards */}
      <Grid container spacing={3}>
        {filteredBots.map((bot, index) => {
          const botStatusData = status?.bots[index];
          const botStatus = botStatusData?.status || 'unknown';
          const healthDetails = botStatusData?.healthDetails;
          const connected = (botStatusData as any)?.connected ?? undefined;
          const messageCount = (botStatusData as any)?.messageCount ?? undefined;
          const errorCount = (botStatusData as any)?.errorCount ?? undefined;

          return (
            <Grid item xs={12} sm={6} md={4} key={bot.name}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
                  },
                  background: getStatusGradient(botStatus),
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h2" sx={{ mr: 1, fontSize: '1.5rem' }}>
                      {getProviderIcon(bot.messageProvider)}
                    </Typography>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                      {bot.name}
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Chip
                      label={`Provider: ${bot.messageProvider}`}
                      size="small"
                      sx={{
                        mr: 1,
                        mb: 1,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                    />
                    <Chip
                      label={`LLM: ${bot.llmProvider}`}
                      size="small"
                      sx={{
                        mr: 1,
                        mb: 1,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                    />
                  </Box>

                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="body2" sx={{ mr: 1, opacity: 0.9 }}>
                      Status:
                    </Typography>
                    <Chip
                      label={botStatus}
                      color={getStatusColor(botStatus)}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.9)',
                        color: 'rgba(0,0,0,0.87)',
                        fontWeight: 600,
                      }}
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
                    {typeof connected === 'boolean' && (
                      <Chip
                        label={connected ? 'Connected' : 'Disconnected'}
                        color={connected ? 'success' : 'warning'}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.9)',
                          color: 'rgba(0,0,0,0.87)',
                        }}
                      />
                    )}
                    {typeof messageCount === 'number' && (
                      <Chip
                        label={`📨 ${messageCount}`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                      />
                    )}
                    {typeof errorCount === 'number' && errorCount > 0 && (
                      <Chip
                        label={`⚠️ ${errorCount}`}
                        color="error"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.9)',
                          color: 'rgba(0,0,0,0.87)',
                        }}
                      />
                    )}
                  </Box>

                  {healthDetails && Object.keys(healthDetails).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Details:
                      </Typography>
                      {healthDetails.guilds && (
                        <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
                          🏰 Guilds: {healthDetails.guilds}
                        </Typography>
                      )}
                      {healthDetails.team && (
                        <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
                          👥 Team: {healthDetails.team}
                        </Typography>
                      )}
                      {healthDetails.error && (
                        <Typography variant="caption" display="block" sx={{ color: '#ffcccb' }}>
                          ❌ Error: {healthDetails.error}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {status && (
        <Card sx={{ mt: 4, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ⏱️ Uptime: {Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🤖 Total Bots: {bots.length}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default Dashboard;
