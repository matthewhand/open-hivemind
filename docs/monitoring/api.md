# Monitoring API Documentation

Navigation: [Docs Index](../README.md) | [Monitoring Overview](overview.md) | [Operations](../operations/dev-startup.md)


## Overview
The Monitoring API provides endpoints for accessing system metrics, health status, anomalies, and alerts. It integrates with Prometheus for metrics export and supports real-time notifications via WebSocket. This API is crucial for the anomaly detection pipeline, allowing external systems to consume metrics and receive alerts.

Telemetry is produced by in-process collectors:
- `ProviderMetricsCollector` – per-provider message/LLM counters, exported in Prometheus format.
- `AnomalyDetectionService` – z-score anomaly detection over rolling metric windows.
- `IntegrationAnomalyDetector` – integration-level anomaly detection across messengers and LLM providers.

## Base URL
All endpoints are relative to the server root (e.g., `http://localhost:3028`).

## Authentication
The `/api/*` monitoring and anomaly endpoints require authentication via JWT tokens — include the `Authorization: Bearer <token>` header. The `/health/*` probe endpoints are public.

## Endpoint Map (current paths)

| Path | Method | Purpose |
|------|--------|---------|
| `/health/metrics` | GET | Live process/runtime metrics (JSON) |
| `/health/metrics/prometheus` | GET | Prometheus text export incl. provider counters |
| `/health/alerts` | GET | Active diagnostic alerts |
| `/api/anomalies` | GET | Active statistical anomalies |
| `/api/anomalies/history` | GET | Historical anomalies |
| `/api/anomalies/:id/resolve` | POST | Resolve an anomaly |
| `/api/monitoring/anomalies` | GET | Integration anomalies (messengers/LLM providers) |
| `/api/monitoring/costs` | GET | Historical/daily LLM cost analytics |

> The detailed sections below document the JSON shapes. Where an older path was
> referenced (`/metrics`, `/metrics/json`, `/health/anomalies`) the current path
> is noted inline.

## Endpoints

### 1. Metrics Export (Prometheus Format)
- **Method**: GET
- **Path**: `/health/metrics/prometheus`
- **Description**: Exports process metrics plus `ProviderMetricsCollector` counters in the Prometheus exposition format for scraping by Prometheus servers.
- **Response Headers**: `Content-Type: text/plain; charset=utf-8`
- **Status Codes**:
  - `200`: Success
  - `500`: Error generating metrics
- **Example Response**:
  ```
  # HELP hivemind_messages_total Total messages processed
  # TYPE hivemind_messages_total counter
  hivemind_messages_total 42

  # HELP hivemind_response_time_ms Response time in milliseconds
  # TYPE hivemind_response_time_ms histogram
  hivemind_response_time_ms_bucket{le="50"} 10
  hivemind_response_time_ms_bucket{le="100"} 30
  hivemind_response_time_ms_bucket{le="+Inf"} 42
  hivemind_response_time_ms_sum 1500
  hivemind_response_time_ms_count 42
  ```
- **Integration Note**: Used by Prometheus for time-series data collection in the anomaly detection pipeline.

### 2. JSON Metrics (Process/Runtime)
- **Method**: GET
- **Path**: `/health/metrics`
- **Description**: Returns the live process/runtime snapshot suitable for dashboard consumption.
- **Query Parameters**: None
- **Response**: `application/json`
- **Status Codes**: `200`
- **Schema**:
  ```json
  {
    "timestamp": "2025-09-25T03:33:00.000Z",
    "uptime": 3600,
    "memory": { "used": 120, "total": 256, "percentage": 47 },
    "cpu": { "user": 1200, "system": 300 },
    "eventLoop": { "delay": 1.2, "utilization": 0.18 },
    "requests": { "total": 5042, "rate": 1.4 }
  }
  ```
- **Integration Note**: Feeds data to dashboard components and anomaly detection services.

### 3. Health Status
- **Method**: GET
- **Path**: `/health`
- **Description**: Comprehensive health check including system and application metrics.
- **Query Parameters**:
  - `limit` (optional, number, default: 100): Limit recent metrics data points.
- **Response**: `application/json`
- **Status Codes**: `200`, `500` (error)
- **Schema**:
  ```json
  {
    "timestamp": "2025-09-25T03:33:00.000Z",
    "system": {
      "cpu": { "usage": 45.2, "cores": 4 },
      "memory": { "usagePercent": 67.3, "total": "16GB", "used": "10.8GB" }
    },
    "application": {
      "bots": { "total": 5, "active": 3 },
      "database": { "connected": true, "queryTime": 12 }
    },
    "overall": "healthy"
  }
  ```
- **Integration Note**: Used for dashboard health indicators and triggering alerts.

### 4. Alerts
- **Method**: GET
- **Path**: `/health/alerts`
- **Description**: Retrieves system alerts, including those from anomaly detection.
- **Query Parameters**:
  - `active` (optional, boolean, default: true): Filter to active (unresolved) alerts only.
- **Response**: `application/json`
- **Status Codes**: `200`, `500`
- **Schema**:
  ```json
  {
    "timestamp": "2025-09-25T03:33:00.000Z",
    "alerts": [
      {
        "id": "alert_123",
        "timestamp": "2025-09-25T03:32:00.000Z",
        "level": "warning",
        "title": "Anomaly Detected: responseTime",
        "message": "Value 500 deviates from mean 150 by 4.2 standard deviations",
        "metadata": {
          "anomalyId": "anomaly_456",
          "zScore": 4.2,
          "value": 500,
          "expected": 150
        },
        "resolved": false
      }
    ],
    "total": 5,
    "active": 2
  }
  ```
