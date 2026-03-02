const express = require('express');
const { configureWebhookRoutes } = require('./src/webhook/routes/webhookRoutes');
const request = require('supertest');

const app = express();
app.use(express.json());

const mockMessageService = {
  sendPublicAnnouncement: async () => {},
  getDefaultChannel: () => 'test-channel'
};

configureWebhookRoutes(app, mockMessageService, 'test');

async function test() {
  const res = await request(app).post('/webhook').send({ id: "test", status: "processing" });

  console.log("=== Before/After Security Headers ===");
  console.log("X-Frame-Options:", res.headers['x-frame-options'] || 'Missing');
  console.log("X-Content-Type-Options:", res.headers['x-content-type-options'] || 'Missing');
  console.log("X-XSS-Protection:", res.headers['x-xss-protection'] || 'Missing');
  console.log("Referrer-Policy:", res.headers['referrer-policy'] || 'Missing');
  console.log("Cache-Control:", res.headers['cache-control'] || 'Missing');
  console.log("=====================================");
}

test();
