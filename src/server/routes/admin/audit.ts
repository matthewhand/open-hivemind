import { Router } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { AuditLogger } from '../../../common/auditLogger';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { HTTP_STATUS } from '../../../types/constants';

const router = Router();

// GET /audit-logs - Return real audit events from the audit logger
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      limit = '100',
      offset = '0',
      search,
      action,
      resource,
      user,
      dateFrom,
      dateTo,
    } = req.query as Record<string, string | undefined>;

    const auditLogger = AuditLogger.getInstance();
    const filter = auditLogger.buildFilter({ search, action, resource, user, dateFrom, dateTo });
    const auditEvents = await auditLogger.getAuditEvents(Number(limit), Number(offset), filter);

    return res.json(ApiResponse.success({ auditEvents, total: auditEvents.length }));
  } catch (error: unknown) {
    const _hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve audit logs'));
  }
});

export default router;
