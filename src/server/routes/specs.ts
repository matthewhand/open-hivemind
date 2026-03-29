import { promises as fs } from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

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

    // Validate content field
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return ApiResponse.error(res, 'Content is required and must be a non-empty string', 400, undefined, { message: 'Validation failed' });
    }
    const newSpec: SpecMetadata = { id, topic, tags, author, timestamp, version };

    const validation = specMetadataSchema.safeParse(newSpec);
    if (!validation.success) {
      return ApiResponse.error(res, 'Invalid spec data', 400, undefined, { message: 'Validation failed' });
    }

    const specDir = path.join(specsDirectory, id, version);
    const resolvedSpecDir = path.resolve(specDir);
    const resolvedSpecsDirectory = path.resolve(specsDirectory);

    if (!resolvedSpecDir.startsWith(resolvedSpecsDirectory + path.sep)) {
      return ApiResponse.error(res, 'Invalid spec ID or version: Path traversal detected', 400);
    }

    const index = await getSpecsIndex();
    index.push(newSpec);
    await saveSpecsIndex(index);

    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), content);

    return ApiResponse.success(res, newSpec, 201, { message: 'Specification saved successfully' });
  } catch (error) {
    console.error('Failed to save spec:', error);
    return ApiResponse.error(res, 'Failed to save specification', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/', async (req, res) => {
  try {
    const index = await getSpecsIndex();
    return res.json({ success: true, data: index });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to retrieve specifications', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return ApiResponse.error(res, 'Invalid spec ID format', 400);
  }

  const targetPath = path.join(specsDirectory, id);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedSpecsDirectory = path.resolve(specsDirectory);

  if (
    !resolvedTargetPath.startsWith(resolvedSpecsDirectory + path.sep) &&
    resolvedTargetPath !== resolvedSpecsDirectory
  ) {
    return ApiResponse.error(res, 'Invalid spec ID: Path traversal detected', 400);
  }

  try {
    const index = await getSpecsIndex();
    const spec = index.find((s) => s.id === id);

    if (!spec) {
      return ApiResponse.error(res, 'Specification not found', 404);
    }

    const versions = await fs.readdir(targetPath);
    const specWithVersions = { ...spec, versions };

    return res.json({ success: true, data: specWithVersions });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to retrieve specification', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
