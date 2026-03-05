import { EventEmitter } from 'events';
import Debug from 'debug';
import type { Response } from 'node-fetch';

const debug = Debug('app:ApiMonitorService');

type FetchImplementation = (input: any, init?: any) => Promise<Response>;

const resolveFetch = async (): Promise<FetchImplementation> => {
  if (typeof fetch === 'function') {
    return fetch as unknown as FetchImplementation;
  }

  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch as unknown as FetchImplementation;
};

export interface EndpointConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
  expectedStatusCodes?: number[];
  timeout?: number;
  interval?: number;
  enabled: boolean;
  retries?: number;
  retryDelay?: number;
}

export interface EndpointStatus {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'slow' | 'error';
  responseTime: number;
  lastChecked: Date;
  lastSuccessfulCheck?: Date;
  consecutiveFailures: number;
  totalChecks: number;
  successfulChecks: number;
  averageResponseTime: number;
  errorMessage?: string;
  statusCode?: number;
  sslExpiry?: Date;
  sslValid?: boolean;
}

export interface HealthCheckResult {
  endpointId: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
}

export class ApiMonitorService extends EventEmitter {
  private static instance: ApiMonitorService;
  private endpoints = new Map<string, EndpointConfig>();
  private statuses = new Map<string, EndpointStatus>();
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private isMonitoring = false;

  private constructor() {
    super();
    // Increase max listeners for monitoring service
    this.setMaxListeners(20);
  }

  public static getInstance(): ApiMonitorService {
    if (!ApiMonitorService.instance) {
      ApiMonitorService.instance = new ApiMonitorService();
    }
    return ApiMonitorService.instance;
  }

  public addEndpoint(config: EndpointConfig): void {
    this.endpoints.set(config.id, config);
    this.initializeEndpointStatus(config);
    debug(`Added endpoint: ${config.name} (${config.url})`);

    if (config.enabled && config.interval) {
      this.startMonitoring(config.id);
    }
  }

  public removeEndpoint(id: string): void {
    this.stopMonitoring(id);
    this.endpoints.delete(id);
    this.statuses.delete(id);
    debug(`Removed endpoint: ${id}`);
  }

  public updateEndpoint(id: string, config: Partial<EndpointConfig>): void {
    const existing = this.endpoints.get(id);
    if (!existing) {
      throw new Error(`Endpoint ${id} not found`);
    }

    const updatedConfig = { ...existing, ...config };
    this.endpoints.set(id, updatedConfig);

    // Restart monitoring if needed
    this.stopMonitoring(id);
    if (updatedConfig.enabled && updatedConfig.interval) {
      this.startMonitoring(id);
    }

    debug(`Updated endpoint: ${id}`);
  }

  public getEndpoint(id: string): EndpointConfig | undefined {
    return this.endpoints.get(id);
  }

  public getAllEndpoints(): EndpointConfig[] {
    return Array.from(this.endpoints.values());
  }

  public getEndpointStatus(id: string): EndpointStatus | undefined {
    return this.statuses.get(id);
  }

  public getAllStatuses(): EndpointStatus[] {
    return Array.from(this.statuses.values());
  }

  public startMonitoring(id: string): void {
    const config = this.endpoints.get(id);
    if (!config || !config.enabled || !config.interval) {
      return;
    }

    this.stopMonitoring(id);

    const interval = setInterval(() => {
      this.checkEndpoint(id);
    }, config.interval);

    this.monitoringIntervals.set(id, interval);
    debug(`Started monitoring: ${config.name}`);
  }

