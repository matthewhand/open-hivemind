# Pipeline & Config API Reference

Endpoints added as part of the 5-stage pipeline refactor. These provide config source introspection, extended health observability, and pipeline trace statistics.

The 5-stage pipeline (`receive → decision → enrich → inference → send`) is the
**default** message-processing path; set `USE_LEGACY_HANDLER=true` to revert to the
monolithic `handleMessage()`. Pipeline registration is idempotent per `MessageBus`
instance (`createPipeline()` is a no-op on a bus that already has a pipeline wired).

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
    "nodeVersion": "v22.0.0",
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
      "receive": 2.1,
      "decision": 3.0,
      "enrich": 12.4,
      "inference": 65.8,
      "send": 4.0
    },
    "errorRate": 0.02,
    "recentTraces": 5
  }
}
```

---

## Pipeline Activity Recording

When the pipeline runs, two collaborators feed real activity signals — replacing
the previous behaviour where these signals were either dead or only produced by the
demo simulator:

1. **`observability/ActivityRecorder`** subscribes to the `MessageBus` lifecycle
   events (`message:incoming`, `message:sent`, `message:error`) and writes a
   `MessageFlowEvent` to both:
   - the persistent `ActivityLogger` (JSONL on disk), which backs
     `DashboardService.getActivity` and the WebUI Activity page; and
   - the live `WebSocketService` feed (when HTTP is enabled) so the dashboard
     updates in real time.

   This is why `/api/bots/{id}/activity` and the Activity page now surface real
   pipeline traffic rather than only demo events.

2. **`pipeline/ActivityRecorder` (DefaultActivityRecorder)** is invoked by the
   `DecisionStage` / `SendStage` to feed the response-scoring subsystems that the
   legacy handler fed:
   - `GlobalActivityTracker.recordActivity` — the global "fatigue" penalty;
   - `recordBotActivity` — per-channel grace-window / crosstalk signals;
   - `IdleResponseManager.recordInteraction` / `recordBotResponse` — idle-response
     scheduling.

   All recordings are best-effort and never block message delivery.

---

## Trace Export

When the pipeline is created, a `PipelineTracer` is registered and exposed via the
observability singleton (consumed by `GET /api/health/detailed`). Completed traces
are routed through a `TraceExportManager` to a set of exporters built by
`createExporters()`:

| Exporter | Enabled when | Output |
|----------|--------------|--------|
| `ConsoleExporter` | always | `debug('app:trace-export')` tree-format logs |
| `JsonFileExporter` | `TRACE_LOG_FILE` is set | NDJSON appended to that file path |
| `OtlpExporter` | `OTEL_EXPORTER_OTLP_ENDPOINT` is set | OTLP JSON `POST`ed to `<endpoint>/v1/traces` |

---

## Feature Flags

These flags control pipeline and observability behavior:

| Flag | Default | Description |
|------|---------|-------------|
| `USE_LEGACY_HANDLER` | `false` | Revert to the monolithic `handleMessage()` instead of the 5-stage pipeline (the pipeline is the default) |
| `TRACE_LOG_FILE` | unset | File path for NDJSON trace log output (enables `JsonFileExporter`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | OTLP HTTP endpoint for OpenTelemetry trace export (enables `OtlpExporter`) |
