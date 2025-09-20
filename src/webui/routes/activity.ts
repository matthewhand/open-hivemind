import { Router } from 'express';
import Debug from 'debug';
import { DatabaseManager } from '../../database/DatabaseManager';

const debug = Debug('app:webui:activity');
const router = Router();

interface ActivityFilter {
  agentId?: string;
  messageProvider?: string;
  llmProvider?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface MessageActivity {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  messageProvider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  userDisplayName: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  mcpToolsUsed?: string[];
}

interface LLMUsageMetric {
  timestamp: string;
  agentId: string;
  llmProvider: string;
  model?: string;
  tokensUsed: number;
  responseTime: number;
  cost?: number;
}

interface ActivitySummary {
  totalMessages: number;
  totalAgents: number;
  averageResponseTime: number;
  errorRate: number;
  messagesByProvider: Record<string, number>;
  messagesByAgent: Record<string, number>;
  llmUsageByProvider: Record<string, number>;
  timeRangeStart: string;
  timeRangeEnd: string;
}

// Helper function to build WHERE clause for filtering
const buildWhereClause = (filter: ActivityFilter): { clause: string; params: any[] } => {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (filter.startDate) {
    conditions.push('timestamp >= ?');
    params.push(filter.startDate);
  }
  
  if (filter.endDate) {
    conditions.push('timestamp <= ?');
    params.push(filter.endDate);
  }
  
  if (filter.messageProvider) {
    conditions.push('provider = ?');
    params.push(filter.messageProvider);
  }
  
  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
};

// GET /api/activity/messages - Get filtered message activity
router.get('/messages', async (req, res) => {
  try {
    const filter: ActivityFilter = {
      agentId: req.query.agentId as string,
      messageProvider: req.query.messageProvider as string,
      llmProvider: req.query.llmProvider as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: parseInt(req.query.limit as string) || 100,
      offset: parseInt(req.query.offset as string) || 0
    };

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Build query with filters
    const { clause, params } = buildWhereClause(filter);
    
    // Mock query - in real implementation, this would query the actual database
    // For now, we'll simulate the response structure
    const messages: MessageActivity[] = [];
    
    // In a real implementation, this would be something like:
    // const query = `
    //   SELECT m.*, a.name as agentName, a.llmProvider 
    //   FROM messages m 
    //   LEFT JOIN agents a ON m.agentId = a.id 
    //   ${clause}
    //   ORDER BY timestamp DESC 
    //   LIMIT ? OFFSET ?
    // `;
    // const messages = await db.all(query, [...params, filter.limit, filter.offset]);

    res.json({ 
      messages,
      total: messages.length,
      filter 
    });
  } catch (error) {
    debug('Error fetching message activity:', error);
    res.status(500).json({ error: 'Failed to fetch message activity' });
  }
});

// GET /api/activity/llm-usage - Get LLM usage metrics
router.get('/llm-usage', async (req, res) => {
  try {
    const filter: ActivityFilter = {
      llmProvider: req.query.llmProvider as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: parseInt(req.query.limit as string) || 100
    };

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Mock LLM usage data
    const usage: LLMUsageMetric[] = [];
    
    res.json({ usage, filter });
  } catch (error) {
    debug('Error fetching LLM usage:', error);
    res.status(500).json({ error: 'Failed to fetch LLM usage' });
  }
});

// GET /api/activity/summary - Get activity summary
router.get('/summary', async (req, res) => {
  try {
    const filter: ActivityFilter = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Get database statistics
    const stats = await dbManager.getStats();
    
    const summary: ActivitySummary = {
      totalMessages: stats.totalMessages,
      totalAgents: stats.totalChannels, // Using channels as proxy for agents
      averageResponseTime: 250, // Mock data
      errorRate: 0.02, // Mock data - 2% error rate
      messagesByProvider: stats.providers,
      messagesByAgent: {}, // Mock data
      llmUsageByProvider: {}, // Mock data
      timeRangeStart: filter.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      timeRangeEnd: filter.endDate || new Date().toISOString()
    };

    res.json({ summary });
  } catch (error) {
    debug('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

// GET /api/activity/chart-data - Get time-series data for charts
router.get('/chart-data', async (req, res) => {
  try {
    const filter: ActivityFilter = {
      messageProvider: req.query.messageProvider as string,
      llmProvider: req.query.llmProvider as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const interval = req.query.interval as string || 'hour'; // hour, day, week
    
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Generate mock time-series data
    const now = new Date();
    const startTime = filter.startDate ? new Date(filter.startDate) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endTime = filter.endDate ? new Date(filter.endDate) : now;
    
    const messageActivityData: Array<{ timestamp: string; count: number; provider?: string }> = [];
    const llmUsageData: Array<{ timestamp: string; usage: number; provider?: string; responseTime: number }> = [];
    
    // Generate hourly data points
    const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
      const timestamp = new Date(time).toISOString();
      
      // Mock message activity data
      messageActivityData.push({
        timestamp,
        count: Math.floor(Math.random() * 50) + 10,
        provider: filter.messageProvider
      });
      
      // Mock LLM usage data
      llmUsageData.push({
        timestamp,
        usage: Math.floor(Math.random() * 100) + 20,
        provider: filter.llmProvider,
        responseTime: Math.floor(Math.random() * 1000) + 200
      });
    }

    res.json({
      messageActivity: messageActivityData,
      llmUsage: llmUsageData,
      interval,
      filter
    });
  } catch (error) {
    debug('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// GET /api/activity/agents - Get agent activity statistics
router.get('/agents', async (req, res) => {
  try {
    const filter: ActivityFilter = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Mock agent activity data
    const agentActivity = [
      {
        agentId: 'agent_1',
        agentName: 'Discord Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        totalMessages: 245,
        averageResponseTime: 320,
        errorRate: 0.01,
        lastActive: new Date().toISOString(),
        status: 'active'
      },
      {
        agentId: 'agent_2',
        agentName: 'Slack Assistant',
        messageProvider: 'slack',
        llmProvider: 'openai',
        totalMessages: 156,
        averageResponseTime: 280,
        errorRate: 0.03,
        lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'active'
      }
    ];

    res.json({ agents: agentActivity, filter });
  } catch (error) {
    debug('Error fetching agent activity:', error);
    res.status(500).json({ error: 'Failed to fetch agent activity' });
  }
});

// GET /api/activity/mcp-tools - Get MCP tool usage statistics
router.get('/mcp-tools', async (req, res) => {
  try {
    const filter: ActivityFilter = {
      agentId: req.query.agentId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    // Mock MCP tool usage data
    const mcpToolUsage = [
      {
        toolName: 'web_search',
        serverName: 'web-tools',
        usageCount: 45,
        averageExecutionTime: 1200,
        successRate: 0.96,
        lastUsed: new Date().toISOString()
      },
      {
        toolName: 'file_read',
        serverName: 'filesystem',
        usageCount: 23,
        averageExecutionTime: 150,
        successRate: 0.99,
        lastUsed: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      }
    ];

    res.json({ mcpTools: mcpToolUsage, filter });
  } catch (error) {
    debug('Error fetching MCP tool usage:', error);
    res.status(500).json({ error: 'Failed to fetch MCP tool usage' });
  }
});

// POST /api/activity/log - Log a new activity event (for internal use)
router.post('/log', async (req, res) => {
  try {
    const {
      agentId,
      messageProvider,
      llmProvider,
      messageType,
      contentLength,
      processingTime,
      status,
      errorMessage,
      mcpToolsUsed
    } = req.body;

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // In a real implementation, this would log to the database
    debug('Activity logged:', {
      agentId,
      messageProvider,
      llmProvider,
      messageType,
      status
    });

    res.json({ success: true });
  } catch (error) {
    debug('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

export default router;