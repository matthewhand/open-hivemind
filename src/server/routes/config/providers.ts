/* eslint-disable max-lines */
 
import { Router } from 'express';
import type { Response } from 'express';
import { getLlmDefaultStatus } from '../../../config/llmDefaultStatus';
import { getLlmProfiles, saveLlmProfiles } from '../../../config/llmProfiles';
import { getMessageProfiles, saveMessageProfiles } from '../../../config/messageProfiles';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import { sanitizeProfiles } from '../../utils/sanitizeConfig';
import {
  CreateLlmProfileSchema,
  CreateMemoryProfileSchema,
  CreateMessageProfileSchema,
  CreateResponseProfileSchema,
  CreateToolProfileSchema,
  LlmProfileKeyParamSchema,
  MemoryProfileKeyParamSchema,
  MessageProfileKeyParamSchema,
  ResponseProfileKeyParamSchema,
  ToolProfileKeyParamSchema,
  UpdateLlmProfileSchema,
  UpdateMessageProfileSchema,
  UpdateResponseProfileSchema,
} from '../../../validation/schemas/configProfilesSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { ApiResponse } from '../../utils/apiResponse';
import { configLimiter } from '../../../middleware/rateLimiter';
import { broadcastConfigUpdate } from './utils';

const router = Router();

/** Profiles defined via environment variables are read-only through the API. */
function isEnvProfile(profile: unknown): boolean {
  return !!profile && typeof profile === 'object' && (profile as { source?: string }).source === 'env';
}

function envProfileReadonlyResponse(res: Response, kind: string, key: string) {
  return res
    .status(HTTP_STATUS.FORBIDDEN)
    .json(
      ApiResponse.error(
        `${kind} profile '${key}' is defined via environment variables and is read-only`,
        'ENV_PROFILE_READONLY',
        403
      )
    );
}

// GET /api/config/llm-status - Get LLM configuration status
router.get('/llm-status', (req, res) => {
  try {
    const status = getLlmDefaultStatus();
    return res.json(status);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'LLM_STATUS_GET_ERROR',
          statusCode
        )
      );
  }
});

// GET /api/config/llm-profiles - List all LLM profiles
router.get('/llm-profiles', (req, res) => {
  try {
    const profiles = getLlmProfiles();
    return res.json({ ...profiles, llm: sanitizeProfiles(profiles.llm) });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'LLM_PROFILES_GET_ERROR',
          statusCode
        )
      );
  }
});

router.post('/llm-profiles', configLimiter, validateRequest(CreateLlmProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;

    const modelType = newProfile.modelType || 'chat';
    if (!['chat', 'embedding', 'both'].includes(modelType)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.error(
            `Invalid modelType '${modelType}'. Must be one of: chat, embedding, both`,
            'INVALID_REQUEST',
            400
          )
        );
    }

    const profiles = getLlmProfiles();
    const existing = profiles.llm.find((p) => p.key.toLowerCase() === newProfile.key.toLowerCase());
    if (existing) {
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            isEnvProfile(existing)
              ? `LLM profile with key '${newProfile.key}' is defined via environment variables`
              : `LLM profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    }

    // 'source' is system-managed; never accept it from clients.
    delete newProfile.source;
    const sanitizedProfile = {
      ...newProfile,
      modelType,
    };

    profiles.llm.push(sanitizedProfile);
    saveLlmProfiles(profiles);

    broadcastConfigUpdate('llm-profiles', 'create', sanitizedProfile.key);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: sanitizedProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'LLM_PROFILE_CREATE_ERROR',
          statusCode
        )
      );
  }
});

// PUT /api/config/llm-profiles/:key - Update an LLM profile
router.put('/llm-profiles/:key', configLimiter, validateRequest(UpdateLlmProfileSchema), (req, res) => {
  try {
    const { key } = req.params;
    const updates = req.body;

    const profiles = getLlmProfiles();
    const normalizedKey = key.toLowerCase();
    const index = profiles.llm.findIndex((p) => p.key.toLowerCase() === normalizedKey);

    if (index === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`LLM profile with key '${key}' not found`, undefined, 404));
    }
    if (isEnvProfile(profiles.llm[index])) {
      return envProfileReadonlyResponse(res, 'LLM', key);
    }

    delete updates.source;
    const updatedProfile = {
      ...profiles.llm[index],
      ...updates,
      modelType: updates.modelType || profiles.llm[index].modelType || 'chat',
    };
    profiles.llm[index] = updatedProfile;

    saveLlmProfiles(profiles);

    broadcastConfigUpdate('llm-profiles', 'update', updatedProfile.key);
    return res.json(ApiResponse.success({ profile: updatedProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'LLM_PROFILE_UPDATE_ERROR',
          statusCode
        )
      );
  }
});

router.delete('/llm-profiles/:key', configLimiter, validateRequest(LlmProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = getLlmProfiles();
    const index = profiles.llm.findIndex(
      (profile) => profile.key.toLowerCase() === key.toLowerCase()
    );

    if (index === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`LLM profile with key '${key}' not found`, undefined, 404));
    }
    if (isEnvProfile(profiles.llm[index])) {
      return envProfileReadonlyResponse(res, 'LLM', key);
    }

    const [deletedProfile] = profiles.llm.splice(index, 1);
    saveLlmProfiles(profiles);

    broadcastConfigUpdate('llm-profiles', 'delete', deletedProfile.key);
    return res.json(ApiResponse.success({ profile: deletedProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'LLM_PROFILE_DELETE_ERROR',
          statusCode
        )
      );
  }
});

router.get('/message-profiles', (req, res) => {
  try {
    const profiles = getMessageProfiles();
    return res.json({ ...profiles, message: sanitizeProfiles(profiles.message) });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MESSAGE_PROFILES_GET_ERROR',
          statusCode
        )
      );
  }
});

router.post('/message-profiles', configLimiter, validateRequest(CreateMessageProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;

    const profiles = getMessageProfiles();

    // Check if key already exists (case-insensitive)
    const existing = profiles.message.find(
      (p) => p.key.toLowerCase() === String(newProfile.key).toLowerCase()
    );
    if (existing) {
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            isEnvProfile(existing)
              ? `Message profile with key '${newProfile.key}' is defined via environment variables`
              : `Message profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    }

    // 'source' is system-managed; never accept it from clients.
    delete newProfile.source;
    profiles.message.push(newProfile);
    saveMessageProfiles(profiles);

    broadcastConfigUpdate('message-profiles', 'create', newProfile.key);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: newProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MESSAGE_PROFILES_CREATE_ERROR',
          statusCode
        )
      );
  }
});

