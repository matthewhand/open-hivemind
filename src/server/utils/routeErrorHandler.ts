import { type Response } from 'express';
import { ErrorUtils } from '../../types/errors';

export const handleRouteError = (
  error: unknown,
  res: Response,
  debugInstance: any,
  debugMessage: string,
  defaultErrorCode: string,
  includeSuccess = false
) => {
  const hivemindError = ErrorUtils.toAppError(error);
  const errorInfo = ErrorUtils.classifyError(hivemindError);

  debugInstance(debugMessage, {
    message: hivemindError.message,
    code: hivemindError.code,
    type: errorInfo.type,
    severity: errorInfo.severity,
  });

  const responseBody: any = {
    error: hivemindError.message,
    code: hivemindError.code || defaultErrorCode,
    timestamp: new Date().toISOString(),
  };

  if (includeSuccess) {
    responseBody.success = false;
  }

  return res.status(hivemindError.statusCode || 500).json(responseBody);
};
