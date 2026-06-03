# Monitoring Overview

Navigation: [Docs Index](../README.md) | [Monitoring API](api.md) | [WebUI Dashboard](../webui/dashboard-overview.md)


Open-Hivemind ships with real health and metrics endpoints that power the
WebUI dashboards and can be scraped by external observability stacks. Live
telemetry comes from in-process collectors (`ProviderMetricsCollector`,
`IntegrationAnomalyDetector`, the z-score `AnomalyDetectionService`) rather than
placeholder data.

## Health Checks
- `GET /health` – aggregated status for LLM providers, messenger connections,
  and background workers (also mounted at `/api/health`).
- `GET /health/detailed` – detailed per-service health.
- `GET /health/ready`, `GET /health/live` – readiness/liveness probes.
- `GET /health/alerts` – active diagnostic alerts.

## Anomalies
- `GET /api/anomalies` – outstanding statistical anomalies from
  `AnomalyDetectionService`.
- `GET /api/anomalies/history` – historical anomaly records.
- `POST /api/anomalies/:id/resolve` – acknowledge and close an anomaly.
- `GET /api/monitoring/anomalies` – integration-level anomalies (Discord, Slack,
  Mattermost, LLM providers) from `IntegrationAnomalyDetector`. Supports
  `integration` and `minutes` query filters.

## Metrics
- `GET /health/metrics` – live process/runtime snapshot (uptime, heap, CPU,
  event-loop delay/utilization, request totals and rate) consumed by the WebUI.
- `GET /health/metrics/prometheus` – Prometheus-compatible plaintext export,
  including provider counters from `ProviderMetricsCollector`.
- `GET /api/monitoring/costs` – historical/daily LLM cost analytics.

> The `/api/*` monitoring and anomaly routes require authentication
> (`Authorization: Bearer <token>`); the `/health/*` probes are public.

## WebSockets
Subscribe to `ws://<host>/webui/socket.io` (namespace `/webui`) to receive live
`health_update`, `alert_update`, and `metric_update` events. These are the same
feeds that drive the WebUI tiles.

For exact schemas and payload examples, see [`monitoring/api.md`](api.md).