// PUT /api/config/message-profiles/:key - Update a message profile
router.put('/message-profiles/:key', configLimiter, validateRequest(UpdateMessageProfileSchema), (req, res) => {
  try {
    const { key } = req.params;
    const updates = req.body;

    const profiles = getMessageProfiles();
    const normalizedKey = key.toLowerCase();
    const index = profiles.message.findIndex((p) => p.key.toLowerCase() === normalizedKey);

    if (index === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Message profile with key '${key}' not found`, 'NOT_FOUND', 404));
    }
    if (isEnvProfile(profiles.message[index])) {
      return envProfileReadonlyResponse(res, 'Message', key);
    }

    delete updates.source;
    const updatedProfile = {
      ...profiles.message[index],
      ...updates,
      key: profiles.message[index].key,
    };
    profiles.message[index] = updatedProfile;

    saveMessageProfiles(profiles);

    broadcastConfigUpdate('message-profiles', 'update', updatedProfile.key);
    return res.json(ApiResponse.success({ profile: updatedProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MESSAGE_PROFILES_UPDATE_ERROR',
          statusCode
        )
      );
  }
});

// DELETE /api/config/message-profiles/:key - Delete a message profile
router.delete('/message-profiles/:key', configLimiter, validateRequest(MessageProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = getMessageProfiles();
    const index = profiles.message.findIndex(
      (profile) => profile.key.toLowerCase() === key.toLowerCase()
    );

    if (index === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Message profile with key '${key}' not found`, 'NOT_FOUND', 404));
    }
    if (isEnvProfile(profiles.message[index])) {
      return envProfileReadonlyResponse(res, 'Message', key);
    }

    const [deletedProfile] = profiles.message.splice(index, 1);
    saveMessageProfiles(profiles);

    broadcastConfigUpdate('message-profiles', 'delete', deletedProfile.key);
    return res.json(ApiResponse.success({ profile: deletedProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MESSAGE_PROFILES_DELETE_ERROR',
          statusCode
        )
      );
  }
});

// -- Memory Profiles CRUD --

const memoryProfilesModule = require('../../../config/memoryProfiles');

const toolProfilesModule = require('../../../config/toolProfiles');

router.get('/memory-profiles', (_req, res) => {
  try {
    const profiles = memoryProfilesModule.getMemoryProfiles();
    return res.json(ApiResponse.success(profiles));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MEMORY_PROFILES_GET_ERROR',
        )
      );
  }
});

