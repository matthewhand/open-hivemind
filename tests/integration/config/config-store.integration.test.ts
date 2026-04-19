import { ConfigStore } from '../../../src/config/ConfigStore';
import { registerServices } from '../../../src/di/registration';

describe('ConfigStore Integration', () => {
  beforeAll(() => {
    registerServices();
  });

  it('should load global configuration defaults', () => {
    const store = ConfigStore.getInstance();
    expect(store).toBeDefined();

    // Verify it handles fetching non-existent properties gracefully
    const val = store.get('SOME_NON_EXISTENT_KEY');
    expect(val).toBeUndefined();
  });

  it('should reflect environment variable overrides', () => {
    const store = ConfigStore.getInstance();
    process.env.TEST_OVERRIDE_KEY = 'test-value';
    
    // We test that it falls back to environment variables or properly provides defaults
    const val = store.get('TEST_OVERRIDE_KEY');
    expect(val).toBe('test-value');
    
    delete process.env.TEST_OVERRIDE_KEY;
  });
});
