import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Button,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface ConfigurationMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

interface UsageStatistic {
  feature: string;
  usage: number;
  efficiency: number;
  recommendations: string[];
}

interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: string;
}

const ConfigurationAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<ConfigurationMetric[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStatistic[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from an API
      // For now, we'll simulate analytics data

      const mockMetrics: ConfigurationMetric[] = [
        {
          name: 'Configuration Changes',
          value: 45,
          change: 12,
          trend: 'up',
          category: 'Activity'
        },
        {
          name: 'Active Bots',
          value: 8,
          change: 2,
          trend: 'up',
          category: 'Performance'
        },
        {
          name: 'Error Rate',
          value: 2.3,
          change: -0.8,
          trend: 'down',
          category: 'Reliability'
        },
        {
          name: 'Response Time',
          value: 245,
          change: -15,
          trend: 'down',
          category: 'Performance'
        }
      ];

      const mockUsageStats: UsageStatistic[] = [
        {
          feature: 'Message Processing',
          usage: 89,
          efficiency: 94,
          recommendations: ['Consider increasing batch size', 'Optimize LLM calls']
        },
        {
          feature: 'Configuration Management',
          usage: 67,
          efficiency: 87,
          recommendations: ['Use hot reload more frequently', 'Implement automated backups']
        },
        {
          feature: 'Monitoring & Alerting',
          usage: 45,
          efficiency: 92,
          recommendations: ['Configure more alert thresholds', 'Set up automated responses']
        }
      ];

      const mockSuggestions: OptimizationSuggestion[] = [
        {
          id: '1',
          title: 'Enable Configuration Caching',
          description: 'Implement Redis caching for frequently accessed configurations to reduce database load',
          impact: 'high',
          effort: 'medium',
          category: 'Performance'
        },
        {
          id: '2',
          title: 'Implement Configuration Validation',
          description: 'Add schema validation for all configuration changes to prevent runtime errors',
          impact: 'high',
          effort: 'low',
          category: 'Reliability'
        },
        {
          id: '3',
          title: 'Optimize Bot Restart Logic',
          description: 'Implement graceful bot restarts with zero-downtime deployment',
          impact: 'medium',
          effort: 'high',
          category: 'Availability'
        }
      ];

      setMetrics(mockMetrics);
      setUsageStats(mockUsageStats);
      setSuggestions(mockSuggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingDownIcon color="error" />;
      default:
        return <BarChartIcon color="action" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Configuration Analytics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadAnalytics}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" component="h2">
                    {metric.name}
                  </Typography>
                  {getTrendIcon(metric.trend)}
                </Box>
                <Typography variant="h4" component="p" sx={{ mb: 1 }}>
                  {typeof metric.value === 'number' && metric.value % 1 !== 0
                    ? metric.value.toFixed(1)
                    : metric.value}
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography
                    variant="body2"
                    sx={{
                      color: getTrendColor(metric.trend),
                      mr: 1
                    }}
                  >
                    {metric.change > 0 ? '+' : ''}{metric.change}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs last period
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Usage Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Usage & Efficiency
              </Typography>
              <List dense>
                {usageStats.map((stat, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1">{stat.feature}</Typography>
                          <Box display="flex" gap={1}>
                            <Chip
                              label={`${stat.usage}% used`}
                              size="small"
                              color="primary"
                            />
                            <Chip
                              label={`${stat.efficiency}% efficient`}
                              size="small"
                              color={stat.efficiency > 90 ? 'success' : stat.efficiency > 80 ? 'warning' : 'error'}
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Recommendations:
                          </Typography>
                          {stat.recommendations.map((rec, recIndex) => (
                            <Typography key={recIndex} variant="caption" display="block">
                              • {rec}
                            </Typography>
                          ))}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Optimization Suggestions */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Optimization Suggestions
              </Typography>
              <List dense>
                {suggestions.map((suggestion) => (
                  <ListItem key={suggestion.id} divider>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {suggestion.title}
                          </Typography>
                          <Box display="flex" gap={1} mb={1}>
                            <Chip
                              label={`Impact: ${suggestion.impact}`}
                              size="small"
                              color={getImpactColor(suggestion.impact)}
                            />
                            <Chip
                              label={`Effort: ${suggestion.effort}`}
                              size="small"
                              color={getEffortColor(suggestion.effort)}
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {suggestion.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Insights */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Insights
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h6">System Health</Typography>
                <Typography variant="body2" color="text.secondary">
                  All systems operating optimally
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <BarChartIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h6">Resource Usage</Typography>
                <Typography variant="body2" color="text.secondary">
                  Memory: 67% | CPU: 45%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <PieChartIcon color="secondary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h6">Configuration Coverage</Typography>
                <Typography variant="body2" color="text.secondary">
                  89% of features configured
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ConfigurationAnalytics;