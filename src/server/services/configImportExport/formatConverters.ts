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
 * Convert data to YAML (simplified implementation)
 */

export function convertToYAML(data: any): string {
  // This is a simplified YAML converter
  // In production, use a proper YAML library like js-yaml

  const convert = (obj: any, indent = 0): string => {
    const spaces = ' '.repeat(indent);
    let result = '';

    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          result += spaces + '- ' + convert(item, indent + 2).trim() + '\n';
        }
      } else {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null) {
            result += spaces + key + ':\n' + convert(value, indent + 2);
          } else {
            result += spaces + key + ': ' + value + '\n';
          }
        }
      }
    } else {
      return String(obj);
    }

    return result;
  };

  return convert(data);
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
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 * Parse YAML (simplified implementation)
 */

export function parseYAML(_yamlString: string): any {
  // This is a simplified YAML parser
  // In production, use a proper YAML library like js-yaml
  throw new Error('YAML parsing not implemented in this version');
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
