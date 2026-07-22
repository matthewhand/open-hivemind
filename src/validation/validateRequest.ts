import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject } from 'zod';

/**
 * Middleware to validate request data against a Zod schema
 * @param schema Zod schema to validate against
 */
export const validateRequest =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and strip unknown keys. Re-assign parsed values so route
      // handlers never see fields the schema did not allow (e.g. role on
      // profile update).
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        (req as { query: unknown }).query = parsed.query;
      }
      if (parsed.params !== undefined) {
        (req as { params: unknown }).params = parsed.params;
      }

      next();
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'Validation failed',
          issues: error.issues,
          data: error.issues,
          details: error.issues,
        });
        return;
      }
      next(error);
    }
  };
