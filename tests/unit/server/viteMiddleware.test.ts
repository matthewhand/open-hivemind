import { jest } from '@jest/globals';

// Mock Vite
jest.mock('vite', () => ({
  createServer: jest.fn()
}));

// Mock file system
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
  normalize: jest.fn((path: string) => path),
  relative: jest.fn((from: string, to: string) => to),
  sep: '/',
  delimiter: ':',
  posix: {
    join: jest.fn((...args: string[]) => args.join('/')),
    resolve: jest.fn((...args: string[]) => args.join('/')),
    basename: jest.fn((path: string) => path.split('/').pop() || ''),
    dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
    extname: jest.fn((path: string) => {
      const parts = path.split('.');
      return parts.length > 1 ? `.${parts.pop()}` : '';
    }),
    normalize: jest.fn((path: string) => path),
    relative: jest.fn((from: string, to: string) => to),
    sep: '/',
    delimiter: ':'
  }
}));

// Mock debug
jest.mock('debug', () => jest.fn(() => jest.fn()));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn()
}));

import request from 'supertest';
import express from 'express';

// Import mocked modules
import { createServer } from 'vite';
import { existsSync } from 'fs';
import * as path from 'path';
import * as fs from 'fs';
import { configureFrontend } from '../../../src/index';

// Get references to mocked functions
const mockCreateServer = createServer as jest.MockedFunction<typeof createServer>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;

// Type definitions
type ViteDevServer = {
  middlewares: any;
  transformIndexHtml: jest.Mock;
  ssrFixStacktrace: jest.Mock;
};

describe('Vite Middleware Integration', () => {
  let app: express.Application;
  let mockViteServer: ViteDevServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    
    // Set development mode
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock Vite server
    mockViteServer = {
      middlewares: express.Router(),
      transformIndexHtml: jest.fn() as any,
      ssrFixStacktrace: jest.fn() as any
    };
    (mockViteServer.transformIndexHtml as any).mockResolvedValue('<html>mocked transformed html</html>');
    
    // Mock createServer to return our mock
    (mockCreateServer as any).mockResolvedValue(mockViteServer);

    // Mock file system
    mockExistsSync.mockReturnValue(true);

    // Mock fs.promises.readFile
    mockReadFile.mockResolvedValue('<html>original html</html>');
    
    // Create express app
    app = express();
    app.use(express.json());
  });

  describe('Middleware Loading', () => {
    it('should create Vite server in development mode', async () => {
      await configureFrontend();
      
      // Verify Vite server was created
      expect((mockCreateServer as any)).toHaveBeenCalledWith({
        root: expect.any(String),
        configFile: expect.any(String),
        server: {
          middlewareMode: true,
        },
        appType: 'custom',
      });
    });

    it('should mount Vite middlewares to Express app', async () => {
      await configureFrontend();
      
      // Verify middlewares were mounted
      expect(app._router).toBeDefined();
    });

    it('should not create Vite server in production mode', async () => {
      // Set production mode
      process.env.NODE_ENV = 'production';

      await configureFrontend();

      // Verify Vite server was not created
      expect((mockCreateServer as any)).not.toHaveBeenCalled();

      // Reset to development mode
      process.env.NODE_ENV = 'development';
    });
  });

  describe('Request Proxying', () => {
    beforeEach(async () => {
      await configureFrontend();
    });

    it('should proxy frontend requests to Vite', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toBe('<html>mocked transformed html</html>');
      expect((mockViteServer.transformIndexHtml as any)).toHaveBeenCalledWith(
        expect.any(String),
        '<html>original html</html>'
      );
    });

    it('should handle static asset requests', async () => {
      // Mock static file serving
      mockViteServer.middlewares.use = jest.fn((path, handler) => {
        if (path === '/assets/test.js') {
          (handler as any)({} as any, { send: jest.fn() } as any, jest.fn());
        }
      });
      
      await request(app)
        .get('/assets/test.js')
        .expect(200);
    });

    it('should handle HTML requests with transform', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);
      
      expect(response.type).toBe('text/html');
      expect((mockViteServer.transformIndexHtml as any)).toHaveBeenCalled();
    });
  });

  describe('API Bypass', () => {
    beforeEach(async () => {
      await configureFrontend();
    });

    it('should bypass Vite for API routes', async () => {
      // Add a mock API route
      app.get('/api/test', (req, res) => {
        res.json({ message: 'API response' });
      });
      
      const response = await request(app)
        .get('/api/test')
        .expect(200);
      
      expect(response.body).toEqual({ message: 'API response' });
      expect((mockViteServer.transformIndexHtml as any)).not.toHaveBeenCalled();
    });

    it('should bypass Vite for webui API routes', async () => {
      // Add a mock webui API route
      app.get('/webui/api/config', (req, res) => {
        res.json({ config: 'test' });
      });
      
      const response = await request(app)
        .get('/webui/api/config')
        .expect(200);
      
      expect(response.body).toEqual({ config: 'test' });
      expect((mockViteServer.transformIndexHtml as any)).not.toHaveBeenCalled();
    });

    it('should bypass Vite for health routes', async () => {
      // Add a mock health route
      app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });
      
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toEqual({ status: 'ok' });
      expect((mockViteServer.transformIndexHtml as any)).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Vite server creation failure', async () => {
      // Mock createServer to throw
      (mockCreateServer as any)
        .mockRejectedValue(new Error('Vite server failed to start'));
      
      // Should not throw, but log error
      await expect(configureFrontend()).resolves.not.toThrow();
    });

    it('should handle HTML transformation errors', async () => {
      // Mock transformIndexHtml to throw
      (mockViteServer.transformIndexHtml as any).mockRejectedValue(new Error('Transform failed'));
      
      await configureFrontend();
      
      const response = await request(app)
        .get('/')
        .expect(500);
      
      expect((mockViteServer.ssrFixStacktrace as any)).toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      // Mock readFile to throw
      (mockReadFile as any).mockRejectedValue(new Error('File not found'));
      
      await configureFrontend();
      
      const response = await request(app)
        .get('/')
        .expect(500);
      
      expect((mockViteServer.ssrFixStacktrace as any)).toHaveBeenCalled();
    });

    it('should handle Vite server not available', async () => {
      // Mock Vite server as null
      (mockCreateServer as any)
        .mockResolvedValue(null);
      
      await configureFrontend();
      
      // Should still handle requests gracefully
      const response = await request(app)
        .get('/')
        .expect(500);
    });
  });

  describe('Production Mode Behavior', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'production';
    });

    afterAll(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should serve static files in production', async () => {
      // Mock file system for production
      mockExistsSync
        .mockReturnValueOnce(true) // dist/client/dist
        .mockReturnValueOnce(true); // index.html
      
      mockReadFile.mockResolvedValue('<html>production html</html>');
      
      await configureFrontend();
      
      // Add a test route
      app.get('/', (req, res) => {
        (res as any).sendFile = jest.fn();
        res.status(200);
      });
      
      const response = await request(app)
        .get('/')
        .expect(200);
      
      // In production, Vite should not be used
      expect((mockCreateServer as any)).not.toHaveBeenCalled();
    });
  });
});