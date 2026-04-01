import { HEALTH_THRESHOLDS } from '../../../types/constants';

export function calculateHealthStatus(
  memoryUsage: NodeJS.MemoryUsage,
  recentErrors: number,
  metrics: any
) {
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const errorRate = calculateErrorRate(recentErrors, 60);

  let status = 'healthy';
  let errorHealth = 'good';

  // Check memory usage
  if (memoryUsagePercent > 90) {
    status = 'unhealthy';
  } else if (memoryUsagePercent > 80) {
    status = 'degraded';
  }

  // Check error rate
  if (errorRate > HEALTH_THRESHOLDS.RECENT_ERRORS_WARNING) {
    status = 'unhealthy';
    errorHealth = 'critical';
  } else if (errorRate > HEALTH_THRESHOLDS.ERROR_RATE_DEGRADED) {
    status = status === 'healthy' ? 'degraded' : status;
    errorHealth = 'poor';
  } else if (errorRate > HEALTH_THRESHOLDS.ERROR_RATE_WARNING) {
    errorHealth = 'fair';
  }

  // Check uptime
  if (metrics.uptime < 60000) {
    // Less than 1 minute
    status = status === 'healthy' ? 'degraded' : status;
  }

  return { status, errorHealth };
}

export function calculateErrorRate(errorCount: number, timeWindowSeconds: number): number {
  return Math.round((errorCount / timeWindowSeconds) * 100) / 100; // errors per second
}

export function getErrorHealthStatus(recentErrors: number): 'good' | 'fair' | 'poor' | 'critical' {
  if (recentErrors === 0) {
    return 'good';
  }
  if (recentErrors <= 2) {
    return 'fair';
  }
  if (recentErrors <= 5) {
    return 'poor';
  }
  return 'critical';
}

export function getErrorRecommendations(
  errorStats: Record<string, number>,
  recentErrors: number
): string[] {
  const recommendations: string[] = [];

  if (recentErrors > HEALTH_THRESHOLDS.ERROR_RATE_DEGRADED) {
    recommendations.push(
      'High error rate detected. Check system logs and consider scaling resources.'
    );
  }

  const networkErrors = errorStats['network'] || 0;
  if (networkErrors > 0) {
    recommendations.push('Network errors detected. Check external service connectivity.');
  }

  const dbErrors = errorStats['database'] || 0;
  if (dbErrors > 0) {
    recommendations.push('Database errors detected. Verify database connection and performance.');
  }

  const authErrors = (errorStats['authentication'] || 0) + (errorStats['authorization'] || 0);
  if (authErrors > 2) {
    recommendations.push(
      'Authentication/authorization errors detected. Check user credentials and permissions.'
    );
  }

  return recommendations;
}

export function getRecoveryHealthStatus(
  recoveryStats: Record<string, any>
): 'healthy' | 'degraded' | 'unhealthy' {
  const circuitBreakers = Object.values(recoveryStats);
  const openCircuitBreakers = circuitBreakers.filter(
    (cb) => cb.circuitBreaker.state === 'open'
  ).length;

  if (openCircuitBreakers > 0) {
    return 'unhealthy';
  }
  if (
    circuitBreakers.some(
      (cb) => cb.circuitBreaker.failureCount > HEALTH_THRESHOLDS.HIGH_FAILURE_COUNT
    )
  ) {
    return 'degraded';
  }
  return 'healthy';
}

export function getRecoveryRecommendations(recoveryStats: Record<string, any>): string[] {
  const recommendations: string[] = [];
  const circuitBreakers = Object.values(recoveryStats);

  const openCircuitBreakers = circuitBreakers.filter((cb) => cb.circuitBreaker.state === 'open');
  if (openCircuitBreakers.length > 0) {
    recommendations.push(
      `${openCircuitBreakers.length} circuit breaker(s) are open. Check underlying services.`
    );
  }

  const highFailureCircuits = circuitBreakers.filter(
    (cb) => cb.circuitBreaker.failureCount > HEALTH_THRESHOLDS.HIGH_FAILURE_COUNT
  );
  if (highFailureCircuits.length > 0) {
    recommendations.push(
      `${highFailureCircuits.length} circuit breaker(s) have high failure rates.`
    );
  }

  const operationsWithoutFallbacks = Object.entries(recoveryStats).filter(
    ([, stats]) => stats.fallbacks === 0
  ).length;

  if (operationsWithoutFallbacks > 0) {
    recommendations.push(`${operationsWithoutFallbacks} operation(s) lack fallback mechanisms.`);
  }

  return recommendations;
}

export function detectErrorSpikes(
  errorStats: Record<string, number>
): { type: string; count: number; severity: 'low' | 'medium' | 'high' }[] {
  const totalErrors = Object.values(errorStats).reduce((a, b) => a + b, 0);
  const threshold = totalErrors * 0.3; // 30% threshold for spikes

  return Object.entries(errorStats)
    .filter(([, count]) => count > threshold)
    .map(([type, count]) => ({
      type,
      count,
      severity: count > threshold * 2 ? 'high' : count > threshold ? 'medium' : 'low',
    }));
}

export function detectErrorCorrelations(
  errorStats: Record<string, number>
): { pattern: string; description: string }[] {
  const correlations: { pattern: string; description: string }[] = [];

  // Check for network + timeout correlation
  if ((errorStats['network'] || 0) > 0 && (errorStats['timeout'] || 0) > 0) {
    correlations.push({
      pattern: 'network_timeout',
      description: 'Network and timeout errors occurring together',
    });
  }

  // Check for auth + authorization correlation
  if ((errorStats['authentication'] || 0) > 0 && (errorStats['authorization'] || 0) > 0) {
    correlations.push({
      pattern: 'auth_chain',
      description: 'Authentication and authorization errors occurring together',
    });
  }

  return correlations;
}

export function detectErrorAnomalies(
  recentErrors: number,
  errorStats: Record<string, number>
): { type: string; anomaly: string }[] {
  const anomalies: { type: string; anomaly: string }[] = [];

  // Check for unusual error types
  const totalErrors = Object.values(errorStats).reduce((a, b) => a + b, 0);
  if (totalErrors > 0) {
    Object.entries(errorStats).forEach(([type, count]) => {
      const percentage = (count / totalErrors) * 100;
      if (percentage > HEALTH_THRESHOLDS.DOMINANT_ERROR_PERCENTAGE && type !== 'unknown') {
        anomalies.push({
          type,
          anomaly: `Dominant error type (${percentage.toFixed(1)}% of all errors)`,
        });
      }
    });
  }

  // Check for sudden error bursts
  if (recentErrors > HEALTH_THRESHOLDS.RECENT_ERRORS_WARNING) {
    anomalies.push({
      type: 'burst',
      anomaly: `High error frequency: ${recentErrors} errors in last minute`,
    });
  }

  return anomalies;
}

export function generatePatternRecommendations(
  errorStats: Record<string, number>,
  recentErrors: number
): string[] {
  const recommendations: string[] = [];

  if (recentErrors > HEALTH_THRESHOLDS.RECENT_ERRORS_WARNING) {
    recommendations.push(
      'Implement rate limiting and circuit breakers to prevent cascading failures.'
    );
  }

  const validationErrors = errorStats['validation'] || 0;
  if (validationErrors > HEALTH_THRESHOLDS.VALIDATION_ERRORS_WARNING) {
    recommendations.push(
      'Review input validation logic and provide better error messages to users.'
    );
  }

  const configErrors = errorStats['configuration'] || 0;
  if (configErrors > 0) {
    recommendations.push('Review configuration management and implement configuration validation.');
  }

  return recommendations;
}
