import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireAdmin } from '../../auth/middleware';
import {
  loadGuardrailProfiles,
  saveGuardrailProfiles,
  type GuardrailProfile,
} from '../../config/guardrailProfiles';
import {
  CreateGuardProfileSchema,
  GuardProfileIdParamSchema,
  UpdateGuardProfileSchema,
} from '../../validation/schemas/guardProfilesSchema';
import { validateRequest } from '../../validation/validateRequest';
import { ApiResponse } from "../utils/ApiResponse";

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
    return ApiResponse.error(res, 'Failed to load guardrail profiles', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
  }
});

// GET /:id - Get a specific profile
router.get('/:id', validateRequest(GuardProfileIdParamSchema), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profiles = loadGuardrailProfiles();
    const profile = profiles.find((p) => p.id === id);

    if (!profile) {
      return ApiResponse.error(res, 'Profile not found', 404);
    }

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error: unknown) {
    return ApiResponse.error(res, 'Failed to retrieve profile', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
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
router.post('/', validateRequest(CreateGuardProfileSchema), (req: Request, res: Response) => {
  try {
    const { name, description, guards } = req.body as GuardBody;

    const profiles = loadGuardrailProfiles();

    // Idempotency check: see if profile with same name already exists
    const existingProfile = profiles.find((p) => p.name === name);
    if (existingProfile) {
      return ApiResponse.success(res, existingProfile, 200, { message: 'Guard profile already exists' });
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
                  ? (guards.contentFilter.strictness as 'low' | 'medium' | 'high')
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

    return ApiResponse.success(res, newProfile, 201, { message: 'Guard profile created successfully' });
  } catch (error: unknown) {
    return ApiResponse.error(res, 'Failed to create guard profile', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
  }
});

// PUT /:id - Update a profile
router.put('/:id', validateRequest(UpdateGuardProfileSchema), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, guards } = req.body as Partial<GuardBody>;

    const profiles = loadGuardrailProfiles();
    const profileIndex = profiles.findIndex((p) => p.id === id);

    if (profileIndex === -1) {
      return ApiResponse.error(res, 'Profile not found', 404);
    }

    // Merge updates with validation to prevent prototype pollution
    const safeGuards =
      guards && typeof guards === 'object'
        ? (Object.keys(guards) as Array<keyof typeof guards>)
            .filter((key) => !['__proto__', 'constructor', 'prototype'].includes(key))
            .reduce(
              (acc, key) => {
                const existingValue =
                  profiles[profileIndex].guards[
                    key as keyof (typeof profiles)[typeof profileIndex]['guards']
                  ];
                const newValue = guards[key as keyof typeof guards];
                if (
                  typeof newValue === 'object' &&
                  newValue !== null &&
                  typeof existingValue === 'object' &&
                  existingValue !== null
                ) {
                  (acc as any)[key] = { ...existingValue, ...newValue };
                } else {
                  (acc as any)[key] = newValue;
                }
                return acc;
              },
              {} as Record<string, unknown>
            )
        : profiles[profileIndex].guards;

    const updatedProfile = {
      ...profiles[profileIndex],
      name: name && typeof name === 'string' ? name : profiles[profileIndex].name,
      description: description !== undefined ? description : profiles[profileIndex].description,
      guards: safeGuards as any,
    };

    profiles[profileIndex] = updatedProfile;
    saveGuardrailProfiles(profiles);

    return res.json({
      success: true,
      data: updatedProfile,
      message: 'Guard profile updated successfully',
    });
  } catch (error: unknown) {
    return ApiResponse.error(res, 'Failed to update guard profile', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /:id - Delete a profile
router.delete('/:id', validateRequest(GuardProfileIdParamSchema), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profiles = loadGuardrailProfiles();
    const profileExists = profiles.some((p) => p.id === id);

    if (!profileExists) {
      return ApiResponse.success(res, undefined, 200, { message: 'Guard profile already deleted or not found' });
    }

    const filteredProfiles = profiles.filter((p) => p.id !== id);
    saveGuardrailProfiles(filteredProfiles);

    return res.json({
      success: true,
      message: 'Guard profile deleted successfully',
    });
  } catch (error: unknown) {
    return ApiResponse.error(res, 'Failed to delete guard profile', 500, undefined, { message: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
