import request from 'supertest';
import express from 'express';
import dashboardRouter from '@src/webui/routes/dashboard';

const app = express();
app.use('/dashboard', dashboardRouter);

describe('Dashboard Routes', () => {
  test('GET /dashboard/api/status returns bot status', async () => {
    const response = await request(app)
      .get('/dashboard/api/status')
      .expect(200);
    
    expect(response.body).toHaveProperty('bots');
    expect(response.body).toHaveProperty('uptime');
  });
});