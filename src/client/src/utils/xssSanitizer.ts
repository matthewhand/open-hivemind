/**
 * @fileoverview Client-side XSS Sanitization utilities
 * @module client/utils/xssSanitizer
 * @description Provides comprehensive XSS protection for user-generated content in the browser
 */

import DOMPurify from 'dompurify';

// Initialize DOMPurify correctly for both browser and Node/JSDOM environments
const sanitizer = typeof DOMPurify === 'function'
  ? (DOMPurify as any)(window)
  : DOMPurify;

/**
 * Configuration for DOMPurify sanitization
 */
const SANITIZE_CONFIG: any = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 's', 'span', 'p', 'br',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'a', 'img', 'hr', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height',
    'class', 'id', 'style'
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

// Configure DOMPurify to hook into all sanitization
sanitizer.addHook('uponSanitizeElement', (node, data) => {
  // Remove any element with javascript: in attributes
  if (node instanceof Element) {
    for (const attr of node.attributes) {
      if (attr.value.toLowerCase().includes('javascript:')) {
        node.removeAttribute(attr.name);
      }
    }
  }
});

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - The potentially malicious HTML string
 * @param config - Optional custom sanitization config
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(dirty: string, config?: any): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  
  const finalConfig = config ? { ...SANITIZE_CONFIG, ...config } : SANITIZE_CONFIG;
  return sanitizer.sanitize(dirty, finalConfig);
}

/**
 * Sanitize plain text by escaping HTML entities
 * @param text - The text to sanitize
 * @returns Sanitized text with HTML entities escaped
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize URL to prevent javascript: and data: URI schemes
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if dangerous
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'blob:'
  ];
  
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }
  
  // Only allow http, https, mailto, and relative URLs
  if (trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('./') ||
      trimmed.startsWith('../') ||
      trimmed.startsWith('#') ||
      !trimmed.includes(':')) {
    return url.trim();
  }
  
  return '';
}

/**
 * Sanitize user input for safe display in JSON responses
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize the key
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

/**
 * Strip all HTML tags from content
 * @param html - HTML content to strip
 * @returns Plain text without any HTML tags
 */
export function stripHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return sanitizer.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Validate and sanitize user input for specific contexts
 */
export const ContextSanitizers = {
  /**
   * Sanitize for HTML attribute context
   */
  attribute: (value: string): string => {
    return sanitizeText(value).replace(/"/g, '&quot;');
  },
  
  /**
   * Sanitize for JavaScript string context
   */
  javascript: (value: string): string => {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/</g, '\\x3C')
      .replace(/>/g, '\\x3E')
      .replace(/&/g, '\\x26')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  },
  
  /**
   * Sanitize for CSS context
   */
  css: (value: string): string => {
    // Only allow alphanumeric, hyphens, and underscores
    return value.replace(/[^a-zA-Z0-9\-_]/g, '');
  },
  
  /**
   * Sanitize for URL parameter context
   */
  urlParam: (value: string): string => {
    return encodeURIComponent(value);
  },
  
  /**
   * Sanitize for JSON string context
   */
  json: (value: string): string => {
    return JSON.stringify(value).slice(1, -1);
  }
};

/**
 * React hook for sanitizing user input
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
 * Create a safe HTML template by escaping all interpolations
 */
export function safeHTMLTemplate(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((result, string, i) => {
    const value = values[i] !== undefined ? values[i] : '';
    const sanitizedValue = typeof value === 'string' 
      ? sanitizeText(value) 
      : JSON.stringify(value);
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
  safeHTMLTemplate
};
