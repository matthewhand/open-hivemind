import React from 'react';

/**
 * JSON Syntax Highlighting Utility
 *
 * Provides safe syntax highlighting for JSON content displayed in the UI.
 * The `<HighlightedJson>` component returns React elements directly so
 * React handles HTML escaping inherently — no `dangerouslySetInnerHTML`,
 * no `escapeHtml` shim that future maintainers might forget to call.
 *
 * The legacy `renderJsonWithHighlighting` HTML-string export is preserved
 * (with its escapeHtml safety) for any external caller that still passes
 * the result to dangerouslySetInnerHTML, but new callers should use
 * `<HighlightedJson>`.
 */

/**
 * Map of JSON token types to their DaisyUI color classes.
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
 * Escape HTML special characters — used only by the legacy
 * `renderJsonWithHighlighting` HTML-string output. The React component
 * path does not need this because React escapes text content for us.
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
type TokenType =
  | 'string'
  | 'boolean'
  | 'null'
  | 'number'
  | 'key'
  | 'bracket'
  | 'comma'
  | 'colon'
  | 'whitespace';

interface Token {
  type: TokenType;
  value: string;
}

/**
 * Tokenize JSON string into meaningful tokens for syntax highlighting.
 * Handles nested structures, escaped characters in strings, and ensures
 * proper token classification.
 */
function tokenizeJson(jsonString: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = jsonString.length;

  while (i < len) {
    const char = jsonString[i];

    // Whitespace
    if (/[\t\n\r\s]/.test(char)) {
      let whitespace = '';
      while (i < len && /[\t\n\r\s]/.test(jsonString[i])) {
        whitespace += jsonString[i++];
      }
      tokens.push({ type: 'whitespace', value: whitespace });
      continue;
    }

    // Strings (incl. escaped)
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
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Brackets
    if (/[(){}\[\]]/.test(char)) {
      tokens.push({ type: 'bracket', value: char });
      i++;
      continue;
    }

    // Commas / colons
    if (char === ',' || char === ':') {
      tokens.push({ type: char === ',' ? 'comma' : 'colon', value: char });
      i++;
      continue;
    }

    // Numbers
    if (/[\d-]/.test(char)) {
      let num = '';
      while (i < len && /[\d.eE+-]/.test(jsonString[i])) {
        num += jsonString[i++];
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Booleans / null
    if (/[tfn]/.test(char)) {
      const keywords = ['true', 'false', 'null'];
      let matched = false;
      for (const keyword of keywords) {
        if (jsonString.slice(i, i + keyword.length) === keyword) {
          tokens.push({ type: keyword as TokenType, value: keyword });
          i += keyword.length;
          matched = true;
          break;
        }
      }
      if (!matched) i++;
      continue;
    }

    // Keys (handles non-standard unquoted keys some MCP servers emit)
    if (/[a-zA-Z_]/.test(char)) {
      let key = '';
      while (i < len && /[a-zA-Z_0-9]/.test(jsonString[i])) {
        key += jsonString[i++];
      }
      if (!['true', 'false', 'null'].includes(key)) {
        tokens.push({ type: 'key', value: key });
      }
      continue;
    }

    // Unexpected character — pass through as whitespace (will be escaped by React)
    tokens.push({ type: 'whitespace', value: char });
    i++;
  }

  return tokens;
}

/**
 * Render JSON with syntax highlighting as React elements.
 *
 * SECURITY: React escapes text content automatically, so injecting
 * `<script>` etc. via the JSON value renders as visible text rather than
 * executing. No `dangerouslySetInnerHTML` involved.
 */
export function HighlightedJson({ json }: { json: unknown }): React.ReactElement {
  if (json === null || json === undefined) {
    return <span className={TOKEN_CLASSES.null}>null</span>;
  }

  const jsonString = JSON.stringify(json, null, 2);
  const tokens = tokenizeJson(jsonString);

  return (
    <>
      {tokens.map((token, idx) => {
        const cssClass = TOKEN_CLASSES[token.type] || '';
        if (cssClass && token.type !== 'whitespace') {
          return (
            <span key={idx} className={cssClass}>
              {token.value}
            </span>
          );
        }
        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
      })}
    </>
  );
}

/**
 * @deprecated Use `<HighlightedJson>` instead. This HTML-string variant
 * is preserved only for callers that already pass the result to
 * `dangerouslySetInnerHTML` — new code should not use it.
 *
 * Returned HTML *is* escaped (via escapeHtml on every token) so it
 * remains XSS-safe, but `<HighlightedJson>` is the architecturally
 * preferred path because it removes the need to remember to escape at all.
 */
export function renderJsonWithHighlighting(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return `<span class="${TOKEN_CLASSES.null}">null</span>`;
  }
  const jsonString = JSON.stringify(obj, null, 2);
  const tokens = tokenizeJson(jsonString);
  let html = '';
  for (const token of tokens) {
    const cssClass = TOKEN_CLASSES[token.type] || '';
    const escaped = escapeHtml(token.value);
    if (cssClass && token.type !== 'whitespace') {
      html += `<span class="${cssClass}">${escaped}</span>`;
    } else {
      html += escaped;
    }
  }
  return html;
}

export default {
  HighlightedJson,
  renderJsonWithHighlighting,
};
