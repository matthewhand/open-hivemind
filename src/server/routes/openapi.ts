import { Router } from 'express';

const router = Router();

router.get(['/openapi', '/openapi.json', '/openapi.yaml', '/openapi.yml'], (req, res) => {
  let format = String(req.query.format || 'json').toLowerCase();
  const path = req.path.toLowerCase();

  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    format = 'yaml';
  }

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
      description:
        'Endpoints used by the Open-Hivemind WebUI for configuration, monitoring, agents, MCP servers, and authentication.',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Current server',
      },
    ],
    paths: {
      ...require('../schemas/config.schema.json'),
      ...require('../schemas/monitoring.schema.json'),
      ...require('../schemas/auth.schema.json'),
      ...require('../schemas/agents.schema.json'),
      ...require('../schemas/mcp.schema.json'),
      ...require('../schemas/activity.schema.json'),
      ...require('../schemas/admin.schema.json'),
    },
    tags: [
      { name: 'Configuration' },
      { name: 'Monitoring' },
      { name: 'Authentication' },
      { name: 'Agents' },
      { name: 'MCP' },
      { name: 'Activity' },
      { name: 'Admin' },
    ],
  };
}

function toYaml(value: unknown, indent = 0): string {
  const padding = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value
      .map((item) => {
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
