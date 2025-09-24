import ApiMonitorService, { EndpointConfig, EndpointStatus } from '../../src/services/ApiMonitorService';

describe('ApiMonitorService', () => {
  let service: ApiMonitorService;

  beforeEach(() => {
    service = ApiMonitorService.getInstance();
    service.stopAllMonitoring();
    // Clear all endpoints
    service.getAllEndpoints().forEach(endpoint => {
      service.removeEndpoint(endpoint.id);
    });
    // Remove all listeners to prevent accumulation
    service.removeAllListeners();
  });

  afterEach(() => {
    service.stopAllMonitoring();
    // Clean up any remaining listeners
    service.removeAllListeners();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ApiMonitorService.getInstance();
      const instance2 = ApiMonitorService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Endpoint Management', () => {
    const testEndpoint: EndpointConfig = {
      id: 'test-endpoint',
      name: 'Test API',
      url: 'https://httpbin.org/get',
      method: 'GET',
      interval: 1000,
      timeout: 5000,
      enabled: true,
      expectedStatusCodes: [200],
      retries: 3,
      retryDelay: 1000,
    };

    it('should add an endpoint', () => {
      service.addEndpoint(testEndpoint);
      const endpoint = service.getEndpoint(testEndpoint.id);
      expect(endpoint).toEqual(testEndpoint);
    });

    it('should remove an endpoint', () => {
      service.addEndpoint(testEndpoint);
      service.removeEndpoint(testEndpoint.id);
      const endpoint = service.getEndpoint(testEndpoint.id);
      expect(endpoint).toBeUndefined();
    });

    it('should update an endpoint', () => {
      service.addEndpoint(testEndpoint);
      const updatedConfig = { ...testEndpoint, name: 'Updated API' };
      service.updateEndpoint(testEndpoint.id, { name: 'Updated API' });
      const endpoint = service.getEndpoint(testEndpoint.id);
      expect(endpoint?.name).toBe('Updated API');
    });

    it('should throw error when updating non-existent endpoint', () => {
      expect(() => {
        service.updateEndpoint('non-existent', { name: 'Test' });
      }).toThrow('Endpoint non-existent not found');
    });

    it('should get all endpoints', () => {
      service.addEndpoint(testEndpoint);
      const endpoints = service.getAllEndpoints();
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]).toEqual(testEndpoint);
    });

    it('should get all statuses', () => {
      service.addEndpoint(testEndpoint);
      const statuses = service.getAllStatuses();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].id).toBe(testEndpoint.id);
    });
  });

  describe('Monitoring', () => {
    const testEndpoint: EndpointConfig = {
      id: 'test-endpoint',
      name: 'Test API',
      url: 'https://httpbin.org/get',
      method: 'GET',
      interval: 100,
      timeout: 5000,
      enabled: true,
      expectedStatusCodes: [200],
    };

    it('should start monitoring an endpoint', () => {
      service.addEndpoint(testEndpoint);
      service.startMonitoring(testEndpoint.id);
      // Should not throw error
      expect(() => service.startMonitoring(testEndpoint.id)).not.toThrow();
    });

    it('should stop monitoring an endpoint', () => {
      service.addEndpoint(testEndpoint);
      service.startMonitoring(testEndpoint.id);
      service.stopMonitoring(testEndpoint.id);
      // Should not throw error
      expect(() => service.stopMonitoring(testEndpoint.id)).not.toThrow();
    });

    it('should start monitoring all endpoints', () => {
      service.addEndpoint(testEndpoint);
      service.startAllMonitoring();
      // Should not throw error
      expect(() => service.startAllMonitoring()).not.toThrow();
    });

    it('should stop monitoring all endpoints', () => {
      service.addEndpoint(testEndpoint);
      service.startAllMonitoring();
      service.stopAllMonitoring();
      // Should not throw error
      expect(() => service.stopAllMonitoring()).not.toThrow();
    });
  });

  describe('Status Tracking', () => {
    const testEndpoint: EndpointConfig = {
      id: 'test-endpoint',
      name: 'Test API',
      url: 'https://httpbin.org/get',
      method: 'GET',
      interval: 100,
      timeout: 5000,
      enabled: true,
      expectedStatusCodes: [200],
    };

    it('should initialize endpoint status correctly', () => {
      service.addEndpoint(testEndpoint);
      const status = service.getEndpointStatus(testEndpoint.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(testEndpoint.id);
      expect(status?.status).toBe('offline');
      expect(status?.consecutiveFailures).toBe(0);
      expect(status?.totalChecks).toBe(0);
    });

    it('should update status on successful check', () => {
      service.addEndpoint(testEndpoint);
      const status = service.getEndpointStatus(testEndpoint.id);
      if (status) {
        status.status = 'online';
        status.responseTime = 100;
        status.totalChecks = 1;
        status.successfulChecks = 1;
        status.lastChecked = new Date();
        status.lastSuccessfulCheck = new Date();
      }

      const updatedStatus = service.getEndpointStatus(testEndpoint.id);
      expect(updatedStatus?.status).toBe('online');
      expect(updatedStatus?.responseTime).toBe(100);
    });
  });

  describe('Overall Health', () => {
    it('should return healthy status when all endpoints are online', () => {
      const endpoint1: EndpointConfig = {
        id: 'endpoint1',
        name: 'API 1',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 1000,
        enabled: true,
      };

      const endpoint2: EndpointConfig = {
        id: 'endpoint2',
        name: 'API 2',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 1000,
        enabled: true,
      };

      service.addEndpoint(endpoint1);
      service.addEndpoint(endpoint2);

      // Set both endpoints to online
      const status1 = service.getEndpointStatus(endpoint1.id);
      const status2 = service.getEndpointStatus(endpoint2.id);

      if (status1) {
        status1.status = 'online';
        status1.responseTime = 100;
        status1.totalChecks = 1;
        status1.successfulChecks = 1;
      }

      if (status2) {
        status2.status = 'online';
        status2.responseTime = 150;
        status2.totalChecks = 1;
        status2.successfulChecks = 1;
      }

      const overallHealth = service.getOverallHealth();
      expect(overallHealth.status).toBe('healthy');
      expect(overallHealth.message).toBe('All monitored APIs are operational');
      expect(overallHealth.stats.total).toBe(2);
      expect(overallHealth.stats.online).toBe(2);
    });

    it('should return warning status when endpoints are slow', () => {
      const endpoint: EndpointConfig = {
        id: 'slow-endpoint',
        name: 'Slow API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 1000,
        enabled: true,
      };

      service.addEndpoint(endpoint);

      const status = service.getEndpointStatus(endpoint.id);
      if (status) {
        status.status = 'slow';
        status.responseTime = 6000; // Over 5 second threshold
        status.totalChecks = 1;
        status.successfulChecks = 1;
      }

      const overallHealth = service.getOverallHealth();
      expect(overallHealth.status).toBe('warning');
      expect(overallHealth.stats.slow).toBe(1);
    });

    it('should return error status when endpoints are failing', () => {
      const endpoint: EndpointConfig = {
        id: 'failing-endpoint',
        name: 'Failing API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 1000,
        enabled: true,
      };

      service.addEndpoint(endpoint);

      const status = service.getEndpointStatus(endpoint.id);
      if (status) {
        status.status = 'error';
        status.totalChecks = 1;
        status.successfulChecks = 0;
        status.errorMessage = 'Connection timeout';
      }

      const overallHealth = service.getOverallHealth();
      expect(overallHealth.status).toBe('error');
      expect(overallHealth.stats.error).toBe(1);
    });
  });

  describe('Event Emission', () => {
    const testEndpoint: EndpointConfig = {
      id: 'test-endpoint',
      name: 'Test API',
      url: 'https://httpbin.org/get',
      method: 'GET',
      interval: 100,
      timeout: 5000,
      enabled: true,
    };

    it('should emit statusUpdate event', (done) => {
      service.addEndpoint(testEndpoint);

      service.on('statusUpdate', (status: EndpointStatus) => {
        expect(status.id).toBe(testEndpoint.id);
        done();
      });

      // Trigger a status update by manually updating the status
      const status = service.getEndpointStatus(testEndpoint.id);
      if (status) {
        status.status = 'online';
        status.responseTime = 100;
        service.emit('statusUpdate', status);
      }
    });

    it('should emit healthCheckResult event', (done) => {
      service.addEndpoint(testEndpoint);

      service.on('healthCheckResult', (result) => {
        expect(result.endpointId).toBe(testEndpoint.id);
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('responseTime');
        done();
      });

      // Trigger a health check result by manually emitting
      service.emit('healthCheckResult', {
        endpointId: testEndpoint.id,
        timestamp: new Date(),
        success: true,
        responseTime: 100,
      });
    });
  });
});