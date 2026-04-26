import bcrypt from 'bcrypt';
import { AuthManager } from '../../src/auth/AuthManager';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('$2b$10$salt'),
  hashSync: jest.fn().mockReturnValue('$2b$10$hashedpasswordSync'),
}));

describe('AuthManager Security Fix', () => {
  let authManager: AuthManager;
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (AuthManager as any).instance = null;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should use ADMIN_PASSWORD if provided in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_PASSWORD = 'mysecurepassword';
    process.env.JWT_SECRET = 'myjwtsecret'; // required in production now

    authManager = AuthManager.getInstance();

    const admin = authManager.getUser('admin');
    expect(admin).toBeDefined();

    expect(bcrypt.hashSync).toHaveBeenCalledWith('mysecurepassword', 12);
  });

  it('should throw CRITICAL error if ADMIN_PASSWORD is missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;
    process.env.JWT_SECRET = 'myjwtsecret';

    expect(() => {
      AuthManager.getInstance();
    }).toThrow('CRITICAL: ADMIN_PASSWORD environment variable is required in production.');
  });

  it('should still use default password in test environment', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ADMIN_PASSWORD;
    delete process.env.JWT_SECRET;

    authManager = AuthManager.getInstance();

    const admin = authManager.getUser('admin');
    expect(admin).toBeDefined();
  });
});
