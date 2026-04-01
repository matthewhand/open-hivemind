import { type NextFunction, type Request, type Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiResponse } from '../utils/apiResponse';

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign stripped and coerced data back to req to prevent mass assignment
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

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
