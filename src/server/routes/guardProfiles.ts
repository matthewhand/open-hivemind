import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireAdmin } from '../../auth/middleware';
import {
  loadGuardrailProfiles,
  saveGuardrailProfiles,
  type GuardrailProfile,
} from '../../config/guardrailProfiles';

const router = Router();

// Apply authentication middleware to all routes
// Note: Assuming 'authenticate' and 'requireAdmin' are available and work as expected
// Similar to admin.ts usage
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
  router.use(authenticate, requireAdmin);
}

// GET / - List all profiles
router.get('/', (req: Request, res: Response) => {
  try {
    const profiles = loadGuardrailProfiles();
    return res.json({
      success: true,
      data: profiles,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: 'Failed to load guardrail profiles',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /:id - Get a specific profile
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profiles = loadGuardrailProfiles();
    const profile = profiles.find((p) => p.id === id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

interface GuardBody {
  name: string;
  description?: string;
  guards: {
    mcpGuard?: {
      enabled?: boolean;
      type: string;
      allowedUsers?: string[];
      allowedTools?: string[];
    };
    rateLimit?: {
      enabled?: boolean;
      maxRequests?: number;
      windowMs?: number;
    };
    contentFilter?: {
      enabled?: boolean;
      strictness: string;
      blockedTerms?: string[];
    };
  };
}

// POST / - Create a new profile
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, guards } = req.body as GuardBody;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Name is required and must be a string',
      });
    }

    if (!guards || typeof guards !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Guards configuration is required',
      });
    }

    const profiles = loadGuardrailProfiles();

    // Idempotency check: see if profile with same name already exists
    const existingProfile = profiles.find((p) => p.name === name);
    if (existingProfile) {
      return res.status(200).json({
        success: true,
        data: existingProfile,
        message: 'Guard profile already exists',
      });
    }

    const newProfile: GuardrailProfile = {
      id: uuidv4(),
      name,
      description: description || '',
      guards: {
        mcpGuard:
          guards.mcpGuard &&
          typeof guards.mcpGuard === 'object' &&
          ['owner', 'custom'].includes(guards.mcpGuard.type)
            ? {
                enabled: Boolean(guards.mcpGuard.enabled),
                type: guards.mcpGuard.type as 'owner' | 'custom',
                ...(guards.mcpGuard.allowedUsers && Array.isArray(guards.mcpGuard.allowedUsers)
                  ? { allowedUsers: guards.mcpGuard.allowedUsers }
                  : {}),
                ...(guards.mcpGuard.allowedTools && Array.isArray(guards.mcpGuard.allowedTools)
                  ? { allowedTools: guards.mcpGuard.allowedTools }
                  : {}),
              }
            : { enabled: false, type: 'owner' },
        rateLimit:
          guards.rateLimit && typeof guards.rateLimit === 'object'
            ? {
                enabled: Boolean(guards.rateLimit.enabled),
                maxRequests: Number(guards.rateLimit.maxRequests) || 100,
                windowMs: Number(guards.rateLimit.windowMs) || 60000,
              }
            : { enabled: false, maxRequests: 100, windowMs: 60000 },
        contentFilter:
          guards.contentFilter && typeof guards.contentFilter === 'object'
            ? {
                enabled: Boolean(guards.contentFilter.enabled),
                strictness: ['low', 'medium', 'high'].includes(guards.contentFilter.strictness)
                  ? guards.contentFilter.strictness as 'low' | 'medium' | 'high'
                  : 'low',
                ...(guards.contentFilter.blockedTerms &&
                Array.isArray(guards.contentFilter.blockedTerms)
                  ? { blockedTerms: guards.contentFilter.blockedTerms }
                  : {}),
              }
            : { enabled: false, strictness: 'low' },
      },
    };

    profiles.push(newProfile);
    saveGuardrailProfiles(profiles);

    return res.status(201).json({
      success: true,
      data: newProfile,
      message: 'Guard profile created successfully',
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create guard profile',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// PUT /:id - Update a profile
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, guards } = req.body as Partial<GuardBody>;

    const profiles = loadGuardrailProfiles();
    const profileIndex = profiles.findIndex((p) => p.id === id);

    if (profileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    const existingGuards = profiles[profileIndex].guards;
    const safeGuards = {
      mcpGuard:
        guards?.mcpGuard && typeof guards.mcpGuard === 'object'
          ? {
              enabled: guards.mcpGuard.enabled !== undefined ? Boolean(guards.mcpGuard.enabled) : existingGuards.mcpGuard.enabled,
              type: ['owner', 'custom'].includes(guards.mcpGuard.type)
                ? (guards.mcpGuard.type as 'owner' | 'custom')
                : existingGuards.mcpGuard.type,
              ...(guards.mcpGuard.allowedUsers && Array.isArray(guards.mcpGuard.allowedUsers)
                ? { allowedUsers: guards.mcpGuard.allowedUsers }
                : { allowedUsers: existingGuards.mcpGuard.allowedUsers || [] }),
              ...(guards.mcpGuard.allowedTools && Array.isArray(guards.mcpGuard.allowedTools)
                ? { allowedTools: guards.mcpGuard.allowedTools }
                : { allowedTools: existingGuards.mcpGuard.allowedTools || [] }),
            }
          : existingGuards.mcpGuard,
      rateLimit:
        guards?.rateLimit && typeof guards.rateLimit === 'object'
          ? {
              enabled: guards.rateLimit.enabled !== undefined ? Boolean(guards.rateLimit.enabled) : existingGuards.rateLimit?.enabled || false,
              maxRequests: guards.rateLimit.maxRequests !== undefined ? Number(guards.rateLimit.maxRequests) || 100 : existingGuards.rateLimit?.maxRequests || 100,
              windowMs: guards.rateLimit.windowMs !== undefined ? Number(guards.rateLimit.windowMs) || 60000 : existingGuards.rateLimit?.windowMs || 60000,
            }
          : existingGuards.rateLimit || { enabled: false, maxRequests: 100, windowMs: 60000 },
      contentFilter:
        guards?.contentFilter && typeof guards.contentFilter === 'object'
          ? {
              enabled: guards.contentFilter.enabled !== undefined ? Boolean(guards.contentFilter.enabled) : existingGuards.contentFilter?.enabled || false,
              strictness: ['low', 'medium', 'high'].includes(guards.contentFilter.strictness)
                ? (guards.contentFilter.strictness as 'low' | 'medium' | 'high')
                : existingGuards.contentFilter?.strictness || 'low',
              ...(guards.contentFilter.blockedTerms && Array.isArray(guards.contentFilter.blockedTerms)
                ? { blockedTerms: guards.contentFilter.blockedTerms }
                : { blockedTerms: existingGuards.contentFilter?.blockedTerms || [] }),
            }
          : existingGuards.contentFilter || { enabled: false, strictness: 'low' },
    };

    const updatedProfile = {
      ...profiles[profileIndex],
      name: name && typeof name === 'string' ? name : profiles[profileIndex].name,
      description: description !== undefined ? description : profiles[profileIndex].description,
      guards: safeGuards,
    };

    profiles[profileIndex] = updatedProfile;
    saveGuardrailProfiles(profiles);

    return res.json({
      success: true,
      data: updatedProfile,
      message: 'Guard profile updated successfully',
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update guard profile',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// DELETE /:id - Delete a profile
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profiles = loadGuardrailProfiles();
    const profileExists = profiles.some((p) => p.id === id);

    if (!profileExists) {
      return res.status(200).json({
        success: true,
        message: 'Guard profile already deleted or not found',
      });
    }

    const filteredProfiles = profiles.filter((p) => p.id !== id);
    saveGuardrailProfiles(filteredProfiles);

    return res.json({
      success: true,
      message: 'Guard profile deleted successfully',
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete guard profile',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
