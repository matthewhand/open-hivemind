import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

/**
 * GET /api/letta/agents - List available Letta agents
 * This endpoint proxies the request to Letta API using the provided credentials
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    // Get credentials from query params or headers
    const apiKey = req.headers['x-letta-api-key'] as string || req.query.apiKey as string;
    const apiUrl = (req.headers['x-letta-api-url'] as string) || 
                   (req.query.apiUrl as string) || 
                   'https://api.letta.com/v1';

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Missing API key',
        message: 'Please provide Letta API key via x-letta-api-key header or apiKey query parameter'
      });
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    
    const response = await axios.get(`${baseUrl}/agents`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Return simplified agent list
    const agents = response.data.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
    }));

    return res.json(agents);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      return res.status(status).json({
        error: 'Letta API Error',
        message,
        details: error.response?.data,
      });
    }
    
    console.error('Letta agents lookup error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch agents from Letta API',
    });
  }
});

/**
 * GET /api/letta/agents/:id - Get a specific agent details
 */
router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = req.headers['x-letta-api-key'] as string || req.query.apiKey as string;
    const apiUrl = (req.headers['x-letta-api-url'] as string) || 
                   (req.query.apiUrl as string) || 
                   'https://api.letta.com/v1';

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Missing API key',
        message: 'Please provide Letta API key via x-letta-api-key header or apiKey query parameter'
      });
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    
    const response = await axios.get(`${baseUrl}/agents/${id}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      return res.status(status).json({
        error: 'Letta API Error',
        message,
      });
    }
    
    console.error('Letta agent details error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch agent details from Letta API',
    });
  }
});

export default router;
