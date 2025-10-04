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
  
  // Check environment variables for test scenarios
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const DISABLE_LOCAL_ADMIN_BYPASS = process.env.DISABLE_LOCAL_ADMIN_BYPASS === 'true';
  
  // Mock localhost bypass logic that matches all test expectations
  const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1';
  
  if (username === 'admin') {
    // If bypass is disabled, always require password
    if (DISABLE_LOCAL_ADMIN_BYPASS) {
      if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
        res.json({ 
          success: true, 
          bypassInfo: { isLocalBypass: false, adminPasswordSet: true },
          data: { user: { username: 'admin', role: 'admin' } }
        });
      } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    }
    // If localhost and no admin password set, allow bypass
    else if (isLocalhost && !ADMIN_PASSWORD) {
      res.json({ 
        success: true, 
        bypassInfo: { isLocalBypass: true, adminPasswordSet: false },
        data: { user: { username: 'admin', role: 'admin', created: new Date() } }
      });
    }
    // If admin password is set, require it
    else if (ADMIN_PASSWORD) {
      if (password === ADMIN_PASSWORD) {
        res.json({ 
          success: true, 
          bypassInfo: { isLocalBypass: false, adminPasswordSet: true },
          data: { user: { username: 'admin', role: 'admin', created: new Date() } }
        });
      } else {
        res.status(401).json({ success: false, error: 'Invalid password' });
      }
    }
    // Default localhost bypass
    else if (isLocalhost) {
      res.json({ 
        success: true, 
        bypassInfo: { isLocalBypass: true, adminPasswordSet: false },
        data: { user: { username: 'admin', role: 'admin' } }
      });
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  } else {
    res.status(401).json({ success: false, error: 'Invalid username' });
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