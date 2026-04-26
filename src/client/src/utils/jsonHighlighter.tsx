import React from 'react';

/**
 * JSON Syntax Highlighting Utility
 * 
 * Provides safe syntax highlighting for JSON content displayed in the UI.
 * By returning React elements instead of HTML strings, this completely
 * avoids the need for dangerouslySetInnerHTML and eliminates XSS risks.
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
 * Token types for JSON parsing.
 */
type TokenType = 'string' | 'boolean' | 'null' | 'number' | 'key' | 'bracket' | 'comma' | 'colon' | 'whitespace';

interface Token {
  type: TokenType;
  value: string;
}

/**
 * Tokenize JSON string into meaningful tokens for syntax highlighting.
 */
function tokenizeJson(jsonString: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = jsonString.length;

  while (i < len) {
    const char = jsonString[i];

    // Handle whitespace
    if (/[\t\n\r\s]/.test(char)) {
      let whitespace = '';
      while (i < len && /[\t\n\r\s]/.test(jsonString[i])) {
        whitespace += jsonString[i++];
      }
      tokens.push({ type: 'whitespace', value: whitespace });
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
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Handle braces/brackets
    if (/[(){}\[\]]/.test(char)) {
      tokens.push({ type: 'bracket', value: char });
      i++;
      continue;
    }

    // Handle commas and colons
    if (char === ',' || char === ':') {
      tokens.push({ type: char === ',' ? 'comma' : 'colon', value: char });
      i++;
      continue;
    }

    // Handle numbers
    if (/[\d-]/.test(char)) {
      let num = '';
      while (i < len && /[\d.eE+-]/.test(jsonString[i])) {
        num += jsonString[i++];
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Handle booleans and null
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
      if (matched) continue;
    }

    // Handle JSON keys
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

    // If we get here, it's an unexpected character - just include it as-is
    tokens.push({ type: 'whitespace', value: char });
    i++;
  }

  return tokens;
}

/**
 * Render JSON with syntax highlighting as React Elements.
 * 
 * SECURITY: Returns React elements which automatically escape content,
 * eliminating the need for dangerouslySetInnerHTML.
 * 
 * @param obj - Any JavaScript value to render as JSON
 * @returns Array of React nodes
 */
export function renderJsonElements(obj: unknown): React.ReactNode[] {
  // Handle non-object values
  if (obj === null || obj === undefined) {
    return [<span key="null" className={TOKEN_CLASSES.null}>null</span>];
  }

  // Stringify to JSON
  const jsonString = JSON.stringify(obj, null, 2);

  // Tokenize the JSON string
  const tokens = tokenizeJson(jsonString);

  // Build the highlighted React elements
  return tokens.map((token, index) => {
    const cssClass = TOKEN_CLASSES[token.type] || '';
    if (cssClass && token.type !== 'whitespace') {
      return <span key={index} className={cssClass}>{token.value}</span>;
    } else {
      return <React.Fragment key={index}>{token.value}</React.Fragment>;
    }
  });
}

/**
 * Create a highlighted display of JSON content using React elements.
 * Safely renders without using dangerouslySetInnerHTML.
 */
export function HighlightedJson({ json }: { json: unknown }): React.ReactElement {
  return <span>{renderJsonElements(json)}</span>;
}

export default {
  renderJsonElements,
  HighlightedJson,
};
