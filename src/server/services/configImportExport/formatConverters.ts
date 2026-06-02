/**
 * Format detection and conversion utilities for configuration import/export.
 */

/**
 * Detect file format from extension
 */
export function detectFormat(filePath: string): 'json' | 'yaml' | 'csv' {
  const ext = filePath.toLowerCase().split('.').pop();
  switch (ext) {
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'csv':
      return 'csv';
    default:
      return 'json'; // Default to JSON
  }
}

/**
 * Serialize a scalar value (string, number, boolean, null, Date) to its YAML
 * representation. Strings are quoted whenever they could otherwise be
 * misinterpreted as another type (number, boolean, null), contain characters
 * that need escaping, or start/end with whitespace.
 */
function serializeScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : `"${String(value)}"`;
  }
  if (value instanceof Date) {
    // Dates round-trip as ISO-8601 strings.
    return JSON.stringify(value.toISOString());
  }

  const str = String(value);

  // Empty strings and strings that would be ambiguous must be quoted.
  const needsQuoting =
    str.length === 0 ||
    /^[\s]|[\s]$/.test(str) || // leading/trailing whitespace
    /[:#\-?,[\]{}&*!|>'"%@`\n\t]/.test(str) || // YAML indicator / special chars
    /^(?:true|false|null|~|yes|no|on|off)$/i.test(str) || // reserved words
    /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(str); // numeric-looking

  if (needsQuoting) {
    // Use JSON string quoting which produces valid double-quoted YAML scalars
    // (YAML's double-quoted flow scalar shares JSON's escape semantics).
    return JSON.stringify(str);
  }
  return str;
}

/**
 * Convert data to YAML.
 *
 * Supports nested maps, arrays (including arrays of maps and nested arrays),
 * and the scalar types produced by configuration exports (string, number,
 * boolean, null, Date). Output is designed to round-trip through {@link parseYAML}.
 */
export function convertToYAML(data: unknown): string {
  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

  const convert = (obj: unknown, indent: number): string => {
    const spaces = ' '.repeat(indent);

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return spaces + '[]\n';
      }
      let result = '';
      for (const item of obj) {
        if (isPlainObject(item) && Object.keys(item).length > 0) {
          // Render the first key inline with the dash, the rest indented.
          const rendered = convert(item, indent + 2);
          result += spaces + '- ' + rendered.slice(indent + 2);
        } else if (Array.isArray(item) && item.length > 0) {
          const rendered = convert(item, indent + 2);
          result += spaces + '- ' + rendered.slice(indent + 2);
        } else {
          result += spaces + '- ' + serializeScalar(item) + '\n';
        }
      }
      return result;
    }

    if (isPlainObject(obj)) {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return spaces + '{}\n';
      }
      let result = '';
      for (const [key, value] of entries) {
        const safeKey = serializeScalar(key);
        if (Array.isArray(value)) {
          if (value.length === 0) {
            result += spaces + safeKey + ': []\n';
          } else {
            result += spaces + safeKey + ':\n' + convert(value, indent + 2);
          }
        } else if (isPlainObject(value)) {
          if (Object.keys(value).length === 0) {
            result += spaces + safeKey + ': {}\n';
          } else {
            result += spaces + safeKey + ':\n' + convert(value, indent + 2);
          }
        } else {
          result += spaces + safeKey + ': ' + serializeScalar(value) + '\n';
        }
      }
      return result;
    }

    // Top-level scalar.
    return spaces + serializeScalar(obj) + '\n';
  };

  return convert(data, 0);
}

/**
 * Convert data to CSV (simplified implementation)
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
 */

export function convertToCSV(data: any): string {
  // This is a simplified CSV converter for configurations
  // In production, use a proper CSV library
  if (!data.configurations || !Array.isArray(data.configurations)) {
    throw new Error('Cannot convert non-configuration data to CSV');
  }

  const configs = data.configurations;
  if (configs.length === 0) {
    return '';
  }

  // Get headers from first configuration
  const headers = Object.keys(configs[0]);
  let csv = headers.join(',') + '\n';

  // Add data rows
  for (const config of configs) {
    const row = headers.map((header) => {
      const value = config[header];
      // Escape quotes and wrap in quotes if contains comma or quote
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += row.join(',') + '\n';
  }

  return csv;
}

/**
 * Parse a single YAML scalar token into its JS value.
 */
function parseScalar(token: string): unknown {
  const raw = token.trim();
  if (raw.length === 0) {
    return '';
  }
  // Double-quoted strings use JSON escape semantics.
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      // Fall through to returning the raw value if it is not valid JSON.
    }
  }
  // Single-quoted strings: YAML escapes '' to a literal single quote.
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  if (raw === 'null' || raw === '~') {
    return null;
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  if (raw === '[]') {
    return [];
  }
  if (raw === '{}') {
    return {};
  }
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return raw;
}

interface YamlLine {
  indent: number;
  content: string;
}

/**
 * Split a `key: value` mapping entry, respecting quoted keys/values so that a
 * colon inside a quoted string is not treated as the separator.
 */
function splitKeyValue(content: string): { key: string; value: string } | null {
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"' && !inSingle) {
      // Account for escaped quotes inside double-quoted strings.
      if (!(inDouble && content[i - 1] === '\\')) {
        inDouble = !inDouble;
      }
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === ':' && !inDouble && !inSingle) {
      const next = content[i + 1];
      if (next === undefined || next === ' ') {
        return {
          key: content.slice(0, i).trim(),
          value: content.slice(i + 1).trim(),
        };
      }
    }
  }
  return null;
}

