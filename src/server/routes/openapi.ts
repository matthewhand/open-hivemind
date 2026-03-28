import * as fs from 'fs';
import * as path from 'path';
import { Router } from 'express';

const router = Router();

function loadSpec(): Record<string, unknown> {
  const schemaPath = path.join(__dirname, '../schemas/openapi.json');
  const content = fs.readFileSync(schemaPath, 'utf8');
  return JSON.parse(content) as Record<string, unknown>;
}

router.get(['/openapi', '/openapi.json', '/openapi.yaml', '/openapi.yml'], (req, res) => {
  let format = String(req.query.format || 'json').toLowerCase();
  const path = req.path.toLowerCase();

  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    format = 'yaml';
  }

  const host = req.get('host') ?? 'localhost';
  const baseUrl = `${req.protocol}://${host}`;

  try {
    const spec = loadSpec();

    // Update servers to current host
    spec.servers = [
      {
        url: baseUrl,
        description: 'Current server',
      },
    ];

    if (format === 'yaml' || format === 'yml') {
      res.type('text/yaml').send(toYaml(spec));
      return;
    }

    res.json(spec);
  } catch {
    res.status(500).json({ error: 'Failed to load OpenAPI specification' });
  }
});

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
