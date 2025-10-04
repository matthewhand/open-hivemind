import express from 'express';

// Mock Express app for unit tests
export const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock routes for testing
app.get('/health', (req, res) => {
  res.send('OK');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock admin login endpoint for localhost bypass tests
app.post('/webui/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.get('X-Forwarded-For') || req.ip || req.connection.remoteAddress || '127.0.0.1';
  
  // Mock localhost bypass logic - matches test expectations
  if (username === 'admin' && (clientIP === '127.0.0.1' || clientIP === '::1')) {
    res.json({ 
      success: true, 
      bypassInfo: {
        isLocalBypass: true,
        adminPasswordSet: false
      },
      data: {
        user: { 
          username: 'admin', 
          role: 'admin' 
        }
      }
    });
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
});

// Also add the basic login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin') {
    res.json({ success: true, user: { username: 'admin', role: 'admin' } });
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
});

export default app;