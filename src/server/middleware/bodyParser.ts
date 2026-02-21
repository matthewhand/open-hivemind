import express, { type NextFunction, type Request, type Response } from 'express';
import { body, param, query, validationResult, type ValidationChain } from 'express-validator';

/**
 * Body Parser Configuration
 *
 * Provides standardized body parser limits across all entry points.
 * Configurable via environment variables.
 */

// Default limits (can be overridden via environment)
const DEFAULT_JSON_LIMIT = process.env.BODY_PARSER_JSON_LIMIT || '1mb';
const DEFAULT_URL_ENCODED_LIMIT = process.env.BODY_PARSER_URL_ENCODED_LIMIT || '1mb';
const LARGE_JSON_LIMIT = process.env.BODY_PARSER_LARGE_JSON_LIMIT || '10mb';
const WEBHOOK_JSON_LIMIT = process.env.BODY_PARSER_WEBHOOK_LIMIT || '10mb';

/**
 * Standard JSON body parser with default limit.
 * Use for most API endpoints.
 */
export const jsonParser = express.json({
  limit: DEFAULT_JSON_LIMIT,
});

/**
 * Large JSON body parser for file uploads and large payloads.
 * Use for endpoints that accept file uploads or large data.
 */
export const largeJsonParser = express.json({
  limit: LARGE_JSON_LIMIT,
});

/**
 * Webhook JSON body parser with larger limit for webhook payloads.
 * Use for webhook endpoints that may receive larger payloads.
 */
export const webhookJsonParser = express.json({
  limit: WEBHOOK_JSON_LIMIT,
});

/**
 * URL-encoded body parser with default limit.
 */
export const urlEncodedParser = express.urlencoded({
  extended: true,
  limit: DEFAULT_URL_ENCODED_LIMIT,
});

/**
 * Combined parser middleware with both JSON and URL-encoded support.
 * Uses standard limits.
 */
export const standardParsers = [jsonParser, urlEncodedParser];

/**
 * Combined parser middleware with large limits.
 * Use for endpoints that need to accept larger payloads.
 */
export const largeParsers = [largeJsonParser, urlEncodedParser];

/**
 * Error handler for body parser errors.
 * Catches payload too large and malformed JSON errors.
 */
export function bodyParserErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON',
      message: err.message,
    });
    return;
  }

  // Check for payload too large error from body-parser
  const payloadError = err as { type?: string; limit?: string };
  if (payloadError.type === 'entity.too.large') {
    res.status(413).json({
      error: 'Payload Too Large',
      message: `Request body exceeds the maximum allowed size. Limit: ${payloadError.limit || 'unknown'}`,
    });
    return;
  }

  next(err);
}

/**
 * Get the current body parser limits for health check / debugging.
 */
export function getBodyParserLimits(): {
  jsonLimit: string;
  urlEncodedLimit: string;
  largeJsonLimit: string;
  webhookLimit: string;
} {
  return {
    jsonLimit: DEFAULT_JSON_LIMIT,
    urlEncodedLimit: DEFAULT_URL_ENCODED_LIMIT,
    largeJsonLimit: LARGE_JSON_LIMIT,
    webhookLimit: WEBHOOK_JSON_LIMIT,
  };
}

export default {
  jsonParser,
  largeJsonParser,
  webhookJsonParser,
  urlEncodedParser,
  standardParsers,
  largeParsers,
  bodyParserErrorHandler,
  getBodyParserLimits,
};
