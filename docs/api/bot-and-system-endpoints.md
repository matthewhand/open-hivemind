# Bot, Audit, Import/Export & Webhook API Reference

This reference covers the REST endpoints for bot lifecycle management (including
toggle and scheduled tasks), the durable audit log, configuration import/export, and
inbound webhook ingress.

Unless noted otherwise, all `/api/*` endpoints require authentication
(`authenticateToken`) and return the standard envelope:

```jsonc
{ "success": true,  "data": { /* ... */ } }
{ "success": false, "error": "message", "code": "OPTIONAL_CODE" }
```

Source of truth: `src/server/routes/bots.ts`, `src/server/routes/admin/audit.ts`,
`src/server/routes/importExport.ts`, and `src/webhook/routes/webhookRoutes.ts`.

---

## Bot Lifecycle

Mounted at `/api/bots` (`authenticateToken`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bots` | List all bots with status, message/error counts |
| GET | `/api/bots/{id}` | Get a single bot (includes `config`, `isActive`) |
| POST | `/api/bots` | Create a bot |
| PUT | `/api/bots/{id}` | Update a bot |
| DELETE | `/api/bots/{id}` | Delete a bot |
| POST | `/api/bots/{id}/clone` | Clone a bot under a new name |
| POST | `/api/bots/{id}/start` | Start a bot |
| POST | `/api/bots/{id}/stop` | Stop a bot |
| POST | `/api/bots/{id}/toggle` | Toggle active state (start if stopped, stop if running) |
| PUT | `/api/bots/reorder` | Reorder bots by id list |
| GET | `/api/bots/{id}/history` | Chat history (`limit` clamped 1–100, optional `channelId`) |
| GET | `/api/bots/{id}/activity` | Recent activity events (PII redacted) |
| GET | `/api/bots/{id}/versions` | Configuration version history |
| POST | `/api/bots/{id}/versions/{versionId}/restore` | Restore a config version and restart the bot |
| GET | `/api/bots/export` · `/api/bots/{id}/export` | Export bots (sensitive fields redacted) |
| POST | `/api/bots/import` | Import bots, returns a create/update/error report |
| POST | `/api/bots/generate-config` | AI-generate a bot config from a description |
| GET | `/api/bots/{id}/diagnose` | Deep diagnostic |
| POST | `/api/bots/test-chat` | Sandbox a persona/config |
| GET | `/api/bots/{id}/insights` | AI performance insights |
| POST | `/api/bots/{id}/benchmark` | Standardized performance benchmark |
| POST | `/api/bots/{id}/stress-test` | Adversarial stress test |
| POST | `/api/bots/{id}/tasks` | Schedule a recurring task |
| GET | `/api/bots/{id}/tasks` | List scheduled tasks |
| DELETE | `/api/bots/{id}/tasks/{taskId}` | Delete a scheduled task |

### POST /api/bots/{id}/toggle

Flips the bot's active state, reusing the same start/stop logic. Returns the new state.

**Response (200):**

```json
{ "success": true, "data": { "id": "bot-1", "isActive": true, "status": "active" } }
```

Returns `404` if the bot does not exist.

### Scheduled Tasks

Backed by `BotTaskScheduler`. A task runs the given `prompt` against the bot on a
fixed interval.

**POST /api/bots/{id}/tasks**

Request body:

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | string | Prompt to run on each interval |
| `intervalMinutes` | number | Interval between runs, in minutes |

Returns the created task object.

**GET /api/bots/{id}/tasks**

Returns the array of scheduled tasks for the bot.

```json
{ "success": true, "data": [ { "id": "task-1", "prompt": "...", "intervalMinutes": 60 } ] }
```

**DELETE /api/bots/{id}/tasks/{taskId}**

Deletes a scheduled task. Returns `404` if the bot or task is not found.

```json
{ "success": true, "data": { "id": "task-1", "deleted": true } }
```

---

## Audit Log

`GET /api/admin/audit-logs` (admin sub-routes, mounted under `/api/admin`).

Returns **real** audit events read from the durable audit log (JSONL on disk) via
`AuditLogger`. Events are returned newest-first.

**Query parameters** (all optional, AND-combined):

| Name | Description |
|------|-------------|
| `limit` | Max events to return (default `100`) |
| `offset` | Events to skip (default `0`) |
| `search` | Free-text match |
| `action` | Filter by action |
| `resource` | Filter by resource |
| `user` | Filter by user |
| `dateFrom` / `dateTo` | Date range bounds |

**Response (200):**

```json
{ "success": true, "data": { "auditEvents": [ /* ... */ ], "total": 42 } }
```

---

## Configuration Import / Export

Mounted at `/api/import-export` (`authenticateToken`; most routes additionally
require admin). Backed by `ConfigurationImportExportService`. Supports JSON, YAML,
and CSV round-trip, optional compression and AES encryption.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/import-export/export` | Export selected configs. Body: `configIds[]`, `format` (`json`\|`yaml`\|`csv`), `includeVersions`, `includeAuditLogs`, `includeTemplates`, `compress`, `encrypt`, `encryptionKey`, `fileName`. requireAdmin |
| POST | `/api/import-export/import` | Multipart upload (`file`). Body: `format`, `overwrite`, `validateOnly`, `skipValidation`, `decryptionKey`. requireAdmin |
| POST | `/api/import-export/validate` | Multipart upload; validates without importing (`authenticate`) |
| POST | `/api/import-export/backup` | Create a full backup. requireAdmin |
| GET | `/api/import-export/backups` | List backups (includes `count`). requireAdmin |
| POST | `/api/import-export/backups/{backupId}/restore` | Restore from a backup. requireAdmin |
| GET | `/api/import-export/backups/{backupId}/download` | Download a backup file. requireAdmin |
| DELETE | `/api/import-export/backups/{backupId}` | Delete a backup. requireAdmin |

Uploads accept `.json`, `.yaml`, `.yml`, `.csv`, `.gz`, `.enc` (incl. `.json.gz`,
`.json.enc`), max 50 MB.

**Export response (200):**

```json
{ "success": true, "data": { "filePath": "...", "size": 1234, "checksum": "..." } }
```

---

## Inbound Webhook Ingress

These endpoints are mounted at the **root** path (not under `/api`) by the webhook
service and are only registered when `WEBHOOK_ENABLED=true`. They are protected by a
shared-secret token and an IP whitelist rather than session auth.

`configureWebhookRoutes()` (`src/webhook/routes/webhookRoutes.ts`) registers:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook` | `verifyWebhookToken` + `verifyIpWhitelist` | Replicate/prediction-style callback; sends a public announcement to the target channel |
| POST | `/webhook/receive` | `verifyWebhookToken` + `verifyIpWhitelist` | **Inbound ingress** — forwards the payload to the messenger service's `handleIncomingWebhook` so externally-pushed messages reach the pipeline. Returns `501` if the configured messenger does not support inbound webhooks |
| POST | `/webhook/slack` | `verifySlackSignature` | Slack-formatted payload; forwarded to `handleIncomingWebhook` when supported |

### Authentication

- **`verifyWebhookToken`** — requires `X-Webhook-Token` (or `Authorization: Bearer
  <token>`) to match `WEBHOOK_TOKEN`, compared with a timing-safe equality check.
- **`verifyIpWhitelist`** — the request IP must appear in `WEBHOOK_IP_WHITELIST`
  (comma-separated). The list is matched by **exact IP** (IPv4 and IPv6; IPv4-mapped
  IPv6 `::ffff:` addresses are normalized first). An **empty or unset whitelist
  blocks all requests** (fail-closed), and malformed IPs are rejected with `403`.

> Note: `WEBHOOK_IP_WHITELIST` is an exact-match allowlist. CIDR-range matching is
> not currently implemented.

### POST /webhook/receive

**Response (200):**

```json
{ "success": true, "reply": "..." }
```

**Response (501)** — messenger service does not support inbound webhooks:

```json
{ "error": "Inbound webhooks are not supported by the configured messenger service" }
```

---

## Webhook Scheduled Messages (admin API)

Separate from inbound ingress, the admin webhook API at `/api/webhooks`
(`authenticateToken`) manages scheduled outbound messages. Note these are held in an
**in-memory** store and are not persisted across restarts.

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/webhooks/scheduled` | any | List scheduled messages |
| GET | `/api/webhooks/scheduled/{id}` | any | Get a scheduled message |
| POST | `/api/webhooks/scheduled` | admin | Create a scheduled message |
| DELETE | `/api/webhooks/scheduled/{id}` | admin | Delete a scheduled message |

Webhook event inspection (`/api/webhooks/events*`) is served by a separate
`webhookEventsRouter` mounted ahead of this router.
