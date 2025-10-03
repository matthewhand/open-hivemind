/* eslint-disable */
/* tslint:disable */

/**
 * Mock Service Worker.
 * @see https://github.com/mswjs/msw
 *     - https://mswjs.io/docs/api/setup-worker/start
 */

// This is the generated service worker file for MSW.
// It will intercept network requests in the browser during development and testing.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

const cacheName = 'msw-cache'
const pendingRequests = new Map()

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle API requests
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/webui/api/') && !url.pathname.startsWith('/dashboard/api/') && !url.pathname.startsWith('/health/')) {
    return
  }

  // Handle different request methods
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request))
  } else if (request.method === 'POST') {
    event.respondWith(handlePostRequest(request))
  } else if (request.method === 'PUT') {
    event.respondWith(handlePutRequest(request))
  } else if (request.method === 'DELETE') {
    event.respondWith(handleDeleteRequest(request))
  }
})

async function handleGetRequest(request) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const search = url.search

  // Mock responses for different endpoints
  if (pathname === '/webui/api/config') {
    return new Response(JSON.stringify({
      bots: [
        {
          name: 'test-bot-1',
          messageProvider: 'discord',
          llmProvider: 'openai',
          persona: 'default',
          systemInstruction: 'You are a helpful assistant',
          mcpServers: [],
          mcpGuard: { enabled: false, type: 'owner' }
        },
        {
          name: 'test-bot-2',
          messageProvider: 'slack',
          llmProvider: 'openai',
          persona: 'support',
          systemInstruction: 'You are a support assistant',
          mcpServers: [],
          mcpGuard: { enabled: true, type: 'custom', allowedUserIds: ['user123'] }
        }
      ],
      warnings: [],
      legacyMode: false,
      environment: 'development'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (pathname === '/dashboard/api/status') {
    return new Response(JSON.stringify({
      bots: [
        {
          name: 'test-bot-1',
          provider: 'discord',
          llmProvider: 'openai',
          status: 'online',
          connected: true,
          messageCount: 150,
          errorCount: 2
        },
        {
          name: 'test-bot-2',
          provider: 'slack',
          llmProvider: 'openai',
          status: 'offline',
          connected: false,
          messageCount: 85,
          errorCount: 5
        }
      ],
      uptime: 3600
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (pathname === '/dashboard/api/activity') {
    return new Response(JSON.stringify({
      events: [
        {
          id: 'event-1',
          timestamp: '2024-01-01T10:00:00Z',
          botName: 'test-bot-1',
          provider: 'discord',
          llmProvider: 'openai',
          channelId: 'channel-1',
          userId: 'user-1',
          messageType: 'incoming',
          contentLength: 50,
          processingTime: 120,
          status: 'success'
        }
      ],
      filters: {
        agents: ['test-bot-1', 'test-bot-2'],
        messageProviders: ['discord', 'slack'],
        llmProviders: ['openai']
      },
      timeline: [
        {
          timestamp: '2024-01-01T10:00:00Z',
          messageProviders: { discord: 10, slack: 5 },
          llmProviders: { openai: 15 }
        }
      ],
      agentMetrics: [
        {
          botName: 'test-bot-1',
          messageProvider: 'discord',
          llmProvider: 'openai',
          events: 150,
          errors: 2,
          lastActivity: '2024-01-01T10:00:00Z',
          totalMessages: 148,
          recentErrors: []
        }
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (pathname === '/health/api-endpoints') {
    return new Response(JSON.stringify({
      overall: {
        status: 'healthy',
        message: 'All endpoints are responding normally',
        stats: {
          total: 5,
          online: 4,
          slow: 1,
          offline: 0,
          error: 0
        }
      },
      endpoints: [
        {
          id: 'health-check',
          name: 'Health Check',
          url: '/health',
          status: 'online',
          responseTime: 50,
          lastChecked: new Date().toISOString(),
          lastSuccessfulCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          totalChecks: 100,
          successfulChecks: 98,
          averageResponseTime: 45,
          statusCode: 200
        }
      ],
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Default response for unhandled GET requests
  return new Response(JSON.stringify({ message: 'Mock response' }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handlePostRequest(request) {
  const pathname = new URL(request.url).pathname

  if (pathname === '/webui/api/bots') {
    return new Response(JSON.stringify({
      success: true,
      message: 'Bot created successfully',
      bot: {
        name: 'new-test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        persona: 'default',
        systemInstruction: 'You are a helpful assistant',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner' }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (pathname === '/webui/api/config/hot-reload') {
    return new Response(JSON.stringify({
      success: true,
      message: 'Configuration applied successfully',
      affectedBots: ['test-bot-1'],
      warnings: [],
      errors: []
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Default response for unhandled POST requests
  return new Response(JSON.stringify({ success: true, message: 'Mock POST response' }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handlePutRequest(request) {
  const pathname = new URL(request.url).pathname

  if (pathname.startsWith('/webui/api/bots/')) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Bot updated successfully',
      bot: {
        name: 'updated-test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        persona: 'default',
        systemInstruction: 'You are a helpful assistant',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner' }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Default response for unhandled PUT requests
  return new Response(JSON.stringify({ success: true, message: 'Mock PUT response' }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleDeleteRequest(request) {
  const pathname = new URL(request.url).pathname

  if (pathname.startsWith('/webui/api/bots/')) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Bot deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Default response for unhandled DELETE requests
  return new Response(JSON.stringify({ success: true, message: 'Mock DELETE response' }), {
    headers: { 'Content-Type': 'application/json' }
  })
}