import { ConfigurationManager } from '../../../src/config/ConfigurationManager';
import { registerServices } from '../../../src/di/registration';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe.skip('ConfigurationManager Integration', () => {
  const originalEnv = { ...process.env };
  let testConfigDir: string;
  let manager: ConfigurationManager;

  beforeAll(() => {
    registerServices();
    testConfigDir = path.join(os.tmpdir(), `hivemind-config-test-${Date.now()}`);
    fs.mkdirSync(testConfigDir, { recursive: true });
    
    // Set up a mock secure config and other dependencies to test full load
    process.env.NODE_CONFIG_DIR = testConfigDir;
    
    // We test that it instantiates correctly with actual filesystem bounds
    manager = ConfigurationManager.getInstance();
  });

  afterAll(() => {
    if (fs.existsSync(testConfigDir)) {
      try { fs.rmSync(testConfigDir, { recursive: true, force: true }); } catch (e) {}
    }
    process.env = originalEnv;
  });

  it('should initialize and return environment settings', () => {
    expect(manager).toBeDefined();
    
    const envConfig = manager.getConfig('environment');
    expect(envConfig).toBeDefined();
    expect(envConfig?.get('NODE_ENV')).toBeDefined();
  });

  it('should reflect environment variable overrides', () => {
    process.env.VITE_API_BASE_URL = 'http://test-url:9999/api';
    
    const newManager = ConfigurationManager.getInstance();
    const envConfig = newManager.getConfig('environment');
    expect(envConfig?.get('VITE_API_BASE_URL')).toBe('http://test-url:9999/api');
  });
});
