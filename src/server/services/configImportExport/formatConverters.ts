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
 * Convert data to CSV (simplified implementation)
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
 * Parse YAML (simplified implementation)
 */
export function parseYAML(yamlString: string): any {
  // This is a simplified YAML parser
  // In production, use a proper YAML library like js-yaml
  throw new Error('YAML parsing not implemented in this version');
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