- **Integration Note**: Polled by dashboards; real-time updates via WebSocket.

### 5. Anomalies
- **Method**: GET
- **Path**: `/api/anomalies`
- **Description**: Retrieves active detected anomalies from the statistical (`AnomalyDetectionService`) detection system. Historical records are available at `GET /api/anomalies/history`.
- **Query Parameters**: None
- **Response**: `application/json`
- **Status Codes**: `200`
- **Schema**:
  ```json
  {
    "anomalies": [
      {
        "id": "anomaly_123",
        "timestamp": "2025-09-25T03:33:00.000Z",
        "metric": "responseTime",
        "value": 500,
        "expectedMean": 150,
        "standardDeviation": 50,
        "zScore": 4.2,
        "threshold": 3,
        "severity": "high",
        "explanation": "Value 500 deviates from mean 150.00 by 4.20 standard deviations (50.00)",
        "resolved": false
      }
    ],
    "total": 3,
    "active": 1
  }
  ```
- **Integration Note**: Core output of z-score anomaly detection; triggers alerts.

### 6. Resolve Anomaly
- **Method**: POST
- **Path**: `/api/anomalies/:id/resolve`
- **Description**: Marks an anomaly as resolved.
- **Path Parameters**:
  - `id` (string): Anomaly ID
- **Body**: Empty
- **Response**: `application/json`
- **Status Codes**: `200` (success), `404` (not found)
- **Example Response**:
  ```json
  {
    "success": true,
    "message": "Anomaly resolved"
  }
  ```
- **Integration Note**: Called by dashboard when user acknowledges an anomaly.

### 7. Integration Anomalies
- **Method**: GET
- **Path**: `/api/monitoring/anomalies`
- **Description**: Returns integration-level anomalies (Discord, Slack, Mattermost, LLM providers, etc.) detected by `IntegrationAnomalyDetector`, plus a summary.
- **Query Parameters**:
  - `integration` (optional, string): Filter to a single integration.
  - `minutes` (optional, number): When provided, returns anomalies within the last N minutes; otherwise returns currently-active anomalies.
- **Response**: `application/json`
- **Schema**:
  ```json
  {
    "success": true,
    "data": {
      "summary": { },
      "anomalies": [ ]
    }
  }
  ```
- **Integration Note**: Fed by `ProviderMetricsCollector`; the detector runs on its own interval and can be disabled with `DISABLE_INTEGRATION_ANOMALY=true`.

### 8. Cost Analytics
- **Method**: GET
- **Path**: `/api/monitoring/costs`
- **Description**: Historical and daily LLM cost analytics.
- **Query Parameters**:
  - `days` (optional, number, default: 7): Window size in days.
- **Response**: `application/json`
- **Status Codes**: `200`, `500`

## WebSocket Integration
For real-time updates, connect to `ws://localhost:3028/webui/socket.io` (or HTTPS in production).

### Connection
- **Namespace**: `/webui`
- **Transports**: `['websocket', 'polling']`

### Events
- **Server to Client**:
  - `alert_update` (AlertEvent): New alert (e.g., from anomaly detection).
    ```json
    {
      "id": "alert_123",
      "timestamp": "2025-09-25T03:33:00.000Z",
      "level": "warning",
      "title": "Anomaly Detected",
      "message": "Response time spike",
      "metadata": { "zScore": 4.2 }
    }
    ```
  - `anomalyDetected` (Anomaly): New anomaly detected.
  - `metrics_update` (Metrics): Periodic metrics refresh.
  - `monitoring_dashboard_update` (DashboardData): Full dashboard payload.

- **Client to Server**:
  - `request_alerts`: Fetch recent alerts.
  - `request_monitoring_dashboard`: Request dashboard data.

### Alert Levels
- `info`: Informational
- `warning`: Potential issue
- `error`: Recoverable error
- `critical`: Immediate attention required

## Error Handling
- **Common Errors**:
  - `401 Unauthorized`: Invalid/missing token.
  - `500 Internal Server Error`: Service unavailable.
- **Response Format**:
  ```json
  {
    "error": "Description",
    "timestamp": "2025-09-25T03:33:00.000Z"
  }
  ```

## Integration with Anomaly Detection Pipeline
1. **Metrics Collection**: Use `/health/metrics/prometheus` for Prometheus scraping or `/health/metrics` for the JSON process snapshot.
2. **Detection**: Statistical anomalies are computed using z-score on rolling windows (`AnomalyDetectionService`); integration anomalies are computed by `IntegrationAnomalyDetector` from live provider metrics.
3. **Alerting**: Detected anomalies trigger `alert_update` WebSocket events and active alerts are queryable via `/health/alerts`.
4. **Dashboard**: Poll `/health`, `/api/anomalies`, and `/api/monitoring/anomalies`, or subscribe to WebSocket for live updates.
5. **Resolution**: Use POST `/api/anomalies/:id/resolve` to acknowledge and resolve.

## Security Considerations
- Rate limiting applied to all endpoints.
- Sensitive metrics (e.g., token usage) may be redacted based on user permissions.
- WebSocket connections require authentication via query param or headers.

For further customization, refer to the [Monitoring Overview](overview.md).
