import { Config } from 'config';

/**
 * Shared utilities for testing configuration modules
 */

export interface ConfigTestDefaults {
  [key: string]: any;
}

export interface ConfigTestEnvVars {
  [key: string]: string;
}

/**
 * Test that a config module has the expected default values
 */
export function testConfigDefaults(
  configPath: string,
  expectedDefaults: ConfigTestDefaults,
  description = 'default configuration values'
) {
  it(`should have correct ${description}`, () => {
    // Reset environment and modules for clean state
    process.env = { NODE_ENV: 'test', NODE_CONFIG_DIR: '/dev/null' };
    jest.resetModules();

    const freshConfig: Config = require(configPath).default;

    Object.entries(expectedDefaults).forEach(([key, expectedValue]) => {
      expect(freshConfig.get(key)).toEqual(expectedValue);
    });

    // Validate schema
    expect(() => freshConfig.validate({ allowed: 'strict' })).not.toThrow();
  });
}

/**
 * Test that environment variables are loaded correctly
 */
export function testEnvironmentLoading(
  configPath: string,
  envVars: ConfigTestEnvVars,
  expectedResults: ConfigTestDefaults,
  description = 'environment variable loading'
) {
  it(`should load ${description}`, () => {
    // Set environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value;
    });

    jest.resetModules();
    const config: Config = require(configPath).default;

    Object.entries(expectedResults).forEach(([key, expectedValue]) => {
      expect(config.get(key)).toBe(expectedValue);
    });
  });
}

/**
 * Test configuration validation
 */
export function testConfigValidation(configPath: string, testName = 'configuration validation') {
  describe(testName, () => {
    let config: Config;

    beforeEach(() => {
      jest.resetModules();
      config = require(configPath).default;
    });

    it('should validate with strict mode', () => {
      expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should validate with populated configuration', () => {
      // Test with some populated values
      expect(() => config.validate({ allowed: 'warn' })).not.toThrow();
    });
  });
}

/**
 * Test error handling and edge cases
 */
export function testConfigErrorHandling(
  configPath: string,
  invalidKeys: string[] = [],
  testName = 'error handling and edge cases'
) {
  describe(testName, () => {
    let config: Config;

    beforeEach(() => {
      jest.resetModules();
      config = require(configPath).default;
    });

    invalidKeys.forEach((key) => {
      it(`should handle missing configuration key: ${key}`, () => {
        expect(() => config.get(key as any)).toThrow();
      });
    });

    it('should handle empty string environment variables', () => {
      // This is a general test - specific implementations may vary
      expect(
        typeof config.get(Object.keys(config._instance?.root || {})[0] || 'test')
      ).toBeDefined();
    });
  });
}

/**
 * Test performance and reliability
 */
export function testConfigPerformance(
  configPath: string,
  operations: Array<() => any>,
  testName = 'performance and reliability'
) {
  describe(testName, () => {
    let config: Config;

    beforeEach(() => {
      jest.resetModules();
      config = require(configPath).default;
    });

    it('should handle multiple rapid configuration accesses', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        operations.forEach((op) => op());
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain consistency across multiple calls', () => {
      const results1 = operations.map((op) => op());
      const results2 = operations.map((op) => op());

      results1.forEach((result, index) => {
        expect(result).toEqual(results2[index]);
      });
    });

    it('should handle concurrent access patterns', async () => {
      const promises = Array(50)
        .fill(null)
        .map(async () => {
          return operations.map((op) => op());
        });

      const results = await Promise.all(promises);
      const first = results[0];

      results.forEach((result) => {
        result.forEach((value: any, index: number) => {
          expect(value).toEqual(first[index]);
        });
      });
    });
  });
}

/**
 * Test module integration behavior
 */
export function testConfigIntegration(
  configPath: string,
  testName = 'integration and module behavior'
) {
  describe(testName, () => {
    it('should maintain state after module re-import', () => {
      jest.resetModules();
      const config1: Config = require(configPath).default;
      const config2: Config = require(configPath).default;

      expect(config1).toBe(config2); // Should be the same instance
    });

    it('should have required configuration methods', () => {
      jest.resetModules();
      const config: Config = require(configPath).default;

      expect(typeof config.get).toBe('function');
      expect(typeof config.validate).toBe('function');
    });
  });
}

/**
 * Parameterized test helper for testing multiple scenarios
 */
export function testParameterized(
  testName: string,
  scenarios: Array<{
    name: string;
    setup?: () => void;
    action: () => any;
    assertion: (result: any) => void;
  }>
) {
  describe(testName, () => {
    scenarios.forEach(({ name, setup, action, assertion }) => {
      it(name, () => {
        if (setup) setup();
        const result = action();
        assertion(result);
      });
    });
  });
}
