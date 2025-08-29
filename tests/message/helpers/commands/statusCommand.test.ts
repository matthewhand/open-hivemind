import { handleStatusCommand, getSystemStatus, formatStatusResponse } from '../../../../src/message/helpers/commands/statusCommand';

// Mock system dependencies
jest.mock('os', () => ({
  uptime: jest.fn(() => 3600), // 1 hour
  loadavg: jest.fn(() => [0.5, 0.7, 0.8]),
  freemem: jest.fn(() => 1024 * 1024 * 1024), // 1GB
  totalmem: jest.fn(() => 4 * 1024 * 1024 * 1024), // 4GB
}));

describe('handleStatusCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return basic status message without arguments', async () => {
    const result = await handleStatusCommand([]);
    expect(result).toBe('System is operational. All services are running smoothly.');
  });

  it('should handle verbose flag', async () => {
    const result = await handleStatusCommand(['--verbose']);
    expect(result).toContain('System is operational');
    expect(result).toContain('Uptime:');
    expect(result).toContain('Memory:');
  });

  it('should handle json format flag', async () => {
    const result = await handleStatusCommand(['--json']);
    expect(() => JSON.parse(result)).not.toThrow();
    
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('status');
    expect(parsed).toHaveProperty('timestamp');
  });

  it('should handle health check flag', async () => {
    const result = await handleStatusCommand(['--health']);
    expect(result).toContain('Health Check');
    expect(result).toContain('Services:');
  });

  it('should handle multiple flags', async () => {
    const result = await handleStatusCommand(['--verbose', '--health']);
    expect(result).toContain('System is operational');
    expect(result).toContain('Health Check');
    expect(result).toContain('Uptime:');
  });

  it('should handle unknown flags gracefully', async () => {
    const result = await handleStatusCommand(['--unknown', '--invalid']);
    expect(result).toBe('System is operational. All services are running smoothly.');
  });

  it('should handle mixed valid and invalid flags', async () => {
    const result = await handleStatusCommand(['--verbose', '--invalid', '--json']);
    expect(result).toContain('System is operational');
  });

  it('should handle empty array', async () => {
    const result = await handleStatusCommand([]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle service-specific status', async () => {
    const result = await handleStatusCommand(['--service', 'discord']);
    expect(result).toContain('Discord Service');
    expect(result).toContain('Status:');
  });

  it('should handle metrics flag', async () => {
    const result = await handleStatusCommand(['--metrics']);
    expect(result).toContain('System Metrics');
    expect(result).toContain('CPU Load:');
    expect(result).toContain('Memory Usage:');
  });
});

describe('getSystemStatus', () => {
  it('should return system status object', () => {
    const status = getSystemStatus();
    expect(status).toHaveProperty('operational', true);
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('memory');
    expect(status).toHaveProperty('timestamp');
  });

  it('should include memory information', () => {
    const status = getSystemStatus();
    expect(status.memory).toHaveProperty('free');
    expect(status.memory).toHaveProperty('total');
    expect(status.memory).toHaveProperty('used');
  });

  it('should include load average', () => {
    const status = getSystemStatus();
    expect(status).toHaveProperty('loadAverage');
    expect(Array.isArray(status.loadAverage)).toBe(true);
    expect(status.loadAverage).toHaveLength(3);
  });
});

describe('formatStatusResponse', () => {
  const mockStatus = {
    operational: true,
    uptime: 3600,
    memory: { free: 1024, total: 4096, used: 3072 },
    loadAverage: [0.5, 0.7, 0.8],
    timestamp: new Date('2023-01-01T00:00:00Z')
  };

  it('should format basic status', () => {
    const result = formatStatusResponse(mockStatus, []);
    expect(result).toBe('System is operational. All services are running smoothly.');
  });

  it('should format verbose status', () => {
    const result = formatStatusResponse(mockStatus, ['--verbose']);
    expect(result).toContain('System is operational');
    expect(result).toContain('Uptime: 1h 0m');
    expect(result).toContain('Memory: 3.0GB / 4.0GB');
  });

  it('should format JSON status', () => {
    const result = formatStatusResponse(mockStatus, ['--json']);
    expect(() => JSON.parse(result)).not.toThrow();
    
    const parsed = JSON.parse(result);
    expect(parsed.operational).toBe(true);
    expect(parsed.uptime).toBe(3600);
  });

  it('should handle non-operational status', () => {
    const downStatus = { ...mockStatus, operational: false };
    const result = formatStatusResponse(downStatus, []);
    expect(result).toContain('System is experiencing issues');
  });

  it('should format uptime correctly', () => {
    const longUptimeStatus = { ...mockStatus, uptime: 90061 }; // 25h 1m 1s
    const result = formatStatusResponse(longUptimeStatus, ['--verbose']);
    expect(result).toContain('Uptime: 25h 1m');
  });
});