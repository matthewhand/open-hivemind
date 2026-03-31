import { Router } from 'express';
import { UserConfigStore } from '../../config/UserConfigStore';
import { ConfigUpdateSchema } from '../../validation/schemas/configSchema';
import { validateRequest } from '../../validation/validateRequest';
import { logConfigChange, type AuditedRequest } from '../middleware/audit';
import { ApiResponse } from '../utils/apiResponse';
import { HTTP_STATUS } from '../../types/constants';

const router = Router();

// PUT /api/config/global (Frontend Preferences/General Settings Handler)
// This handler processes updates when `configName` is NOT provided (i.e. user general settings).
router.put('/global', validateRequest(ConfigUpdateSchema), async (req, res, next) => {
  try {
    const { configName, updates, ...directUpdates } = req.body;

    // If configName is provided, it's a system/provider config update. Pass to next router.
    if (configName) {
      return next();
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
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(error.message || 'Error updating UI settings', 'UI_CONFIG_UPDATE_ERROR', 500));
  }
});

export default router;
