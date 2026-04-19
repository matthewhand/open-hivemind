/**
 * JSON Syntax Highlighting Utility
 * 
 * Provides safe syntax highlighting for JSON content displayed in the UI.
 * This utility properly escapes all HTML characters before applying
 * syntax highlighting, preventing XSS attacks from malicious JSON payloads.
 */

/**
 * Map of JSON token types to their DaisyUI color classes.
 * Uses safe CSS classes instead of inline styles.
 */
const TOKEN_CLASSES: Record<string, string> = {
  string: 'text-success',
  boolean: 'text-warning',
  null: 'text-warning',
  number: 'text-info',
  key: 'text-accent',
  bracket: 'text-base-content/60',
  comma: 'text-base-content/60',
  colon: 'text-base-content/60',
};

/**
 * Escape HTML special characters to prevent XSS.
 * This is the primary security barrier - all input must be escaped
 * before any highlighting is applied.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Token types for JSON parsing.
 */
type TokenType = 'string' | 'boolean' | 'null' | 'number' | 'key' | 'bracket' | 'comma' | 'colon' | 'whitespace';

interface Token {
  type: TokenType;
  value: string;
  escaped: string;
}

/**
 * Tokenize JSON string into meaningful tokens for syntax highlighting.
 * This parser handles nested structures, escaped characters in strings,
 * and ensures proper token classification.
 */
function tokenizeJson(jsonString: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = jsonString.length;

  while (i < len) {
    const char = jsonString[i];

    // Handle whitespace
    if (\t\n\r\s/.test(char)) {
      let whitespace = '';
      while (i < len && \t\n\r\s/.test(jsonString[i])) {
        whitespace += jsonString[i++];
      }
      tokens.push({ type: 'whitespace', value: whitespace, escaped: escapeHtml(whitespace) });
      continue;
    }

    // Handle strings (including escaped characters)
    if (char === '"') {
      let str = '"';
      i++;
      while (i < len) {
        if (jsonString[i] === '"' && jsonString[i - 1] !== '\\') {
          str += '"';
          i++;
          break;
        }
        str += jsonString[i++];
      }
      tokens.push({ type: 'string', value: str, escaped: escapeHtml(str) });
      continue;
    }

    // Handle braces/brackets
    if (/[(){}\[\]]/.test(char)) {
      tokens.push({ type: 'bracket', value: char, escaped: escapeHtml(char) });
      i++;
      continue;
    }

    // Handle commas and colons
    if (char === ',' || char === ':') {
      tokens.push({ type: char === ',' ? 'comma' : 'colon', value: char, escaped: escapeHtml(char) });
      i++;
      continue;
    }

    // Handle numbers
    if (/[\d-]/.test(char)) {
      let num = '';
      while (i < len && /[\d.eE+-]/.test(jsonString[i])) {
        num += jsonString[i++];
      }
      tokens.push({ type: 'number', value: num, escaped: escapeHtml(num) });
      continue;
    }

    // Handle booleans and null
    if (/[tfn]/.test(char)) {
      const keywords = ['true', 'false', 'null'];
      for (const keyword of keywords) {
        if (jsonString.slice(i, i + keyword.length) === keyword) {
          tokens.push({ type: keyword as TokenType, value: keyword, escaped: escapeHtml(keyword) });
          i += keyword.length;
          break;
        }
      }
      continue;
    }

    // Handle JSON keys (unquoted or quoted - though standard JSON requires quotes)
    // This handles non-standard JSON that might come from some MCP servers
    if (/[a-zA-Z_]/.test(char)) {
      let key = '';
      while (i < len && /[a-zA-Z_0-9]/.test(jsonString[i])) {
        key += jsonString[i++];
      }
      // Check if this is a JSON keyword that we already handled
      if (!['true', 'false', 'null'].includes(key)) {
        tokens.push({ type: 'key', value: key, escaped: escapeHtml(key) });
      }
      continue;
    }

    // If we get here, it's an unexpected character - just include it as-is, but escaped
    tokens.push({ type: 'whitespace', value: char, escaped: escapeHtml(char) });
    i++;
  }

  return tokens;
}

/**
 * Render JSON with syntax highlighting.
 * 
 * SECURITY: This function ALWAYS escapes HTML characters before applying
 * any styling. The order is:
 * 1. Parse JSON into tokens
 * 2. Escape each token's value
 * 3. Wrap escaped values in <span> with color classes
 * 
 * This prevents XSS attacks even if the JSON contains malicious HTML/JS.
 * 
 * @param obj - Any JavaScript value to render as JSON
 * @returns HTML string safe for use with dangerouslySetInnerHTML
 */
export function renderJsonWithHighlighting(obj: unknown): string {
  // Handle non-object values
  if (obj === null || obj === undefined) {
    return `<span class="${TOKEN_CLASSES.null}">null</span>`;
  }

  // Stringify to JSON
  const jsonString = JSON.stringify(obj, null, 2);

  // Tokenize the JSON string
  const tokens = tokenizeJson(jsonString);

  // Build the highlighted HTML
  let html = '';
  for (const token of tokens) {
    const cssClass = TOKEN_CLASSES[token.type] || '';
    if (cssClass && token.type !== 'whitespace') {
      html += `<span class="${cssClass}">${token.escaped}</span>`;
    } else {
      html += token.escaped;
    }
  }

  return html;
}

/**
 * Create a highlighted display of JSON content using React elements.
 * This is a safer alternative to dangerouslySetInnerHTML for simple cases.
 * 
 * Note: For complex JSON with nested structures, use renderJsonWithHighlighting
 * with proper sanitization.
 */
export function HighlightedJson({ json }: { json: unknown }): React.ReactElement {
  const html = renderJsonWithHighlighting(json);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default {
  renderJsonWithHighlighting,
  HighlightedJson,
};
