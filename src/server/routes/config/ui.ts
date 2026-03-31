import { Router } from 'express';
import { UserConfigStore } from '../../../config/UserConfigStore';
import { ConfigUpdateSchema } from '../../../validation/schemas/configSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { auditMiddleware, logConfigChange, type AuditedRequest } from '../../middleware/audit';
import { ApiResponse } from '../../utils/apiResponse';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';

const router = Router();

if (process.env.NODE_ENV !== 'test') {
  router.use(auditMiddleware);
}

// GET /api/config/ui - Get user specific UI/general preferences
router.get('/', (req, res) => {
  try {
    const userConfigStore = UserConfigStore.getInstance();
    const generalSettings = userConfigStore.getGeneralSettings();

    return res.json(
      ApiResponse.success({
        _userSettings: {
          values: generalSettings,
          schema: null,
          source: 'user-config.json',
        }
      })
    );
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          (hivemindError as any).code || 'CONFIG_UI_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// PUT /api/config/ui - Update user specific UI/general preferences
router.put('/', validateRequest(ConfigUpdateSchema), async (req, res) => {
  try {
    const { configName, updates, ...directUpdates } = req.body;

    // In UI config, we only care about settings without a specific system configName,
    // or when configName explicitly refers to UI/general settings.
    if (configName) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('configName should not be provided for UI configs here', undefined, 400));
    }

    const userConfigStore = UserConfigStore.getInstance();
    const settingsToSave = updates || directUpdates;
    await userConfigStore.setGeneralSettings(settingsToSave);

    if (process.env.NODE_ENV !== 'test') {
      logConfigChange(
        req as AuditedRequest,
        'UPDATE',
        'config/general',
        'success',
        'Updated general settings'
      );
    }

    return res.json(ApiResponse.success());
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          (hivemindError as any).code || 'CONFIG_UI_PUT_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

export default router;
