const crypto = require('crypto');

// Vercel Serverless Function - Native API Handler
// No external dependencies to avoid cold start timeouts

// Security: Generate a secure random password at runtime if ADMIN_PASSWORD is not set.
// This ensures no hardcoded defaults exist in the codebase.
// The password will be printed to the Vercel function logs on cold start.
let runtimePassword = process.env.ADMIN_PASSWORD;

if (!runtimePassword) {
    runtimePassword = crypto.randomBytes(12).toString('hex');
    console.log("---------------------------------------------------------");
    console.log("⚠️  ADMIN_PASSWORD environment variable not configured.");
    console.log("⚠️  Using temporary runtime password.");
    console.log(`🔐 Generated Password: ${runtimePassword}`);
    console.log("---------------------------------------------------------");
} else {
    // console.log("ADMIN_PASSWORD is configured.");
}

module.exports = function handler(req, res) {
    const url = req.url || '/api';
    const path = url.split('?')[0];
    const method = req.method || 'GET';

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Helper for body parsing if needed
    if (!req.body && method === 'POST') {
        try {
            // Vercel usually parses JSON body automatically
        } catch (e) {
            // Ignore parse errors
        }
    }

    // Health check
    if (path === '/api/health' || path === '/api/health/') {
        return res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            platform: 'vercel-serverless'
        });
    }

    // Auth Login
    if (path === '/api/auth/login' || path === '/webui/api/auth/login') {
        if (method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { username, password } = req.body || {};

        // Check password using runtimePassword which is either from env or securely generated
        if (password === runtimePassword) {
            // Generate a secure random token for the serverless session
            const token = crypto.randomBytes(32).toString('hex');
            return res.json({
                success: true,
                accessToken: token,
                refreshToken: 'serverless-refresh-token',
                expiresIn: 3600,
                user: {
                    id: 'serverless-admin',
                    username: 'admin',
                    email: 'admin@open-hivemind.com',
                    role: 'admin',
                    permissions: ['all']
                }
            });
        }

        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // API documentation
    if (path === '/api' || path === '/api/') {
        return res.status(200).json({
            name: 'Open Hivemind Serverless API',
            version: '1.0.0',
            mode: 'serverless',
            description: 'Serverless mode with webhook support for message providers',
            endpoints: {
                health: '/api/health',
                config: '/api/config',
                bots: '/api/bots',
                dashboard: '/api/dashboard',
                webhook: '/api/webhook'
            }
        });
    }

    // Config endpoint
    if (path === '/api/config' || path === '/api/config/') {
        return res.status(200).json({
            message: 'Configuration via environment variables in serverless mode',
            mode: 'env-based',
            note: 'WebUI config management available in Docker deployment'
        });
    }

    // Bots endpoint
    if (path === '/api/bots' || path === '/api/bots/') {
        return res.status(200).json({
            message: 'Bot status in serverless mode',
            mode: 'webhook-enabled',
            note: 'Webhook callbacks supported for message providers'
        });
    }

    // Dashboard
    if (path === '/api/dashboard' || path === '/api/dashboard/') {
        return res.status(200).json({
            serverless: true,
            status: 'operational',
            timestamp: new Date().toISOString()
        });
    }

    // Webhook endpoint
    if (path.startsWith('/api/webhook')) {
        const provider = path.split('/')[3] || 'unknown';
        return res.status(200).json({
            received: true,
            provider: provider,
            method: method,
            timestamp: new Date().toISOString(),
            note: 'Webhook callback received'
        });
    }

    // 404 for unknown routes
    return res.status(404).json({
        error: 'API endpoint not found',
        path: path,
        method: method
    });
}
