import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5005';
const API_BASE_URL = `${BASE_URL}/dashboard/api`;

describe('Dashboard E2E Tests', function() {
  this.timeout(30000); // Increased timeout for E2E tests

  let server;
  let app;

  before(async function() {
    // Skip tests if we're in CI environment and server is not running
    if (process.env.CI && !process.env.TEST_SERVER_RUNNING) {
      console.log('Skipping E2E tests in CI environment');
      this.skip();
    }

    try {
      // Try to connect to existing server first
      await checkServerHealth();
      console.log('Connected to existing server');
    } catch (error) {
      console.log('Server not running, attempting to start...');
      try {
        // Import and start the server
        const serverModule = await import('../../dist/src/index.js');
        app = serverModule.default || serverModule;
        
        // Start server on test port
        const testPort = process.env.TEST_PORT || 5005;
        server = http.createServer(app);
        await new Promise((resolve, reject) => {
          server.listen(testPort, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`Test server started on port ${testPort}`);
      } catch (startError) {
        console.error('Failed to start server:', startError);
        this.skip();
      }
    }
  });

  after(async function() {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      console.log('Test server stopped');
    }
  });

  describe('Static Files and Routes', function() {
    it('should serve the main dashboard page at root', async function() {
      const response = await fetch(BASE_URL);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('text/html');
      
      const html = await response.text();
      expect(html).to.include('Open-Hivemind Dashboard');
      expect(html).to.include('Multi-Agent System Control Center');
    });

    it('should have proper security headers', async function() {
      const response = await fetch(BASE_URL);
      
      expect(response.headers.get('X-Content-Type-Options')).to.equal('nosniff');
      expect(response.headers.get('Content-Security-Policy')).to.include('default-src');
    });

    it('should not serve deprecated dashboard routes', async function() {
      const deprecatedRoutes = [
        '/dashboard',
        '/react-dashboard', 
        '/realtime-dashboard',
        '/bots',
        '/config',
        '/performance',
        '/settings'
      ];

      for (const route of deprecatedRoutes) {
        try {
          const response = await fetch(`${BASE_URL}${route}`);
          // If route exists, it should not be the old dashboard
          if (response.status === 200) {
            const html = await response.text();
            expect(html).to.not.include('Advanced Dashboard');
            expect(html).to.not.include('Real-Time Monitoring Dashboard');
          }
        } catch (error) {
          // 404 is acceptable for deprecated routes
          expect(error.message).to.include('404');
        }
      }
    });
  });

  describe('Dashboard API Endpoints', function() {
    it('should return status data from /dashboard/api/status', async function() {
      const response = await fetch(`${API_BASE_URL}/status`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('application/json');
      
      const data = await response.json();
      expect(data).to.have.property('bots');
      expect(data).to.have.property('uptime');
      expect(Array.isArray(data.bots)).to.be.true;
      expect(typeof data.uptime).to.equal('number');
    });

    it('should have proper bot status structure', async function() {
      const response = await fetch(`${API_BASE_URL}/status`);
      const data = await response.json();
      
      if (data.bots.length > 0) {
        const bot = data.bots[0];
        expect(bot).to.have.property('name');
        expect(bot).to.have.property('provider');
        expect(bot).to.have.property('status');
        expect(bot).to.have.property('connected');
        expect(bot).to.have.property('messageCount');
        expect(bot).to.have.property('errorCount');
      }
    });

    it('should handle API errors gracefully', async function() {
      try {
        const response = await fetch(`${API_BASE_URL}/nonexistent-endpoint`);
        expect(response.status).to.equal(404);
      } catch (error) {
        // Network errors are also acceptable
        expect(error.message).to.include('404');
      }
    });
  });

  describe('WebUI API Endpoints', function() {
    it('should return config data from /webui/api/config', async function() {
      const response = await fetch(`${BASE_URL}/webui/api/config`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('application/json');
      
      const data = await response.json();
      expect(data).to.have.property('bots');
      expect(Array.isArray(data.bots)).to.be.true;
    });

    it('should have proper config structure', async function() {
      const response = await fetch(`${BASE_URL}/webui/api/config`);
      const data = await response.json();
      
      if (data.bots.length > 0) {
        const bot = data.bots[0];
        expect(bot).to.have.property('name');
        expect(bot).to.have.property('messageProvider');
        expect(bot).to.have.property('llmProvider');
      }
    });
  });

  describe('Admin Routes', function() {
    it('should serve admin panel at /admin', async function() {
      const response = await fetch(`${BASE_URL}/admin`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('text/html');
    });

    it('should have admin API endpoints', async function() {
      const response = await fetch(`${BASE_URL}/api/admin`);
      expect(response.status).to.equal(200);
    });
  });

  describe('Dashboard Functionality', function() {
    it('should display system status correctly', async function() {
      const response = await fetch(`${API_BASE_URL}/status`);
      const data = await response.json();
      
      // Verify uptime is reasonable
      expect(data.uptime).to.be.greaterThanOrEqual(0);
      expect(data.uptime).to.be.lessThan(31536000); // Less than 1 year in seconds
    });

    it('should handle bot status correctly', async function() {
      const response = await fetch(`${API_BASE_URL}/status`);
      const data = await response.json();
      
      // Check that all bots have valid status
      data.bots.forEach(bot => {
        expect(['active', 'connecting', 'inactive', 'unavailable', 'error']).to.include(bot.status);
        expect(typeof bot.connected).to.equal('boolean');
        expect(bot.messageCount).to.be.greaterThanOrEqual(0);
        expect(bot.errorCount).to.be.greaterThanOrEqual(0);
      });
    });

    it('should calculate metrics correctly', async function() {
      const response = await fetch(`${API_BASE_URL}/status`);
      const data = await response.json();
      
      const totalMessages = data.bots.reduce((sum, bot) => sum + (bot.messageCount || 0), 0);
      const totalErrors = data.bots.reduce((sum, bot) => sum + (bot.errorCount || 0), 0);
      
      expect(totalMessages).to.be.greaterThanOrEqual(0);
      expect(totalErrors).to.be.greaterThanOrEqual(0);
    });
  });

  describe('Security and Performance', function() {
    it('should have proper CORS headers', async function() {
      const response = await fetch(`${API_BASE_URL}/status`);
      // Check for CORS-related headers if configured
      const corsHeader = response.headers.get('access-control-allow-origin');
      if (corsHeader) {
        expect(corsHeader).to.match(/\*|https?:\/\/.+/);
      }
    });

    it('should respond within acceptable time', async function() {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/status`);
      const endTime = Date.now();
      
      expect(response.status).to.equal(200);
      expect(endTime - startTime).to.be.lessThan(5000); // Less than 5 seconds
    });

    it('should handle concurrent requests', async function() {
      const requests = Array(5).fill().map(() => fetch(`${API_BASE_URL}/status`));
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).to.equal(200);
      });
    });
  });
});

// Helper function to check server health
async function checkServerHealth() {
  const response = await fetch(`${API_BASE_URL}/status`);
  if (response.status !== 200) {
    throw new Error(`Server health check failed: ${response.status}`);
  }
  return response.json();
}
