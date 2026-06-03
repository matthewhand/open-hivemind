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
 * Encode a single value into a CSV cell string.
 *
 * Scalars (string/number/boolean) are stored verbatim; `null`/`undefined`
 * become empty cells. Nested objects and arrays are JSON-encoded so they can
 * be losslessly reconstructed on import (the naive converter previously
 * rendered them as the literal "[object Object]").
 */
function encodeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Quote a CSV field per RFC 4180. A field is wrapped in double quotes when it
 * contains a comma, double quote, CR or LF, and embedded double quotes are
 * doubled.
 */
function escapeCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Convert configuration export data to RFC 4180-compliant CSV.
 *
 * - Headers are the union of every configuration's keys (not just the first),
 *   so heterogeneous rows are not silently truncated.
 * - Nested objects/arrays are JSON-encoded inside their cell and round-trip
 *   back to structured values via {@link parseCSV}.
 * - All fields are quoted/escaped so embedded commas, quotes and newlines
 *   survive a round trip.
 */
export function convertToCSV(data: any): string {
  if (!data || !data.configurations || !Array.isArray(data.configurations)) {
    throw new Error('Cannot convert non-configuration data to CSV');
  }

  const configs: Record<string, unknown>[] = data.configurations;
  if (configs.length === 0) {
    return '';
  }

  // Build a stable header set from the union of all configuration keys so that
  // rows with extra/missing fields are still represented correctly.
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const config of configs) {
    for (const key of Object.keys(config ?? {})) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  const rows = [headers.map(escapeCsvField).join(',')];
  for (const config of configs) {
    const row = headers.map((header) =>
      escapeCsvField(encodeCsvValue((config ?? {})[header]))
    );
    rows.push(row.join(','));
  }

  // RFC 4180 uses CRLF; many tools accept LF too. We emit LF for consistency
  // with the rest of the codebase and a trailing newline for POSIX-friendliness.
  return rows.join('\n') + '\n';
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
 * Tokenize an RFC 4180 CSV document into a matrix of string cells.
 *
 * Correctly handles quoted fields containing commas, escaped double quotes
 * (`""`) and embedded CR/LF newlines, none of which the previous naive
 * `split(',')`/`split('\n')` implementation could survive.
 */
function tokenizeCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = (): void => {
    row.push(field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      // Treat CRLF (and lone CR) as a single record separator.
      pushRow();
      if (input[i + 1] === '\n') {
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (char === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Flush the final field/row unless the input ended exactly on a separator
  // (i.e. a trailing newline produced an empty trailing record we should drop).
  if (field !== '' || row.length > 0) {
    pushRow();
  }

  return rows;
}

/**
 * Decode a CSV cell back into a JS value, reversing {@link encodeCsvValue}.
 *
 * Empty cells become empty strings (preserving the import contract that fields
 * are present), and cells that hold a JSON object/array are parsed back into
 * the structured value they were exported from. Plain scalars are returned as
 * strings, since CSV is untyped.
 */
function decodeCsvValue(cell: string): unknown {
  if (cell === '') {
    return '';
  }
  const first = cell[0];
  // Only attempt JSON parsing for object/array payloads to avoid coercing
  // ordinary numeric/boolean-looking strings (e.g. provider names) unexpectedly.
  if (first === '{' || first === '[') {
    try {
      return JSON.parse(cell);
    } catch {
      return cell;
    }
  }
  return cell;
}

/**
 * Parse RFC 4180-compliant CSV produced by {@link convertToCSV} back into
 * configuration export data. Round-trips quoting/escaping and nested
 * objects/arrays.
 */
export function parseCSV(csvString: string): any {
  const matrix = tokenizeCsv(csvString).filter(
    // Drop blank lines that tokenize to a single empty cell.
    (cols) => !(cols.length === 1 && cols[0] === '')
  );

  if (matrix.length < 1) {
    throw new Error('Invalid CSV format');
  }

  const headers = matrix[0].map((h) => h.trim());
  const configurations: Record<string, unknown>[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const values = matrix[r];
    const config: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      config[headers[c]] = decodeCsvValue(values[c] ?? '');
    }
    configurations.push(config);
  }

  return { configurations };
}
