# Sentinel Notes

## Recommendations for Future Fixes

During the audit and remediation of path traversal vulnerabilities in the `ConfigurationImportExportService`, additional security risks were identified that require further attention but were out of scope for the targeted micro-fix PR:

### 1. Execute Dependency Audit (`npm audit`)
It is highly recommended to run `npm audit` to identify and update any third-party dependencies with known CVEs. Currently, `npm install` reports 30 vulnerabilities (15 low, 5 moderate, 10 high).

### 2. Denial of Service (DoS) Risk in Configuration Import
In `src/server/routes/importExport.ts` and `ConfigurationImportExportService.ts`, the import feature accepts configuration files up to 50MB (enforced by `multer`). However, the service parses the entire file synchronously using `JSON.parse`, which can block the Node.js event loop completely for a significant amount of time, causing a Denial of Service for all other concurrent API requests.
**Mitigation:** Consider using a streaming JSON parser (like `stream-json`) or reducing the maximum permitted file size considerably.

### 3. Weak Secret Redaction in `config.ts`
In `src/server/routes/config.ts` (`GET /api/config/global`), a fallback redaction mechanism relies on an `isSensitiveKey` denylist to determine which configuration values should be masked. This approach is inherently brittle and prone to data leakage if new sensitive keys are introduced without updating the denylist.
**Mitigation:** Shift from a denylist approach to an explicit allowlist of safe keys, or enforce provider-specific strict schema definitions to govern what gets exposed to the frontend.

---
*Signed, Sentinel 🛡️*
