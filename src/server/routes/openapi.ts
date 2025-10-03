import { Router } from 'express';

const router = Router();

router.get('/api/openapi', (req, res) => {
  const format = String(req.query.format || 'json').toLowerCase();
  const host = req.get('host') ?? 'localhost';
  const baseUrl = `${req.protocol}://${host}`;
  const spec = buildSpec(baseUrl);

  if (format === 'yaml' || format === 'yml') {
    res.type('text/yaml').send(toYaml(spec));
    return;
  }

  res.json(spec);
});

function buildSpec(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Open-Hivemind WebUI API',
      version: '1.0.0',
      description: 'Endpoints used by the Open-Hivemind WebUI for configuration and monitoring.',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Current server',
      },
    ],
    paths: {
      '/webui/api/config': {
        get: {
          summary: 'Get sanitized bot configuration',
          tags: ['Configuration'],
          responses: {
            200: {
              description: 'Configuration payload',
            },
          },
        },
      },
      '/webui/api/config/hot-reload': {
        post: {
          summary: 'Apply configuration changes to a bot',
          tags: ['Configuration'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['create', 'update', 'delete'] },
                    botName: { type: 'string' },
                    changes: { type: 'object' },
                  },
                  required: ['type', 'changes'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Operation result' },
          },
        },
      },
      '/dashboard/api/status': {
        get: {
          summary: 'Get live bot status',
          tags: ['Monitoring'],
          responses: {
            200: { description: 'Status payload' },
          },
        },
      },
      '/dashboard/api/activity': {
        get: {
          summary: 'Get message activity and timelines',
          tags: ['Monitoring'],
          parameters: [
            queryParam('bot', 'Filter by bot name (comma separated).'),
            queryParam('messageProvider', 'Filter by message provider (comma separated).'),
            queryParam('llmProvider', 'Filter by llm provider (comma separated).'),
            queryParam('from', 'ISO datetime start filter.'),
            queryParam('to', 'ISO datetime end filter.'),
          ],
          responses: {
            200: { description: 'Activity data' },
          },
        },
      },
    },
    tags: [
      { name: 'Configuration' },
      { name: 'Monitoring' },
    ],
  };
}

function queryParam(name: string, description: string) {
  return {
    name,
    in: 'query' as const,
    required: false,
    schema: { type: 'string' },
    description,
  };
}

function toYaml(value: unknown, indent = 0): string {
  const padding = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value
      .map(item => {
        const rendered = toYaml(item, indent + 1);
        if (typeof item === 'object' && item !== null) {
          const trimmed = rendered.trimStart();
          return `${padding}- ${trimmed.replace(/\n\s*/, '\n' + '  '.repeat(indent + 1))}`;
        }
        return `${padding}- ${rendered.trim()}`;
      })
      .join('\n');
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    return entries
      .map(([key, val]) => {
        const rendered = toYaml(val, indent + 1);
        if (val && typeof val === 'object') {
          return `${padding}${key}:\n${rendered}`;
        }
        return `${padding}${key}: ${rendered}`;
      })
      .join('\n');
  }

  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('\n') || value.includes('#')) {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  return String(value);
}

export default router;
