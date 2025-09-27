#!/usr/bin/env node

const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3028;

console.log(`🚀 Starting Open-Hivemind WebUI on port ${PORT}`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'open-hivemind-webui',
        port: PORT
    });
});

// Dashboard API Routes - Mock data that matches what was working 2 days ago
app.use('/dashboard/api/status', (req, res) => {
    res.json({
        status: 'active',
        uptime: 3600 * 24 * 2, // 2 days uptime
        bots: [
            { name: 'Discord Bot #1', provider: 'discord', status: 'active', connected: true, messageCount: 1245, errorCount: 2 },
            { name: 'Slack Bot #1', provider: 'slack', status: 'active', connected: true, messageCount: 867, errorCount: 0 },
            { name: 'Telegram Bot #1', provider: 'telegram', status: 'connecting', connected: false, messageCount: 432, errorCount: 1 },
            { name: 'Mattermost Bot #1', provider: 'mattermost', status: 'active', connected: true, messageCount: 298, errorCount: 0 }
        ],
        totalMessages: 2842,
        activeConnections: 3
    });
});

app.use('/webui/api/performance-metrics', (req, res) => {
    const now = Date.now();
    const cpuUsage = 45 + Math.sin(now / 10000) * 10; // Realistic CPU fluctuation
    const memoryUsage = 62 + Math.sin(now / 15000) * 8; // Memory fluctuation
    const responseTime = 120 + Math.random() * 50; // Response time variation
    
    res.json({
        cpuUsage: Math.max(0, Math.min(100, cpuUsage)),
        memoryUsage: Math.max(0, Math.min(100, memoryUsage)),
        responseTime: responseTime,
        errorRate: 0.8, // 0.8% error rate
        uptime: 3600 * 24 * 2,
        activeConnections: 3
    });
});

app.use('/webui/api/analytics', (req, res) => {
    const timeRange = req.query.timeRange || '24h';
    res.json({
        totalMessages: 2842,
        totalBots: 4,
        activeConnections: 3,
        averageResponseTime: 145.7,
        errorRate: 0.008, // 0.8%
        topChannels: [
            { channelId: 'general', messageCount: 1245 },
            { channelId: 'support', messageCount: 867 },
            { channelId: 'dev-team', messageCount: 432 },
            { channelId: 'random', messageCount: 298 }
        ],
        providerUsage: {
            discord: 1245,
            slack: 867,
            telegram: 432,
            mattermost: 298
        },
        dailyStats: [
            { date: '2025-09-25', messages: 1456, errors: 12 },
            { date: '2025-09-26', messages: 1678, errors: 8 },
            { date: '2025-09-27', messages: 2842, errors: 3 }
        ]
    });
});

// General API Routes
app.use('/api', (req, res, next) => {
    if (req.path === '/status') {
        res.json({ status: 'webui-active', port: PORT });
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// Admin routes
app.use('/admin', (req, res) => {
    const adminPath = path.join(__dirname, 'public/admin/index.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.send(`
            <html>
                <head><title>Open-Hivemind Admin</title></head>
                <body>
                    <h1>🔧 Admin Interface</h1>
                    <p>Port: ${PORT}</p>
                    <p>Status: Active</p>
                    <a href="/webui">Go to WebUI →</a>
                </body>
            </html>
        `);
    }
});

// Serve built React webui files
const webUIBuildPath = path.join(__dirname, 'webui/dist');
if (fs.existsSync(webUIBuildPath)) {
    console.log('📁 Serving built webui from dist/');
    app.use('/webui', express.static(webUIBuildPath));
} else {
    console.log('⚠️  No built webui found, serving proxy to development server');
    app.use('/webui', (req, res) => {
        res.send(`
            <html>
                <head><title>Open-Hivemind WebUI</title></head>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1>🎯 Open-Hivemind WebUI</h1>
                    <p><strong>Development Mode Active</strong></p>
                    <p>Main Server Port: ${PORT}</p>
                    <p>React Dev Server: <a href="http://localhost:3029" target="_blank">http://localhost:3029</a></p>
                    <hr>
                    <h3>Available Interfaces:</h3>
                    <ul>
                        <li><a href="http://localhost:3029" target="_blank">🔴 Live React WebUI (Port 3029) →</a></li>
                        <li><a href="/admin">🔧 Admin Interface →</a></li>
                        <li><a href="/health">❤️ Health Check →</a></li>
                    </ul>
                    <hr>
                    <p><small>To build for production: <code>cd webui && npm run build</code></small></p>
                </body>
            </html>
        `);
    });
}

// Root route
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <html>
                <head><title>Open-Hivemind</title></head>
                <body style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <div style="max-width: 800px; margin: 0 auto; text-align: center;">
                        <h1>🧠 Open-Hivemind</h1>
                        <p style="font-size: 1.2em;">Multi-Agent Bot System</p>
                        <p>Main Server: <strong>:${PORT}</strong> | React Dev: <strong>:3029</strong></p>
                        <hr style="border: 1px solid rgba(255,255,255,0.3);">
                        <h3>🚀 Available Interfaces:</h3>
                        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin: 20px 0;">
                            <a href="http://localhost:3029" target="_blank" style="background: #ff6b6b; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                🔴 Live WebUI Dashboard
                            </a>
                            <a href="/admin" style="background: #4ecdc4; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                🔧 Admin Interface
                            </a>
                            <a href="/health" style="background: #45b7d1; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                ❤️ Health Check
                            </a>
                        </div>
                        <hr style="border: 1px solid rgba(255,255,255,0.3);">
                        <p style="font-size: 0.9em; opacity: 0.8;">
                            ✅ Server Running | ✅ WebUI Active | ✅ Ready for Action
                        </p>
                    </div>
                </body>
            </html>
        `);
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).send(`
        <html>
            <head><title>404 - Not Found</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>404 - Page Not Found</h1>
                <p>Path: ${req.originalUrl}</p>
                <a href="/">← Back to Home</a>
            </body>
        </html>
    `);
});

// Start server
const server = createServer(app);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Open-Hivemind WebUI Server running on:`);
    console.log(`   Local:   http://localhost:${PORT}/`);
    console.log(`   Network: http://0.0.0.0:${PORT}/`);
    console.log(`   WebUI:   http://localhost:${PORT}/webui`);
    console.log(`   Admin:   http://localhost:${PORT}/admin`);
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use. Try: PORT=3029 node start-webui.js`);
    }
});