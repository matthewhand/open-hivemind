import { Router } from 'express';
import { getLlmDefaultStatus } from '../../../config/llmDefaultStatus';
import { getLlmProfiles, saveLlmProfiles } from '../../../config/llmProfiles';
import { getMessageProfiles, saveMessageProfiles } from '../../../config/messageProfiles';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import {
  CreateLlmProfileSchema,
  CreateMemoryProfileSchema,
  CreateMessageProfileSchema,
  CreateToolProfileSchema,
  LlmProfileKeyParamSchema,
  MemoryProfileKeyParamSchema,
  ToolProfileKeyParamSchema,
  UpdateLlmProfileSchema,
} from '../../../validation/schemas/configProfilesSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { ApiResponse } from '../../utils/apiResponse';
import { configLimiter } from '../../../middleware/rateLimiter';
import { broadcastConfigUpdate } from './utils';
import { asyncErrorHandler } from '../../../middleware/errorHandler';

const router = Router();

// GET /api/config/llm-status - Get LLM configuration status
router.get('/llm-status', asyncErrorHandler(async (req, res) => {
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
}));

// GET /api/config/llm-profiles - List all LLM profiles
router.get('/llm-profiles', asyncErrorHandler(async (req, res) => {
  try {
    const profiles = getLlmProfiles();
    return res.json(profiles);
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
}));

router.post('/llm-profiles', configLimiter, validateRequest(CreateLlmProfileSchema), asyncErrorHandler(async (req, res) => {
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
    if (profiles.llm.find((p) => p.key.toLowerCase() === newProfile.key.toLowerCase())) {
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `LLM profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    }

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
}));

// PUT /api/config/llm-profiles/:key - Update an LLM profile
router.put('/llm-profiles/:key', configLimiter, validateRequest(UpdateLlmProfileSchema), asyncErrorHandler(async (req, res) => {
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
}));

router.delete('/llm-profiles/:key', configLimiter, validateRequest(LlmProfileKeyParamSchema), asyncErrorHandler(async (req, res) => {
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
}));

router.get('/message-profiles', asyncErrorHandler(async (req, res) => {
  try {
    const profiles = getMessageProfiles();
    return res.json(profiles);
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
}));

router.post('/message-profiles', configLimiter, validateRequest(CreateMessageProfileSchema), asyncErrorHandler(async (req, res) => {
  try {
    const newProfile = req.body;

    const profiles = getMessageProfiles();

    // Check if key already exists
    if (profiles.message.find((p) => p.key === newProfile.key)) {
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `Message profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    }

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
}));

// -- Memory Profiles CRUD --

const memoryProfilesModule = require('../../../config/memoryProfiles');

const toolProfilesModule = require('../../../config/toolProfiles');

router.get('/memory-profiles', asyncErrorHandler(async (req, res) => {
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
}));

router.post('/memory-profiles', configLimiter, validateRequest(CreateMemoryProfileSchema), asyncErrorHandler(async (req, res) => {
  try {
    const newProfile = req.body;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    if (profiles.memory.find((p: Record<string, unknown>) => p.key === newProfile.key))
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `Memory profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
          )
        );
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
}));

router.put('/memory-profiles/:key', configLimiter, validateRequest(MemoryProfileKeyParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: Record<string, unknown>) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
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
}));

router.delete('/memory-profiles/:key', configLimiter, validateRequest(MemoryProfileKeyParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: Record<string, unknown>) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
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
}));

// -- Tool Profiles CRUD --

router.get('/tool-profiles', asyncErrorHandler(async (req, res) => {
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
}));

router.post('/tool-profiles', configLimiter, validateRequest(CreateToolProfileSchema), asyncErrorHandler(async (req, res) => {
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
}));

router.put('/tool-profiles/:key', configLimiter, validateRequest(ToolProfileKeyParamSchema), asyncErrorHandler(async (req, res) => {
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
}));

router.delete('/tool-profiles/:key', configLimiter, validateRequest(ToolProfileKeyParamSchema), asyncErrorHandler(async (req, res) => {
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
}));

export default router;
