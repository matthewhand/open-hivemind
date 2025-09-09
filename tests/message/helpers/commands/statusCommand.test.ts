import { handleStatusCommand, getSystemStatus, formatStatusResponse } from '../../../../src/message/helpers/commands/statusCommand';

// Mock system dependencies
jest.mock('os', () => ({
  uptime: jest.fn(() => 3600), // 1 hour
  loadavg: jest.fn(() => [0.5, 0.7, 0.8]),
  freemem: jest.fn(() => 1024 * 1024 * 1024), // 1GB
  totalmem: jest.fn(() => 4 * 1024 * 1024 * 1024), // 4GB
}));

describe('status command functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle status commands correctly', async () => {
    // handleStatusCommand
    let result = await handleStatusCommand([]);
    expect(result).toBe('System is operational. All services are running smoothly.');

    result = await handleStatusCommand(['--verbose']);
    expect(result).toContain('System is operational');
    expect(result).toContain('Uptime:');
    expect(result).toContain('Memory:');

    result = await handleStatusCommand(['--json']);
    expect(() => JSON.parse(result)).not.toThrow();

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('status');
    expect(parsed).toHaveProperty('timestamp');

    result = await handleStatusCommand(['--health']);
    expect(result).toContain('Health Check');
    expect(result).toContain('Services:');

    result = await handleStatusCommand(['--verbose', '--health']);
    expect(result).toContain('System is operational');
    expect(result).toContain('Health Check');
    expect(result).toContain('Uptime:');

    result = await handleStatusCommand(['--unknown', '--invalid']);
    expect(result).toBe('System is operational. All services are running smoothly.');

    result = await handleStatusCommand(['--verbose', '--invalid', '--json']);
    expect(result).toContain('System is operational');

    result = await handleStatusCommand([]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);

    result = await handleStatusCommand(['--service', 'discord']);
    expect(result).toContain('Discord Service');
    expect(result).toContain('Status:');

    result = await handleStatusCommand(['--metrics']);
    expect(result).toContain('System Metrics');
    expect(result).toContain('CPU Load:');
    expect(result).toContain('Memory Usage:');

    // getSystemStatus
    const status = getSystemStatus();
    expect(status).toHaveProperty('operational', true);
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('memory');
    expect(status).toHaveProperty('timestamp');

    expect(status.memory).toHaveProperty('free');
    expect(status.memory).toHaveProperty('total');
    expect(status.memory).toHaveProperty('used');

    expect(status).toHaveProperty('loadAverage');
    expect(Array.isArray(status.loadAverage)).toBe(true);
    expect(status.loadAverage).toHaveLength(3);

    // formatStatusResponse
    const mockStatus = {
      operational: true,
      uptime: 3600,
      memory: { free: 1024, total: 4096, used: 3072 },
      loadAverage: [0.5, 0.7, 0.8],
      timestamp: new Date('2023-01-01T00:00:00Z')
    };

    result = formatStatusResponse(mockStatus, []);
    expect(result).toBe('System is operational. All services are running smoothly.');

    result = formatStatusResponse(mockStatus, ['--verbose']);
    expect(result).toContain('System is operational');
    expect(result).toContain('Uptime: 1h 0m');
    expect(result).toContain('Memory: 3.0GB / 4.0GB');

    result = formatStatusResponse(mockStatus, ['--json']);
    expect(() => JSON.parse(result)).not.toThrow();

    const parsed2 = JSON.parse(result);
    expect(parsed2.operational).toBe(true);
    expect(parsed2.uptime).toBe(3600);

    const downStatus = { ...mockStatus, operational: false };
    result = formatStatusResponse(downStatus, []);
    expect(result).toContain('System is experiencing issues');

    const longUptimeStatus = { ...mockStatus, uptime: 90061 };
    result = formatStatusResponse(longUptimeStatus, ['--verbose']);
    expect(result).toContain('Uptime: 25h 1m');
  });
});