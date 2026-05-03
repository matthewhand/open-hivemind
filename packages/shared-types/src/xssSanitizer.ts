/**
 * Isomorphic XSS Sanitization utilities for Open Hivemind.
 * Works in both Node.js and Browser environments.
 */

import DOMPurify from 'dompurify';

let sanitizer: any;

// Initialize DOMPurify correctly for the current environment
if (typeof window !== 'undefined') {
  // Browser environment
  sanitizer = DOMPurify(window as any);
} else {
  // Node.js environment
  try {
    const { JSDOM } = require('jsdom');
    const { window } = new JSDOM('');
    sanitizer = DOMPurify(window as any);
  } catch (error) {
    // Fallback if jsdom is not available
    console.warn('JSDOM not available, using limited XSS sanitization');
    sanitizer = DOMPurify({} as any);
  }
}

/**
 * Configuration for DOMPurify sanitization
 */
export const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'b',
    'i',
    'em',
    'strong',
    'u',
    's',
    'span',
    'p',
    'br',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'a',
    'img',
    'hr',
    'div',
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
  ],
  ALLOWED_ATTR: [
    'href',
    'title',
    'target',
    'rel',
    'src',
    'alt',
    'width',
    'height',
    'class',
    'id',
    'style',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string, config?: DOMPurify.Config): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const finalConfig = config ? { ...SANITIZE_CONFIG, ...config } : SANITIZE_CONFIG;
  return sanitizer.sanitize(dirty, finalConfig);
}

/**
 * Sanitize plain text by escaping HTML entities
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (typeof document !== 'undefined' && document.createElement) {
    // Browser implementation
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  } else {
    // Node implementation (or when DOM is not available)
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

/**
 * Sanitize URL to prevent dangerous URI schemes
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().toLowerCase();
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:'];

  if (dangerousProtocols.some((p) => trimmed.startsWith(p))) {
    return '';
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('#') ||
    !trimmed.includes(':')
  ) {
    return url.trim();
  }

  return '';
}

/**
 * Sanitize user input for safe display in JSON responses
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeText(key);

    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized;
}
