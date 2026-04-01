/**
 * Serialization helpers for configuration import/export.
 *
 * Re-exports format detection / conversion utilities from the
 * `configImportExport` sub-module and provides the single
 * `serializeExportData()` helper used by ConfigExporter.
 */

export {
  detectFormat,
  convertToYAML,
  convertToCSV,
  parseYAML,
  parseCSV,
} from '../configImportExport/formatConverters';

import { convertToYAML, convertToCSV } from '../configImportExport/formatConverters';

/**
 * Serialize an export-data object to the requested string format.
 *
 * @param exportData  Plain object to serialize.
 * @param format      Target format: 'json' | 'yaml' | 'csv'.
 * @returns           Serialized string ready to be written to disk.
 */
export function serializeExportData(
  exportData: Record<string, unknown>,
  format: string
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(exportData, null, 2);
    case 'yaml':
      return convertToYAML(exportData);
    case 'csv':
      return convertToCSV(exportData);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
