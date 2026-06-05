/**
 * @fileoverview Client-side XSS sanitization helpers.
 * The core sanitizers (sanitizeHTML / sanitizeText / sanitizeURL / sanitizeObject)
 * live in @hivemind/shared-types and are re-exported here; the client-specific
 * helpers below (stripHTML, ContextSanitizers, useSanitizedInput, safeHTMLTemplate)
 * build on them. (Restored after #3010's consolidation dropped them.)
 */
import DOMPurify from 'dompurify';
import {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeObject,
  SANITIZE_CONFIG,
} from '@hivemind/shared-types';

export { sanitizeHTML, sanitizeText, sanitizeURL, sanitizeObject, SANITIZE_CONFIG };

// Initialize DOMPurify for both browser and Node/JSDOM environments
const sanitizer = typeof DOMPurify === 'function' ? (DOMPurify as any)(window) : DOMPurify;

/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return sanitizer.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Context-specific sanitizers for embedding untrusted input safely.
 */
export const ContextSanitizers = {
  attribute: (value: string): string => sanitizeText(value).replace(/"/g, '&quot;'),
  javascript: (value: string): string =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/</g, '\\x3C')
      .replace(/>/g, '\\x3E')
      .replace(/&/g, '\\x26')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r'),
  css: (value: string): string => value.replace(/[^a-zA-Z0-9\-_]/g, ''),
  urlParam: (value: string): string => encodeURIComponent(value),
  json: (value: string): string => JSON.stringify(value).slice(1, -1),
};

/**
 * Sanitize user input for a given context (html | text | url).
 */
export function useSanitizedInput(input: string, type: 'html' | 'text' | 'url' = 'text'): string {
  switch (type) {
    case 'html':
      return sanitizeHTML(input);
    case 'url':
      return sanitizeURL(input);
    case 'text':
    default:
      return sanitizeText(input);
  }
}

/**
 * Tagged-template helper that escapes all interpolations.
 */
export function safeHTMLTemplate(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((result, string, i) => {
    const value = values[i] !== undefined ? values[i] : '';
    const sanitizedValue = typeof value === 'string' ? sanitizeText(value) : JSON.stringify(value);
    return result + string + sanitizedValue;
  }, '');
}

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeObject,
  stripHTML,
  ContextSanitizers,
  useSanitizedInput,
  safeHTMLTemplate,
};
