import request from 'supertest';
import express from 'express';
import { ipWhitelist } from '../../../src/server/middleware/security';

const app = express();
app.use(express.json());

// Mock middleware for testing
app.use('/admin/test', ipWhitelist, (req, res) => {
  res.json({ success: true, message: 'Access granted' });
});

describe('IP Whitelist Middleware', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.ADMIN_IP_WHITELIST;
  });

  describe('Default whitelist (localhost)', () => {
    it('should allow localhost IPv4', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '127.0.0.1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow localhost IPv6', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '::1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny non-whitelisted IP', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(403);

      expect(response.body.error).toBe('Access Denied');
      expect(response.body.ip).toBe('192.168.1.100');
    });
  });

  describe('Environment variable whitelist', () => {
    it('should allow IPs from ADMIN_IP_WHITELIST env var', async () => {
      process.env.ADMIN_IP_WHITELIST = '192.168.1.100,10.0.0.1';

      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny IPs not in ADMIN_IP_WHITELIST env var', async () => {
      process.env.ADMIN_IP_WHITELIST = '192.168.1.100,10.0.0.1';

      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '172.16.0.1')
        .expect(403);

      expect(response.body.error).toBe('Access Denied');
    });
  });

  describe('Wildcard support', () => {
    it('should allow all IPs when whitelist contains *', async () => {
      process.env.ADMIN_IP_WHITELIST = '*';

      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow all IPs when whitelist contains 0.0.0.0', async () => {
      process.env.ADMIN_IP_WHITELIST = '0.0.0.0';

      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('IP header handling', () => {
    it('should handle X-Forwarded-For header', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '127.0.0.1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle X-Real-IP header', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Real-IP', '127.0.0.1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle X-Client-IP header', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Client-IP', '127.0.0.1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});