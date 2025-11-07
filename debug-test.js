const express = require('express');
const configRouter = require('./src/server/routes/config.ts');

const app = express();
app.use(express.json());
app.use('/', configRouter);

app.listen(3000, () => {
  console.log('Test server running on port 3000');
  
  // Test the routes
  const http = require('http');
  
  // Test GET /api/config
  http.get('http://localhost:3000/api/config', (res) => {
    console.log('GET /api/config status:', res.statusCode);
    res.on('data', (chunk) => {
      console.log('Response:', chunk.toString());
    });
  });
  
  // Test POST /api/config/reload
  const req = http.request('http://localhost:3000/api/config/reload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, (res) => {
    console.log('POST /api/config/reload status:', res.statusCode);
    res.on('data', (chunk) => {
      console.log('Response:', chunk.toString());
    });
  });
  
  req.end();
  
  // Test POST /api/cache/clear
  const req2 = http.request('http://localhost:3000/api/cache/clear', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, (res) => {
    console.log('POST /api/cache/clear status:', res.statusCode);
    res.on('data', (chunk) => {
      console.log('Response:', chunk.toString());
    });
  });
  
  req2.end();
});