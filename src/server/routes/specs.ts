import { promises as fs } from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { createLogger, toError } from '@src/common/StructuredLogger';

const router = Router();
const logger = createLogger('routes:specs');

const specsDirectory = path.join(process.cwd(), 'specs');

const specMetadataSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format'),
  topic: z.string(),
  tags: z.array(z.string()),
  author: z.string(),
  timestamp: z.string(),
  version: z.string().regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid version format'),
});

type SpecMetadata = z.infer<typeof specMetadataSchema>;

async function getSpecsIndex(): Promise<SpecMetadata[]> {
  try {
    const indexPath = path.join(specsDirectory, 'index.json');
    const data = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveSpecsIndex(index: SpecMetadata[]) {
  const indexPath = path.join(specsDirectory, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

router.post('/', async (req, res) => {
  try {
    const { id, topic, tags, author, timestamp, version, content } = req.body;
    const newSpec: SpecMetadata = { id, topic, tags, author, timestamp, version };

    const validation = specMetadataSchema.safeParse(newSpec);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid spec data', details: validation.error.errors });
    }

    const specDir = path.join(specsDirectory, id, version);
    const resolvedSpecDir = path.resolve(specDir);
    const resolvedSpecsDirectory = path.resolve(specsDirectory);

    if (!resolvedSpecDir.startsWith(resolvedSpecsDirectory + path.sep)) {
      return res.status(400).json({ error: 'Invalid spec ID or version: Path traversal detected' });
    }

    const index = await getSpecsIndex();
    index.push(newSpec);
    await saveSpecsIndex(index);

    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), content);

    return res.status(201).json(newSpec);
  } catch (error) {
    logger.error('Failed to save spec:', toError(error));
    return res.status(500).json({ error: 'Failed to save specification' });
  }
});

router.get('/', async (req, res) => {
  try {
    const index = await getSpecsIndex();
    return res.json(index);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve specifications' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid spec ID format' });
  }

  const targetPath = path.join(specsDirectory, id);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedSpecsDirectory = path.resolve(specsDirectory);

  if (
    !resolvedTargetPath.startsWith(resolvedSpecsDirectory + path.sep) &&
    resolvedTargetPath !== resolvedSpecsDirectory
  ) {
    return res.status(400).json({ error: 'Invalid spec ID: Path traversal detected' });
  }

  try {
    const index = await getSpecsIndex();
    const spec = index.find((s) => s.id === id);

    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const versions = await fs.readdir(targetPath);
    const specWithVersions = { ...spec, versions };

    return res.json(specWithVersions);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve specification' });
  }
});

export default router;
