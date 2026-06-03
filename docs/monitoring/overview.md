# Monitoring Overview

Navigation: [Docs Index](../README.md) | [Monitoring API](api.md) | [WebUI Dashboard](../webui/dashboard-overview.md)


Open-Hivemind ships with basic health and metrics endpoints that power the
WebUI dashboards and can be scraped by external observability stacks.

## Health Checks
- `GET /health` – aggregated status for LLM providers, messenger connections,
  and background workers.
- `GET /health/anomalies` – outstanding anomaly reports raised by rate-limit or
  connection issues.
- `POST /health/anomalies/:id/resolve` – acknowledge and close an anomaly.

## Metrics
- `GET /metrics` – Prometheus-compatible plaintext export.
- `GET /metrics/json` – JSON payload for custom dashboards.
- `GET /health/metrics` – lightweight snapshot consumed by the WebUI.

## WebSockets
Subscribe to `ws://<host>/webui/socket.io` (namespace `/webui`) to receive live
`health_update`, `alert_update`, and `metric_update` events. These are the same
feeds that drive the WebUI tiles.

For exact schemas and payload examples, see [`monitoring/api.md`](api.md).