router.post('/memory-profiles', configLimiter, validateRequest(CreateMemoryProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const existing = profiles.memory.find(
      (p: Record<string, unknown>) =>
        String(p.key).toLowerCase() === String(newProfile.key).toLowerCase()
    );
    if (existing)
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            isEnvProfile(existing)
              ? `Memory profile with key '${newProfile.key}' is defined via environment variables`
              : `Memory profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
          )
        );
    // 'source' is system-managed; never accept it from clients.
    delete newProfile.source;
    profiles.memory.push(newProfile);
    memoryProfilesModule.saveMemoryProfiles(profiles);
    broadcastConfigUpdate('memory-profiles', 'create', newProfile.key);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: newProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MEMORY_PROFILES_CREATE_ERROR',
        )
      );
  }
});

router.put('/memory-profiles/:key', configLimiter, validateRequest(MemoryProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: Record<string, unknown>) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
    if (isEnvProfile(profiles.memory[index])) {
      return envProfileReadonlyResponse(res, 'Memory', key);
    }
    delete req.body.source;
    profiles.memory[index] = { ...profiles.memory[index], ...req.body, key };
    memoryProfilesModule.saveMemoryProfiles(profiles);
    broadcastConfigUpdate('memory-profiles', 'update', key);
    return res.json(ApiResponse.success({ profile: profiles.memory[index] }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MEMORY_PROFILES_UPDATE_ERROR',
        )
      );
  }
});

router.delete('/memory-profiles/:key', configLimiter, validateRequest(MemoryProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: Record<string, unknown>) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
    if (isEnvProfile(profiles.memory[index])) {
      return envProfileReadonlyResponse(res, 'Memory', key);
    }
    profiles.memory.splice(index, 1);
    memoryProfilesModule.saveMemoryProfiles(profiles);
    broadcastConfigUpdate('memory-profiles', 'delete', key);
    return res.json(ApiResponse.success());
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'MEMORY_PROFILES_DELETE_ERROR',
        )
      );
  }
});

// -- Tool Profiles CRUD --

router.get('/tool-profiles', (_req, res) => {
  try {
    const profiles = toolProfilesModule.getToolProfiles();
    return res.json(profiles);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'TOOL_PROFILES_GET_ERROR',
          statusCode
        )
      );
  }
});

router.post('/tool-profiles', configLimiter, validateRequest(CreateToolProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;
    const profiles = toolProfilesModule.getToolProfiles();
    if (profiles.tool.find((p: Record<string, unknown>) => p.key === newProfile.key))
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `Tool profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    profiles.tool.push(newProfile);
    toolProfilesModule.saveToolProfiles(profiles);
    broadcastConfigUpdate('tool-profiles', 'create', newProfile.key);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: newProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'TOOL_PROFILES_CREATE_ERROR',
          statusCode
        )
      );
  }
});

router.put('/tool-profiles/:key', configLimiter, validateRequest(ToolProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = toolProfilesModule.getToolProfiles();
    const index = profiles.tool.findIndex((p: Record<string, unknown>) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Tool profile '${key}' not found`, 'NOT_FOUND', 404));
    profiles.tool[index] = { ...profiles.tool[index], ...req.body, key };
    toolProfilesModule.saveToolProfiles(profiles);
    broadcastConfigUpdate('tool-profiles', 'update', key);
    return res.json(ApiResponse.success({ profile: profiles.tool[index] }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'TOOL_PROFILES_UPDATE_ERROR',
          statusCode
        )
      );
  }
});

router.delete('/tool-profiles/:key', configLimiter, validateRequest(ToolProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = toolProfilesModule.getToolProfiles();
    const index = profiles.tool.findIndex((p: Record<string, unknown>) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Tool profile '${key}' not found`, 'NOT_FOUND', 404));
    profiles.tool.splice(index, 1);
    toolProfilesModule.saveToolProfiles(profiles);
    broadcastConfigUpdate('tool-profiles', 'delete', key);
    return res.json(ApiResponse.success());
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'TOOL_PROFILES_DELETE_ERROR',
          statusCode
        )
      );
  }
});

// -- Response Profiles CRUD --

const responseProfileManager = require('../../../config/responseProfileManager');

router.get('/response-profiles', (_req, res) => {
  try {
    const profiles = responseProfileManager.getResponseProfiles();
    return res.json(ApiResponse.success(profiles));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'RESPONSE_PROFILES_GET_ERROR',
        )
      );
  }
});

router.post('/response-profiles', configLimiter, validateRequest(CreateResponseProfileSchema), (req, res) => {
  try {
    const { key, name, description, swarmMode, settings } = req.body;
    const newProfile = responseProfileManager.createResponseProfile({
      key,
      name,
      description,
      swarmMode: swarmMode || 'exclusive',
      settings: { ...settings, SWARM_MODE: swarmMode || 'exclusive' },
    });
    broadcastConfigUpdate('response-profiles', 'create', newProfile.key);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: newProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'RESPONSE_PROFILES_CREATE_ERROR',
        )
      );
  }
});

router.put('/response-profiles/:key', configLimiter, validateRequest(UpdateResponseProfileSchema), (req, res) => {
  try {
    const { key } = req.params;
    const { name, description, swarmMode, settings } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (swarmMode !== undefined) {
      updates.swarmMode = swarmMode;
      updates.settings = { ...(settings || {}), SWARM_MODE: swarmMode };
    } else if (settings !== undefined) {
      updates.settings = settings;
    }
    const updatedProfile = responseProfileManager.updateResponseProfile(key, updates);
    broadcastConfigUpdate('response-profiles', 'update', key);
    return res.json(ApiResponse.success({ profile: updatedProfile }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'RESPONSE_PROFILES_UPDATE_ERROR',
        )
      );
  }
});

router.delete('/response-profiles/:key', configLimiter, validateRequest(ResponseProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    responseProfileManager.deleteResponseProfile(key);
    broadcastConfigUpdate('response-profiles', 'delete', key);
    return res.json(ApiResponse.success());
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    return res
      .status(statusCode)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          'RESPONSE_PROFILES_DELETE_ERROR',
        )
      );
  }
});

export default router;
