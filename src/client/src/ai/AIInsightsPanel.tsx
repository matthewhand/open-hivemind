import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as AutoAwesomeIcon,
  Insights as InsightsIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';
import { selectPerformance } from '../store/slices/performanceSlice';
import { selectDashboard } from '../store/slices/dashboardSlice';
import { AnimatedBox } from '../animations/AnimationComponents';

interface AIInsight {
  id: string;
  type: 'performance' | 'error' | 'optimization' | 'prediction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  timestamp: Date;
  metrics?: {
    current: number;
    predicted?: number;
    threshold?: number;
    unit: string;
  };
  relatedBots?: string[];
  tags: string[];
}

interface AIInsightsPanelProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxInsights?: number;
  showConfidence?: boolean;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  maxInsights = 10,
  showConfidence = true,
}) => {
  const { metrics, alerts } = useAppSelector(selectPerformance);
  const { bots, analytics } = useAppSelector(selectDashboard);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Simulate AI analysis
  const generateAIInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    // Performance insights
    if (metrics.responseTime > 500) {
      insights.push({
        id: 'perf-001',
        type: 'performance',
        severity: 'high',
        title: 'Response Time Degradation Detected',
        description: `Average response time has increased to ${metrics.responseTime.toFixed(0)}ms, exceeding the optimal threshold of 500ms.`,
        recommendation: 'Consider scaling up bot instances or optimizing database queries. Check for memory leaks or CPU-intensive operations.',
        confidence: 0.89,
        timestamp: new Date(),
        metrics: {
          current: metrics.responseTime,
          threshold: 500,
          unit: 'ms',
        },
        relatedBots: bots.filter(b => b.status === 'active').map(b => b.name),
        tags: ['performance', 'response-time', 'scaling'],
      });
    }

    // Memory usage insights
    if (metrics.memoryUsage > 80) {
      insights.push({
        id: 'mem-001',
        type: 'optimization',
        severity: 'medium',
        title: 'High Memory Usage Alert',
        description: `System memory usage is at ${metrics.memoryUsage.toFixed(1)}%, approaching critical levels.`,
        recommendation: 'Implement memory cleanup routines, restart idle bots, or increase memory allocation for bot instances.',
        confidence: 0.92,
        timestamp: new Date(),
        metrics: {
          current: metrics.memoryUsage,
          threshold: 80,
          unit: '%',
        },
        relatedBots: bots.filter(b => b.status === 'active').slice(0, 3).map(b => b.name),
        tags: ['memory', 'optimization', 'cleanup'],
      });
    }

    // Error rate insights
    if (metrics.errorRate > 5) {
      insights.push({
        id: 'err-001',
        type: 'error',
        severity: 'critical',
        title: 'Elevated Error Rate Detected',
        description: `Error rate has reached ${metrics.errorRate.toFixed(2)}%, significantly above normal levels.`,
        recommendation: 'Investigate recent bot failures, check API rate limits, and review error logs for patterns. Consider implementing circuit breakers.',
        confidence: 0.95,
        timestamp: new Date(),
        metrics: {
          current: metrics.errorRate,
          threshold: 5,
          unit: '%',
        },
        relatedBots: bots.filter(b => b.status === 'error').map(b => b.name),
        tags: ['error', 'failure', 'debugging'],
      });
    }

    // Bot health predictions
    const activeBots = bots.filter(b => b.status === 'active').length;
    const totalBots = bots.length;
    const healthPercentage = (activeBots / totalBots) * 100;

    if (healthPercentage < 70) {
      insights.push({
        id: 'health-001',
        type: 'prediction',
        severity: 'medium',
        title: 'Bot Health Predicted to Decline',
        description: `Only ${healthPercentage.toFixed(1)}% of bots are currently active. Historical patterns suggest potential cascading failures.`,
        recommendation: 'Proactively restart bots showing signs of instability. Implement health checks and automatic recovery mechanisms.',
        confidence: 0.78,
        timestamp: new Date(),
        metrics: {
          current: healthPercentage,
          predicted: Math.max(0, healthPercentage - 20),
          unit: '%',
        },
        relatedBots: bots.filter(b => b.status === 'connecting').map(b => b.name),
        tags: ['health', 'prediction', 'recovery'],
      });
    }

    // Performance optimization suggestions
    if (metrics.cpuUsage > 75) {
      insights.push({
        id: 'opt-001',
        type: 'optimization',
        severity: 'medium',
        title: 'CPU Optimization Opportunity',
        description: `CPU usage is consistently high at ${metrics.cpuUsage.toFixed(1)}%. This may impact response times.`,
        recommendation: 'Optimize bot algorithms, implement request queuing, or distribute load across more instances. Consider upgrading hardware.',
        confidence: 0.85,
        timestamp: new Date(),
        metrics: {
          current: metrics.cpuUsage,
          threshold: 75,
          unit: '%',
        },
        relatedBots: bots.slice(0, 2).map(b => b.name),
        tags: ['optimization', 'cpu', 'performance'],
      });
    }

    // Scaling recommendations
    if (activeBots > 0 && metrics.responseTime < 200 && metrics.memoryUsage < 60) {
      insights.push({
        id: 'scale-001',
        type: 'optimization',
        severity: 'low',
        title: 'Scaling Efficiency Detected',
        description: 'System is operating efficiently with room for increased load. Current resources are underutilized.',
        recommendation: 'Consider reducing bot instances to optimize costs, or prepare for increased traffic by maintaining current capacity.',
        confidence: 0.82,
        timestamp: new Date(),
        metrics: {
          current: activeBots,
          unit: 'bots',
        },
        relatedBots: bots.filter(b => b.status === 'active').map(b => b.name),
        tags: ['scaling', 'efficiency', 'cost-optimization'],
      });
    }

    // Network topology insights
    if (bots.length > 3) {
      insights.push({
        id: 'network-001',
        type: 'optimization',
        severity: 'low',
        title: 'Network Topology Optimization',
        description: 'Bot network could benefit from better load distribution and connection optimization.',
        recommendation: 'Implement intelligent routing, add redundancy for critical bots, and optimize connection patterns.',
        confidence: 0.73,
        timestamp: new Date(),
        relatedBots: bots.slice(0, 3).map(b => b.name),
        tags: ['network', 'topology', 'routing'],
      });
    }

    return insights;
  };

  // Load insights
  useEffect(() => {
    const loadInsights = () => {
      setLoading(true);
      
      // Simulate AI processing delay
      setTimeout(() => {
        const newInsights = generateAIInsights();
        setInsights(newInsights.slice(0, maxInsights));
        setLoading(false);
      }, 1500);
    };

    loadInsights();

    if (autoRefresh) {
      const interval = setInterval(loadInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, maxInsights, metrics, bots]);

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <SpeedIcon />;
      case 'error': return <ErrorIcon />;
      case 'optimization': return <InsightsIcon />;
      case 'prediction': return <AutoAwesomeIcon />;
      default: return <InfoIcon />;
    }
  };

  const filteredInsights = insights.filter(insight => {
    if (filterType !== 'all' && insight.type !== filterType) return false;
    if (filterSeverity !== 'all' && insight.severity !== filterSeverity) return false;
    return true;
  });

  if (loading) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{
          p: 3,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h5">AI Insights Panel</Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <LinearProgress sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Analyzing system data with AI...
          </Typography>
        </Box>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
      sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: 3 }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h5">AI Insights</Typography>
          <Chip
            label={`${filteredInsights.length} insights`}
            color="primary"
            size="small"
          />
        </Box>
        
        {showConfidence && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              AI Confidence: {(insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length * 100).toFixed(0)}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Filter Chips */}
      <Box display="flex" gap={1} mb={3} flexWrap="wrap">
        <Chip
          label="All Types"
          onClick={() => setFilterType('all')}
          color={filterType === 'all' ? 'primary' : 'default'}
          size="small"
        />
        <Chip
          label="Performance"
          onClick={() => setFilterType('performance')}
          color={filterType === 'performance' ? 'primary' : 'default'}
          size="small"
          icon={<SpeedIcon />}
        />
        <Chip
          label="Errors"
          onClick={() => setFilterType('error')}
          color={filterType === 'error' ? 'primary' : 'default'}
          size="small"
          icon={<ErrorIcon />}
        />
        <Chip
          label="Optimization"
          onClick={() => setFilterType('optimization')}
          color={filterType === 'optimization' ? 'primary' : 'default'}
          size="small"
          icon={<InsightsIcon />}
        />
        <Chip
          label="Predictions"
          onClick={() => setFilterType('prediction')}
          color={filterType === 'prediction' ? 'primary' : 'default'}
          size="small"
          icon={<AutoAwesomeIcon />}
        />
        
        <Box sx={{ flexGrow: 1 }} />
        
        {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
          <Chip
            key={severity}
            label={severity.charAt(0).toUpperCase() + severity.slice(1)}
            onClick={() => setFilterSeverity(severity)}
            color={filterSeverity === severity ? getSeverityColor(severity) : 'default'}
            size="small"
          />
        ))}
      </Box>

      {/* Insights List */}
      <List sx={{ p: 0 }}>
        {filteredInsights.map((insight) => (
          <ListItem
            key={insight.id}
            sx={{
              p: 0,
              mb: 2,
              flexDirection: 'column',
              alignItems: 'stretch',
            }}
          >
            <Card
              sx={{
                backgroundColor: 'background.default',
                borderLeft: 4,
                borderColor: `${getSeverityColor(insight.severity)}.main`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Insight Header */}
                <Box display="flex" alignItems="flex-start" gap={2}>
                  <ListItemIcon sx={{ minWidth: 32, color: 'primary.main' }}>
                    {getTypeIcon(insight.type)}
                  </ListItemIcon>
                  
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
                        {insight.title}
                      </Typography>
                      <Chip
                        label={insight.severity}
                        color={getSeverityColor(insight.severity) as any}
                        size="small"
                      />
                      {showConfidence && (
                        <Chip
                          label={`${(insight.confidence * 100).toFixed(0)}%`}
                          variant="outlined"
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {insight.description}
                    </Typography>

                    {/* Metrics Display */}
                    {insight.metrics && (
                      <Box display="flex" gap={2} mb={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Current
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {insight.metrics.current.toFixed(1)}{insight.metrics.unit}
                          </Typography>
                        </Box>
                        {insight.metrics.predicted && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Predicted
                            </Typography>
                            <Typography variant="h6" color="warning.main">
                              {insight.metrics.predicted.toFixed(1)}{insight.metrics.unit}
                            </Typography>
                          </Box>
                        )}
                        {insight.metrics.threshold && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Threshold
                            </Typography>
                            <Typography variant="h6" color="error.main">
                              {insight.metrics.threshold}{insight.metrics.unit}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Tags */}
                    <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                      {insight.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>

                    {/* Related Bots */}
                    {insight.relatedBots && insight.relatedBots.length > 0 && (
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Related Bots:
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {insight.relatedBots.slice(0, 5).map((bot) => (
                            <Chip
                              key={bot}
                              label={bot}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          ))}
                          {insight.relatedBots.length > 5 && (
                            <Chip
                              label={`+${insight.relatedBots.length - 5} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Recommendation */}
                    <Box
                      sx={{
                        backgroundColor: 'action.hover',
                        borderRadius: 1,
                        p: 2,
                        mt: 2,
                      }}
                    >
                      <Typography variant="subtitle2" gutterBottom>
                        AI Recommendation:
                      </Typography>
                      <Typography variant="body2">
                        {insight.recommendation}
                      </Typography>
                    </Box>

                    {/* Timestamp */}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      {insight.timestamp.toLocaleString()}
                    </Typography>
                  </Box>

                  <IconButton
                    onClick={() => toggleInsightExpansion(insight.id)}
                    size="small"
                  >
                    {expandedInsights.has(insight.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>

                {/* Expanded Content */}
                <Collapse in={expandedInsights.has(insight.id)} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Technical Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This insight was generated using machine learning analysis of historical performance data,
                      current system metrics, and bot behavior patterns. The confidence level indicates the
                      reliability of this prediction based on similar patterns observed in the past.
                    </Typography>
                    
                    <Box display="flex" justifyContent="flex-end" mt={2}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<InsightsIcon />}
                      >
                        View Detailed Analysis
                      </Button>
                    </Box>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </ListItem>
        ))}
      </List>

      {/* Empty State */}
      {filteredInsights.length === 0 && (
        <Box textAlign="center" py={4}>
          <AutoAwesomeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Insights Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {insights.length === 0 
              ? 'AI analysis is in progress. Insights will appear here once analysis is complete.'
              : 'No insights match your current filters. Try adjusting the filter criteria.'
            }
          </Typography>
        </Box>
      )}
    </AnimatedBox>
  );
};

export default AIInsightsPanel;