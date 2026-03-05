import { promises as fs } from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const specsDirectory = path.join(process.cwd(), 'specs');

const specMetadataSchema = z.object({
  id: z.string(),
  topic: z.string(),
  tags: z.array(z.string()),
  author: z.string(),
  timestamp: z.string(),
  version: z.string(),
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
  const { id, topic, tags, author, timestamp, version, content } = req.body;
  const newSpec: SpecMetadata = { id, topic, tags, author, timestamp, version };

  try {
    const validation = specMetadataSchema.safeParse(newSpec);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid spec data', details: validation.error.errors });
    }

    const index = await getSpecsIndex();
    index.push(newSpec);
    await saveSpecsIndex(index);

    const specDir = path.join(specsDirectory, id, version);
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), content);

    return res.status(201).json(newSpec);
  } catch (error) {
    console.error('Failed to save spec:', error);
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
  try {
    const index = await getSpecsIndex();
    const spec = index.find((s) => s.id === id);

    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const versions = await fs.readdir(path.join(specsDirectory, id));
    const specWithVersions = { ...spec, versions };

    return res.json(specWithVersions);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve specification' });
  }
});

export default router;
