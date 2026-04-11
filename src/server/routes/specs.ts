import { promises as fs } from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { z } from 'zod';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { HTTP_STATUS } from '../../types/constants';
import { SpecSchema } from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';

const debug = Debug('app:server:routes:specs');

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

router.post('/', validateRequest(SpecSchema), async (req, res) => {
  try {
    const { id, topic, tags, author, timestamp, version, content } = req.body;

    // Validate content field
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Content is required and must be a non-empty string'));
    }
    const newSpec: SpecMetadata = { id, topic, tags, author, timestamp, version };

    const validation = specMetadataSchema.safeParse(newSpec);
    if (!validation.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Invalid spec data'));
    }

    const specDir = path.join(specsDirectory, id, version);
    const resolvedSpecDir = path.resolve(specDir);
    const resolvedSpecsDirectory = path.resolve(specsDirectory);

    if (!resolvedSpecDir.startsWith(resolvedSpecsDirectory + path.sep)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Invalid spec ID or version: Path traversal detected'));
    }

    const index = await getSpecsIndex();
    index.push(newSpec);
    await saveSpecsIndex(index);

    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), content);

    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success(newSpec));
  } catch (error) {
    debug('ERROR:', 'Failed to save spec:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to save specification'));
  }
});

router.get('/', async (req, res) => {
  try {
    const index = await getSpecsIndex();
    return res.json(ApiResponse.success(index));
  } catch (error) {
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve specifications'));
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Invalid spec ID format'));
  }

  const targetPath = path.join(specsDirectory, id);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedSpecsDirectory = path.resolve(specsDirectory);

  if (
    !resolvedTargetPath.startsWith(resolvedSpecsDirectory + path.sep) &&
    resolvedTargetPath !== resolvedSpecsDirectory
  ) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(ApiResponse.error('Invalid spec ID: Path traversal detected'));
  }

  try {
    const index = await getSpecsIndex();
    const spec = index.find((s) => s.id === id);

    if (!spec) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Specification not found'));
    }

    const versions = await fs.readdir(targetPath);
    const specWithVersions = { ...spec, versions };

    return res.json(ApiResponse.success(specWithVersions));
  } catch (error) {
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve specification'));
  }
});

export default router;
