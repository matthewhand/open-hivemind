import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/index';

describe('SQL Injection Prevention Integration Tests', () => {
  it('should not leak database errors for malicious inputs', async () => {
    // We use a route that might interact with DB, like /api/config
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
    ];

    for (const payload of sqlPayloads) {
      const response = await request(app)
        .get(`/api/config?filter=${encodeURIComponent(payload)}`);

      // Should be handled safely
      expect(response.status).not.toBe(500);

      const bodyString = JSON.stringify(response.body).toLowerCase();
      expect(bodyString).not.toContain('sql');
      expect(bodyString).not.toContain('syntax error');
      expect(bodyString).not.toContain('sqlite');
    }
  });

  it('should handle malicious POST data safely', async () => {
      const response = await request(app)
        .post('/api/config')
        .send({
            name: "'; DROP TABLE configs; --",
            value: "1' OR '1'='1"
        });

      expect(response.status).not.toBe(500);
      const bodyString = JSON.stringify(response.body).toLowerCase();
      expect(bodyString).not.toContain('sql');
      expect(bodyString).not.toContain('sqlite');
  });
});
