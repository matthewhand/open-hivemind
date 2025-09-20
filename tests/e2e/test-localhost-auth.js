const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5006';

describe('Localhost Authentication Bypass E2E Tests', function() {
  this.timeout(30000);

  let server;

  before(async function() {
    try {
      // Import and start the server
      const serverModule = require('../../dist/src/index');
      const app = serverModule.default || serverModule;

      // Start server on test port
      server = http.createServer(app);
      await new Promise((resolve, reject) => {
        server.listen(5006, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Test server started on port 5006');
    } catch (error) {
      console.error('Failed to start server:', error);
      this.skip();
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
    });

    it('should serve admin panel at /admin', async function() {
      const response = await fetch(`${BASE_URL}/admin`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('text/html');

      const html = await response.text();
      expect(html).to.include('<!DOCTYPE html>');
    });

    it('should serve webui at /webui', async function() {
      const response = await fetch(`${BASE_URL}/webui`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('text/html');

      const html = await response.text();
      expect(html).to.include('<!DOCTYPE html>');
    });
  });

  describe('API Endpoints', function() {
    it('should access admin API without authentication from localhost', async function() {
      const response = await fetch(`${BASE_URL}/api/admin`);
      expect(response.status).to.equal(200);
    });

    it('should access webui API without authentication from localhost', async function() {
      const response = await fetch(`${BASE_URL}/webui/api/config`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('application/json');
    });
  });

  describe('CORS Headers', function() {
    it('should have proper CORS headers for localhost requests', async function() {
      const response = await fetch(`${BASE_URL}/webui/api/config`);
      const corsHeader = response.headers.get('access-control-allow-origin');

      // Should allow localhost origins
      expect(corsHeader).to.match(/localhost|127\.0\.0\.1/);
    });
  });

  describe('Static Assets', function() {
    it('should serve CSS files correctly', async function() {
      const response = await fetch(`${BASE_URL}/admin/assets/index-Dtn62Xmo.css`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('text/css');
    });

    it('should serve JS files correctly', async function() {
      const response = await fetch(`${BASE_URL}/admin/assets/index-CJcoIOvE.js`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('application/javascript');
    });

    it('should serve webui assets correctly', async function() {
      const response = await fetch(`${BASE_URL}/webui/assets/index-Dtn62Xmo.css`);
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.include('text/css');
    });
  });
});