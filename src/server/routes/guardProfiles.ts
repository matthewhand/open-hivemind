import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { authenticate, requireAdmin } from '../../auth/middleware';
import {
  loadGuardrailProfiles,
  saveGuardrailProfiles,
  type GuardrailProfile,
} from '../../config/guardrailProfiles';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../types/constants';
import {
  BulkDeleteGuardProfilesSchema,
  BulkToggleGuardProfilesSchema,
  CreateGuardProfileSchema,
  GuardProfileIdParamSchema,
  UpdateGuardProfileSchema,
} from '../../validation/schemas/guardProfilesSchema';
import { validateRequest } from '../../validation/validateRequest';

const router = Router();

// Apply authentication middleware to all routes
// Note: Assuming 'authenticate' and 'requireAdmin' are available and work as expected
// Similar to admin.ts usage
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
  router.use(authenticate, requireAdmin);
}

// GET / - List all profiles
router.get(
  '/',
  asyncErrorHandler(async (req, res) => {
    try {
      const profiles = loadGuardrailProfiles();
      return res.json(ApiResponse.success(profiles));
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to load guardrail profiles'));
    }
  })
);

// GET /:id - Get a specific profile
router.get(
  '/:id',
  validateRequest(GuardProfileIdParamSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const profiles = loadGuardrailProfiles();
      const profile = profiles.find((p) => p.id === id);

      if (!profile) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Profile not found'));
      }

      return res.json(ApiResponse.success(profile));
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to retrieve profile'));
    }
  })
);

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
router.post(
  '/',
  validateRequest(CreateGuardProfileSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { name, description, guards } = req.body as GuardBody;

      const profiles = loadGuardrailProfiles();

      // Idempotency check: see if profile with same name already exists
      const existingProfile = profiles.find((p) => p.name === name);
      if (existingProfile) {
        return res.status(HTTP_STATUS.OK).json(ApiResponse.success(existingProfile));
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

      return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success(newProfile));
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to create guard profile'));
    }
  })
);

// PUT /:id - Update a profile
router.put(
  '/:id',
  validateRequest(UpdateGuardProfileSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, guards } = req.body as Partial<GuardBody>;

      const profiles = loadGuardrailProfiles();
      const profileIndex = profiles.findIndex((p) => p.id === id);

      if (profileIndex === -1) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Profile not found'));
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
                    acc[key] = { ...existingValue, ...newValue };
                  } else {
                    acc[key] = newValue;
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
        guards: safeGuards as (typeof profiles)[typeof profileIndex]['guards'],
      };

      profiles[profileIndex] = updatedProfile;
      saveGuardrailProfiles(profiles);

      return res.json(ApiResponse.success(updatedProfile));
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update guard profile'));
    }
  })
);

// DELETE /:id - Delete a profile
router.delete(
  '/:id',
  validateRequest(GuardProfileIdParamSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const profiles = loadGuardrailProfiles();
      const profileExists = profiles.some((p) => p.id === id);

      if (!profileExists) {
        return res.status(HTTP_STATUS.OK).json(ApiResponse.success());
      }

      const filteredProfiles = profiles.filter((p) => p.id !== id);
      saveGuardrailProfiles(filteredProfiles);

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to delete guard profile'));
    }
  })
);

// POST /bulk/delete - Delete multiple profiles atomically
router.post(
  '/bulk/delete',
  validateRequest(BulkDeleteGuardProfilesSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { ids } = req.body as { ids: string[] };
      const profiles = loadGuardrailProfiles();

      // Filter out profiles with matching IDs
      const filteredProfiles = profiles.filter((p) => !ids.includes(p.id));
      const deletedCount = profiles.length - filteredProfiles.length;

      // Save atomically
      saveGuardrailProfiles(filteredProfiles);

      return res.json(
        ApiResponse.success({
          deletedCount,
          requestedCount: ids.length,
        })
      );
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to delete guard profiles'));
    }
  })
);

// POST /bulk/toggle - Toggle multiple profiles atomically
router.post(
  '/bulk/toggle',
  validateRequest(BulkToggleGuardProfilesSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { ids, enabled } = req.body as { ids: string[]; enabled: boolean };
      const profiles = loadGuardrailProfiles();

      let updatedCount = 0;

      // Update all matching profiles
      const updatedProfiles = profiles.map((profile) => {
        if (ids.includes(profile.id)) {
          updatedCount++;
          return {
            ...profile,
            guards: {
              ...profile.guards,
              mcpGuard: profile.guards.mcpGuard
                ? { ...profile.guards.mcpGuard, enabled }
                : profile.guards.mcpGuard,
              rateLimit: profile.guards.rateLimit
                ? { ...profile.guards.rateLimit, enabled }
                : profile.guards.rateLimit,
              contentFilter: profile.guards.contentFilter
                ? { ...profile.guards.contentFilter, enabled }
                : profile.guards.contentFilter,
            },
          };
        }
        return profile;
      });

      // Save atomically
      saveGuardrailProfiles(updatedProfiles);

      return res.json(
        ApiResponse.success({
          updatedCount,
          requestedCount: ids.length,
          enabled,
        })
      );
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to toggle guard profiles'));
    }
  })
);

export default router;
