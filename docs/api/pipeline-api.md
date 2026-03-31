# Pipeline & Config API Reference

Endpoints added as part of the 5-stage pipeline refactor. These provide config source introspection, extended health observability, and pipeline trace statistics.

## Config Source Introspection

### GET /api/config/sources

Returns a map of all known config keys and the layer each key comes from, as resolved by the `ConfigStore`.

**Response (200):**

```jsonc
{
  "success": true,
  "data": {
    "sources": {
      "PORT": "env",
      "theme": "user",
      "defaultModel": "profile"
      // ... every resolved key
    },
    "layers": ["env", "secure", "provider", "user", "profile", "default"]
  }
}
```

**Error (500):**

```json
{ "success": false, "error": "...", "code": "UNIFIED_SOURCES_ERROR" }
```

---

### GET /api/config/source/:key

Returns the source layer for a single config key.

**Parameters:**

| Name | In   | Required | Description          |
|------|------|----------|----------------------|
| key  | path | yes      | The config key name  |

**Response (200):**

```json
{ "success": true, "data": { "key": "PORT", "source": "env" } }
```

**Error (404):**

```json
{ "success": false, "error": "Key 'NONEXISTENT' not found in any config layer", "code": "KEY_NOT_FOUND" }
```

---

## Health & Observability

### GET /api/health

Basic health check. The response now conditionally includes `providerRegistry` counts (when `SyncProviderRegistry` is initialized) and memory provider status.

**Response (200):**

```jsonc
{
  "status": "healthy",          // or "degraded"
  "timestamp": "2026-03-31T...",
  "version": "1.0.0",
  "uptime": 12345.67,
  "memory": {
    "used": 85,                 // MB
    "total": 256,               // MB
    "percentage": 33
  },
  "system": {
    "platform": "linux",
    "nodeVersion": "v20.11.0",
    "processId": 12345
  },
  "memoryProviders": {
    "status": "healthy",
    "providers": { /* per-provider health */ }
  },
  // Present only when SyncProviderRegistry is initialized:
  "providerRegistry": {
    "llm": 2,
    "memory": 1,
    "messenger": 3,
    "tool": 0
  }
}
```

---

### GET /api/health/detailed

Extended health check. Requires authentication for the full response; unauthenticated callers receive only `status`, `timestamp`, and `uptime`.

The authenticated response includes an optional `pipeline` object with trace statistics from the pipeline tracer (present only when the tracer is active):

```jsonc
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 12345.67,
  // ... memory, cpu, system, errors, recovery, performance fields ...
  "pipeline": {
    "totalTraces": 142,
    "avgDurationMs": 87.3,
    "stageAvgMs": {
      "classify": 2.1,
      "enrich": 12.4,
      "generate": 65.8,
      "filter": 3.0,
      "deliver": 4.0
    },
    "errorRate": 0.02,
    "recentTraces": 5
  }
}
```

---

## Feature Flags

These flags control pipeline and observability behavior:

| Flag | Default | Description |
|------|---------|-------------|
| `USE_LEGACY_HANDLER` | `false` | Revert to the monolithic `handleMessage()` instead of the 5-stage pipeline |
| `TRACE_LOG_FILE` | unset | File path for NDJSON trace log output |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | OTLP HTTP endpoint for OpenTelemetry trace export |