/**
 * Recursively parse a block of lines at a given minimum indentation into the
 * corresponding JS value (mapping, sequence, or scalar).
 */
function parseBlock(lines: YamlLine[], start: number, end: number): unknown {
  // Skip leading blank region; the first significant line defines the type.
  let i = start;
  while (i < end && lines[i].content.length === 0) {
    i++;
  }
  if (i >= end) {
    return null;
  }

  const baseIndent = lines[i].indent;
  const isSequence = lines[i].content.startsWith('- ') || lines[i].content === '-';

  if (isSequence) {
    const arr: unknown[] = [];
    let j = i;
    while (j < end) {
      const line = lines[j];
      if (line.content.length === 0) {
        j++;
        continue;
      }
      if (line.indent < baseIndent) {
        break;
      }
      if (line.indent === baseIndent && (line.content.startsWith('- ') || line.content === '-')) {
        const after = line.content === '-' ? '' : line.content.slice(2);
        // Gather child lines belonging to this item (the inline part plus any
        // deeper-indented following lines).
        const childLines: YamlLine[] = [];
        if (after.length > 0) {
          // The inline content sits two columns past the dash.
          childLines.push({ indent: baseIndent + 2, content: after });
        }
        let k = j + 1;
        while (k < end) {
          if (lines[k].content.length === 0) {
            childLines.push(lines[k]);
            k++;
            continue;
          }
          if (lines[k].indent <= baseIndent) {
            break;
          }
          childLines.push(lines[k]);
          k++;
        }
        arr.push(parseBlock(childLines, 0, childLines.length));
        j = k;
      } else {
        break;
      }
    }
    return arr;
  }

  // Otherwise this is a mapping (or a lone scalar).
  const kv = splitKeyValue(lines[i].content);
  if (kv === null) {
    // A bare scalar block.
    return parseScalar(lines[i].content);
  }

  const obj: Record<string, unknown> = {};
  let j = i;
  while (j < end) {
    const line = lines[j];
    if (line.content.length === 0) {
      j++;
      continue;
    }
    if (line.indent < baseIndent) {
      break;
    }
    if (line.indent > baseIndent) {
      // Should have been consumed as a child of the previous key.
      j++;
      continue;
    }
    const entry = splitKeyValue(line.content);
    if (entry === null) {
      break;
    }
    const key = parseScalar(entry.key) as string | number;
    if (entry.value.length > 0) {
      obj[String(key)] = parseScalar(entry.value);
      j++;
    } else {
      // Nested block: collect deeper-indented lines as the value.
      const childLines: YamlLine[] = [];
      let k = j + 1;
      while (k < end) {
        if (lines[k].content.length === 0) {
          childLines.push(lines[k]);
          k++;
          continue;
        }
        if (lines[k].indent <= baseIndent) {
          break;
        }
        childLines.push(lines[k]);
        k++;
      }
      obj[String(key)] = childLines.length > 0 ? parseBlock(childLines, 0, childLines.length) : null;
      j = k;
    }
  }
  return obj;
}

/**
 * Parse YAML produced by {@link convertToYAML} (and compatible block-style YAML)
 * back into a JS value. Supports nested mappings, block sequences, and the
 * scalar types used by configuration import/export.
 */
export function parseYAML(yamlString: string): any {
  const lines: YamlLine[] = yamlString
    .split(/\r?\n/)
    .map((line) => {
      // Strip a trailing comment that is outside of any quotes. We only support
      // comments that begin the line or follow whitespace, which is sufficient
      // for round-tripping our own output (which emits no comments).
      const stripped = line.replace(/\t/g, '  ');
      const indent = stripped.length - stripped.trimStart().length;
      const content = stripped.trim();
      return { indent, content };
    })
    // Drop full-line comments and blank-only document markers.
    .filter((line) => line.content !== '---' && !line.content.startsWith('#'));

  if (lines.every((line) => line.content.length === 0)) {
    return null;
  }

  return parseBlock(lines, 0, lines.length);
}

/**
 * Parse CSV (simplified implementation)
 */

export function parseCSV(csvString: string): any {
  // This is a simplified CSV parser
  // In production, use a proper CSV library
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Invalid CSV format');
  }

  const headers = lines[0].split(',');
  const configurations = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const config: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j].trim();
      let value = values[j] || '';

      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1).replace(/""/g, '"');
      }

      config[header] = value;
    }

    configurations.push(config);
  }

  return { configurations };
}
