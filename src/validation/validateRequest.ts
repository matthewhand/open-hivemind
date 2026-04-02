import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiResponse } from '../server/utils/apiResponse';

/**
 * Middleware to validate request data against a Zod schema
 * @param schema Zod schema to validate against
 */
export const validateRequest =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request data against schema
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign stripped and coerced data back to req to prevent mass assignment
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json(ApiResponse.error('Validation failed', 'VALIDATION_ERROR', error.issues));
      }
      next(error);
    }
  };
