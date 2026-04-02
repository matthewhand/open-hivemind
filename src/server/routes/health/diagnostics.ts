import process from 'process';
import { Router, type Request, type Response } from 'express';
import { MetricsCollector } from '../../../monitoring/MetricsCollector';
import { ErrorLogger } from '../../../utils/errorLogger';
import { globalRecoveryManager } from '../../../utils/errorRecovery';
import {
  calculateErrorRate,
  detectErrorAnomalies,
  detectErrorCorrelations,
  detectErrorSpikes,
  generatePatternRecommendations,
  getErrorHealthStatus,
  getErrorRecommendations,
  getRecoveryHealthStatus,
  getRecoveryRecommendations,
} from './helpers';

const router = Router();

// Alerts endpoint
router.get('/alerts', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const uptime = process.uptime();

  const alerts = [];

  // Check for high memory usage
  if (memoryPercentage > 80) {
    alerts.push({
      level: 'warning',
      message: 'High memory usage detected',
      details: `Memory usage is at ${Math.round(memoryPercentage)}%`,
      timestamp: new Date().toISOString(),
      type: 'memory',
    });
  }

  // Check for low uptime (less than 30 seconds might indicate recent restart)
  if (uptime < 30) {
    alerts.push({
      level: 'info',
      message: 'Service recently started',
      details: `Uptime is ${Math.round(uptime)} seconds`,
      timestamp: new Date().toISOString(),
      type: 'uptime',
    });
  }

  return res.json({
    alerts: alerts,
    count: alerts.length,
    timestamp: new Date().toISOString(),
  });
});

// Error-specific health endpoints
router.get('/errors', (req: Request, res: Response) => {
  const errorLogger = ErrorLogger.getInstance();
  const errorStats = errorLogger.getErrorStats();
  const recentErrors = errorLogger.getRecentErrorCount(60000); // Last minute
  const metrics = MetricsCollector.getInstance().getMetrics();

  const errorHealthData = {
    timestamp: new Date().toISOString(),
    errors: {
      total: metrics.errors,
      recent: recentErrors,
      rate: calculateErrorRate(recentErrors, 60),
      byType: errorStats,
      trends: {
        lastMinute: errorLogger.getRecentErrorCount(60000),
        last5Minutes: errorLogger.getRecentErrorCount(300000),
        last15Minutes: errorLogger.getRecentErrorCount(900000),
      },
    },
    health: {
      status: getErrorHealthStatus(recentErrors),
      recommendations: getErrorRecommendations(errorStats, recentErrors),
    },
  };

  return res.json(errorHealthData);
});

// Error patterns and anomalies endpoint
router.get('/errors/patterns', (req: Request, res: Response) => {
  const errorLogger = ErrorLogger.getInstance();
  const errorStats = errorLogger.getErrorStats();
  const recentErrors = errorLogger.getRecentErrorCount(60000);

  // ⚡ Bolt Optimization: Calculate total count once instead of inside the map loop
  // This changes an O(n²) operation into an O(n) operation when computing error percentages
  const totalCount = Object.values(errorStats).reduce(
    (sum: number, val: any) => sum + (val as number),
    0
  );

  const patternsData = {
    timestamp: new Date().toISOString(),
    patterns: {
      errorTypes: Object.entries(errorStats)
        .sort(([, a]: [string, any], [, b]: [string, any]) => (b as number) - (a as number))
        .map(([type, count]) => {
          return {
            type,
            count: count as number,
            percentage:
              (totalCount as unknown as number) > 0
                ? ((count as number) / (totalCount as unknown as number)) * 100
                : 0,
          };
        }),
      spikes: detectErrorSpikes(errorStats),
      correlations: detectErrorCorrelations(errorStats),
      anomalies: detectErrorAnomalies(recentErrors, errorStats),
    },
    recommendations: generatePatternRecommendations(errorStats, recentErrors),
  };

  return res.json(patternsData);
});

// Recovery system health endpoint
router.get('/recovery', (req: Request, res: Response) => {
  const recoveryStats = globalRecoveryManager.getAllStats();
  const errorLogger = ErrorLogger.getInstance();

  const recoveryHealthData = {
    timestamp: new Date().toISOString(),
    circuitBreakers: Object.entries(recoveryStats).map(([key, stats]) => ({
      operation: key,
      state: stats.circuitBreaker.state,
      failureCount: stats.circuitBreaker.failureCount,
      successCount: stats.circuitBreaker.successCount,
      fallbacks: stats.fallbacks,
    })),
    health: {
      status: getRecoveryHealthStatus(recoveryStats),
      recommendations: getRecoveryRecommendations(recoveryStats),
    },
    errorLogger: {
      config: errorLogger.getConfig(),
      stats: errorLogger.getErrorStats(),
    },
  };

  return res.json(recoveryHealthData);
});

export default router;
