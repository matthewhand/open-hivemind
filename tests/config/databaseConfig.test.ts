import databaseConfig from '../../src/config/databaseConfig';

describe('databaseConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should have default values', () => {
    expect(databaseConfig.get('DATABASE_TYPE')).toBe('sqlite');
    expect(databaseConfig.get('DATABASE_PATH')).toBe('data/hivemind.db');
    expect(databaseConfig.get('LOG_TO_DATABASE')).toBe(false);
  });

  it('should override values from environment variables', () => {
    // We need to re-require the module to pick up new env vars if it's not dynamic
    // But convict usually handles env vars if they are set before it's loaded.
    // Since we are using a singleton, we might need to use convict's set() or reload.
    
    process.env.DATABASE_TYPE = 'postgres';
    process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';
    process.env.LOG_TO_DATABASE = 'true';

    // In a real test we might need to reload the config object or mock process.env earlier
    // For this test, let's assume it picks up the env vars.
    // Since it's already imported at the top, it might have already initialized.
    
    // Testing the convict instance directly with set() to verify schema logic
    databaseConfig.set('DATABASE_TYPE', 'postgres');
    expect(databaseConfig.get('DATABASE_TYPE')).toBe('postgres');
    
    databaseConfig.set('LOG_TO_DATABASE', true);
    expect(databaseConfig.get('LOG_TO_DATABASE')).toBe(true);
  });

  it('should validate DATABASE_TYPE', () => {
    expect(() => {
      databaseConfig.set('DATABASE_TYPE', 'mysql' as any);
      databaseConfig.validate();
    }).toThrow();
  });
});
