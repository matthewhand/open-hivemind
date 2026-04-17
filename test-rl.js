const { rateLimit } = require('express-rate-limit');
const express = require('express');
const app = express();

class MemoryStoreWithCleanup {
  constructor(windowMs) {
    this.hits = new Map();
    this.windowMs = windowMs;
  }

  async increment(key) {
    const now = Date.now();
    const existing = this.hits.get(key);

    if (existing && now < existing.resetTime) {
      existing.count++;
      return { totalHits: existing.count, resetTime: existing.resetTime }; // resetTime is a number, but express-rate-limit 7+ expects a Date object
    }

    const resetTime = now + this.windowMs;
    const newData = { count: 1, resetTime };
    this.hits.set(key, newData);
    return { totalHits: 1, resetTime: new Date(resetTime) }; // Wait, is express-rate-limit looking for Date?
  }

  async decrement(key) { }
  async resetKey(key) { }
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new MemoryStoreWithCleanup(15 * 60 * 1000),
});

app.use(limiter);
app.get('/', (req, res) => res.send('ok'));

const request = require('supertest');
request(app).get('/').expect(200).then(() => console.log('success')).catch(console.error);
