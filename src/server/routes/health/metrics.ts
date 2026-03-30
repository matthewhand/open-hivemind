import * as process from 'process';
import { Router, type Request, type Response } from 'express';
import { MetricsCollector } from '../../../monitoring/MetricsCollector';

const router = Router();

// System metrics endpoint
router.get('/metrics', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const metricsData = {
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100), // %
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
    },
    eventLoop: {
      delay: 0, // Would need actual event loop delay measurement
      utilization: 0, // Would need actual utilization calculation
    },
    requests: {
      total: 0, // Would need to implement request counter
      rate: 0, // Would need to implement rate calculation
    },
  };

  return res.json(metricsData);
});

// Alerts endpoint
router.get('/alerts', (req, res) => {
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

// Prometheus metrics endpoint
router.get('/metrics/prometheus', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const metrics = `# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP process_memory_heap_used_bytes Process heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Process heap memory total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP process_resident_memory_bytes Resident memory size in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${memoryUsage.rss}

# HELP nodejs_heap_size_total_bytes Total heap size in bytes
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}

# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${cpuUsage.user / 1000000}

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total ${cpuUsage.system / 1000000}

# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}"} 1

${MetricsCollector.getInstance().getPrometheusFormat()}
`;

  res.set('Content-Type', 'text/plain; charset=utf-8');
  return res.send(metrics);
});

export const prometheusMetricsHandler = (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const metrics = `# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP process_memory_heap_used_bytes Process heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Process heap memory total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP process_resident_memory_bytes Resident memory size in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${memoryUsage.rss}

# HELP nodejs_heap_size_total_bytes Total heap size in bytes
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}

# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${cpuUsage.user / 1000000}

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total ${cpuUsage.system / 1000000}

# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}"} 1
`;
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
};

export default router;