  public stopMonitoring(id: string): void {
    const interval = this.monitoringIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(id);
      debug(`Stopped monitoring: ${id}`);
    }
  }

  public startAllMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.endpoints.forEach((config, id) => {
      if (config.enabled && config.interval) {
        this.startMonitoring(id);
      }
    });

    this.isMonitoring = true;
    debug('Started monitoring all endpoints');
  }

  public stopAllMonitoring(): void {
    this.monitoringIntervals.forEach((interval, id) => {
      clearInterval(interval);
    });
    this.monitoringIntervals.clear();
    this.isMonitoring = false;
    debug('Stopped monitoring all endpoints');
  }

  private initializeEndpointStatus(config: EndpointConfig): void {
    const status: EndpointStatus = {
      id: config.id,
      name: config.name,
      url: config.url,
      status: 'offline',
      responseTime: 0,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      totalChecks: 0,
      successfulChecks: 0,
      averageResponseTime: 0,
    };

    this.statuses.set(config.id, status);
  }

  private async checkEndpoint(id: string): Promise<void> {
    const config = this.endpoints.get(id);
    const status = this.statuses.get(id);

    if (!config || !status) {
      return;
    }

    const startTime = Date.now();
    status.lastChecked = new Date();

    try {
      const response = await this.performRequest(config);
      const responseTime = Date.now() - startTime;

      status.responseTime = responseTime;
      status.statusCode = response.status;
      status.totalChecks++;

      if (this.isSuccessfulResponse(config, response)) {
        status.status = this.getStatusFromResponseTime(responseTime);
        status.consecutiveFailures = 0;
        status.successfulChecks++;
        status.lastSuccessfulCheck = new Date();
        status.errorMessage = undefined;

        // Update average response time
        status.averageResponseTime =
          (status.averageResponseTime * (status.successfulChecks - 1) + responseTime) /
          status.successfulChecks;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      status.responseTime = responseTime;
      status.status = 'error';
      status.consecutiveFailures++;
      status.totalChecks++;
      status.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      debug(`Endpoint check failed: ${config.name} - ${status.errorMessage}`);
    }

    // Emit status update
    this.emit('statusUpdate', status);

    // Emit health check result for logging
    const result: HealthCheckResult = {
      endpointId: id,
      timestamp: status.lastChecked,
      success: status.status === 'online' || status.status === 'slow',
      responseTime: status.responseTime,
      statusCode: status.statusCode,
      errorMessage: status.errorMessage,
    };

    this.emit('healthCheckResult', result);
  }

  private async performRequest(config: EndpointConfig): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000);

    try {
      const fetchImpl = await resolveFetch();
      const response = await fetchImpl(config.url, {
        method: config.method,
        headers: {
          'User-Agent': 'Open-Hivemind API Monitor',
          ...config.headers,
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private isSuccessfulResponse(config: EndpointConfig, response: Response): boolean {
    const expectedCodes = config.expectedStatusCodes || [200, 201, 202, 204];
    return expectedCodes.includes(response.status);
  }

  private getStatusFromResponseTime(responseTime: number): 'online' | 'slow' {
    return responseTime > 5000 ? 'slow' : 'online'; // 5 seconds threshold
  }

  public getOverallHealth(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    stats: {
      total: number;
      online: number;
      slow: number;
      offline: number;
      error: number;
    };
  } {
    const statuses = Array.from(this.statuses.values());
    const stats = {
      total: statuses.length,
      online: 0,
      slow: 0,
      offline: 0,
      error: 0,
    };

    statuses.forEach((status) => {
      switch (status.status) {
        case 'online':
          stats.online++;
          break;
        case 'slow':
          stats.slow++;
          break;
        case 'offline':
          stats.offline++;
          break;
        case 'error':
          stats.error++;
          break;
      }
    });

    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let message = 'All monitored APIs are operational';

    if (stats.error > 0) {
      overallStatus = 'error';
      message = `${stats.error} API endpoint(s) are experiencing errors`;
    } else if (stats.offline > 0) {
      overallStatus = 'error';
      message = `${stats.offline} API endpoint(s) are offline`;
    } else if (stats.slow > 0) {
      overallStatus = 'warning';
      message = `${stats.slow} API endpoint(s) are responding slowly`;
    }

    return { status: overallStatus, message, stats };
  }
}

export default ApiMonitorService;
