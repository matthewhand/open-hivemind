import type { NextFunction, Request, Response } from 'express';
import { UserConfigStore } from '../config/UserConfigStore';
import { HTTP_STATUS } from '../types/constants';

/**
 * Paths that should be accessible even during maintenance mode.
 * This includes health checks, maintenance status checks, and admin routes.
 */
const MAINTENANCE_ALLOWED_PATHS = [
  '/api/health',
  '/api/health/',
  '/api/health/detailed',
  '/api/maintenance/status',
  '/api/demo/status',
  '/api/config/global',
  '/api/config',
  '/admin',
];

/**
 * Checks if the current request path should be allowed during maintenance mode.
 * @param path The request path to check.
 * @returns true if the path is allowed, false otherwise.
 */
function isPathAllowedDuringMaintenance(path: string): boolean {
  // Check exact matches
  if (MAINTENANCE_ALLOWED_PATHS.includes(path)) {
    return true;
  }

  // Check if path starts with any allowed path
  for (const allowedPath of MAINTENANCE_ALLOWED_PATHS) {
    if (path.startsWith(allowedPath + '/') || path === allowedPath) {
      return true;
    }
  }

  // Allow admin routes (for toggling maintenance mode)
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    return true;
  }

  // Allow auth routes to enable login during maintenance
  if (path.startsWith('/api/auth')) {
    return true;
  }

  // Allow static assets
  if (path.startsWith('/static') || path.startsWith('/assets')) {
    return true;
  }

  return false;
}

/**
 * Middleware that checks if the system is in maintenance mode.
 * If maintenance mode is enabled and the request path is not allowed,
 * it returns a 503 Service Unavailable response.
 */
export const maintenanceModeMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userConfigStore = UserConfigStore.getInstance();
    const isMaintenanceMode = userConfigStore.isMaintenanceMode();

    if (isMaintenanceMode && !isPathAllowedDuringMaintenance(req.path)) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        error: 'Maintenance Mode',
        message: 'The system is currently in maintenance mode. Please try again later.',
        maintenanceMode: true,
        retryAfter: 300, // Suggest retrying after 5 minutes
      });
      return;
    }

    // Add maintenance mode status to request for downstream middleware/routes
    (req as Request & { maintenanceMode?: boolean }).maintenanceMode = isMaintenanceMode;

    next();
  } catch (error) {
    // If we can't check maintenance mode, allow the request to proceed
    // to avoid blocking all requests due to a configuration error
    next();
  }
};

/**
 * Create a middleware that enforces maintenance mode for specific paths only.
 * This is useful for protecting specific routes while allowing others.
 * @param pathsToProtect Array of path prefixes to protect during maintenance.
 * @returns A middleware function.
 */
export const createSelectiveMaintenanceMiddleware = (
  pathsToProtect: string[]
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userConfigStore = UserConfigStore.getInstance();
      const isMaintenanceMode = userConfigStore.isMaintenanceMode();

      if (isMaintenanceMode) {
        for (const protectedPath of pathsToProtect) {
          if (req.path.startsWith(protectedPath)) {
            res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
              error: 'Maintenance Mode',
              message: 'The system is currently in maintenance mode. Please try again later.',
              maintenanceMode: true,
            });
            return;
          }
        }
      }

      next();
    } catch (error) {
      next();
    }
  };
};

export default maintenanceModeMiddleware;
