/**
 * config/index.ts – barrel for the configuration import/export sub-modules.
 *
 * Re-exports:
 *   - ConfigurationImportExportService  (main facade – API unchanged)
 *   - ConfigExporter                    (export logic)
 *   - ConfigImporter                    (import / validation logic)
 *   - ConfigMigrator                    (version migration helpers)
 *   - ConfigSerializer                  (serialization helpers)
 *   - All shared types
 */

// Main service (keeps existing callers working without change)
export {
  ConfigurationImportExportService,
  type ExportOptions,
  type ImportOptions,
  type ExportResult,
  type ImportResult,
  type BackupMetadata,
} from '../ConfigurationImportExportService';

// Sub-modules
export { ConfigExporter } from './ConfigExporter';
export { ConfigImporter } from './ConfigImporter';
export { migrateImportPayload, type ImportMetadata } from './ConfigMigrator';
export {
  serializeExportData,
  detectFormat,
  convertToYAML,
  convertToCSV,
  parseYAML,
  parseCSV,
} from './ConfigSerializer';
