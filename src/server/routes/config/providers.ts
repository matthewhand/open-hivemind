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

const router = Router();

// GET /api/config/llm-status - Get LLM configuration status
router.get('/llm-status', (req, res) => {
  try {
    const status = getLlmDefaultStatus();
    return res.json(status);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_STATUS_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// GET /api/config/llm-profiles - List all LLM profiles
router.get('/llm-profiles', (req, res) => {
  try {
    const profiles = getLlmProfiles();
    return res.json(profiles);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILES_GET_ERROR',
          (hivemindError as any).statusCode || 500
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
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILE_CREATE_ERROR',
          (hivemindError as any).statusCode || 500
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

    const updatedProfile = {
      ...profiles.llm[index],
      ...updates,
      modelType: updates.modelType || profiles.llm[index].modelType || 'chat',
    };
    profiles.llm[index] = updatedProfile;

    saveLlmProfiles(profiles);

    broadcastConfigUpdate('llm-profiles', 'update', updatedProfile.key);
    return res.json(ApiResponse.success({ profile: updatedProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILE_UPDATE_ERROR',
          (hivemindError as any).statusCode || 500
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

    const [deletedProfile] = profiles.llm.splice(index, 1);
    saveLlmProfiles(profiles);

    broadcastConfigUpdate('llm-profiles', 'delete', deletedProfile.key);
    return res.json(ApiResponse.success({ profile: deletedProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILE_DELETE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.get('/message-profiles', (req, res) => {
  try {
    const profiles = getMessageProfiles();
    return res.json(profiles);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MESSAGE_PROFILES_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.post('/message-profiles', configLimiter, validateRequest(CreateMessageProfileSchema), (req, res) => {
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
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MESSAGE_PROFILES_CREATE_ERROR',
          (hivemindError as any).statusCode || 500
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
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MEMORY_PROFILES_GET_ERROR',
        )
      );
  }
});

router.post('/memory-profiles', configLimiter, validateRequest(CreateMemoryProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    if (profiles.memory.find((p: any) => p.key === newProfile.key))
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
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MEMORY_PROFILES_CREATE_ERROR',
        )
      );
  }
});

router.put('/memory-profiles/:key', configLimiter, validateRequest(MemoryProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
    profiles.memory[index] = { ...profiles.memory[index], ...req.body, key };
    memoryProfilesModule.saveMemoryProfiles(profiles);
    broadcastConfigUpdate('memory-profiles', 'update', key);
    return res.json(ApiResponse.success({ profile: profiles.memory[index] }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MEMORY_PROFILES_UPDATE_ERROR',
        )
      );
  }
});

router.delete('/memory-profiles/:key', configLimiter, validateRequest(MemoryProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
    profiles.memory.splice(index, 1);
    memoryProfilesModule.saveMemoryProfiles(profiles);
    broadcastConfigUpdate('memory-profiles', 'delete', key);
    return res.json(ApiResponse.success());
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
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
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.post('/tool-profiles', configLimiter, validateRequest(CreateToolProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;
    const profiles = toolProfilesModule.getToolProfiles();
    if (profiles.tool.find((p: any) => p.key === newProfile.key))
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
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_CREATE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.put('/tool-profiles/:key', configLimiter, validateRequest(ToolProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = toolProfilesModule.getToolProfiles();
    const index = profiles.tool.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Tool profile '${key}' not found`, 'NOT_FOUND', 404));
    profiles.tool[index] = { ...profiles.tool[index], ...req.body, key };
    toolProfilesModule.saveToolProfiles(profiles);
    broadcastConfigUpdate('tool-profiles', 'update', key);
    return res.json(ApiResponse.success({ profile: profiles.tool[index] }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_UPDATE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.delete('/tool-profiles/:key', configLimiter, validateRequest(ToolProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = toolProfilesModule.getToolProfiles();
    const index = profiles.tool.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Tool profile '${key}' not found`, 'NOT_FOUND', 404));
    profiles.tool.splice(index, 1);
    toolProfilesModule.saveToolProfiles(profiles);
    broadcastConfigUpdate('tool-profiles', 'delete', key);
    return res.json(ApiResponse.success());
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_DELETE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

export default router;
