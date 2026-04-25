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

      // We expect the payload not to cause an internal DB crash, but checking for "sql"
      // generically can fail if the normal response payload contains keys like "database_name"
      // or "sqlite" as the currently configured defaults.
      // So instead of matching just "sql", we look for specific error signatures.
      const bodyString = JSON.stringify(response.body).toLowerCase();
      if (response.status !== 200) {
        expect(bodyString).not.toContain('syntax error');
        expect(bodyString).not.toMatch(/error.*sql/);
      }
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
      if (response.status !== 200) {
        expect(bodyString).not.toMatch(/error.*sql/);
      }
  });
});
