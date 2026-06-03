# Performance Monitoring Enhancements

## Overview
This document outlines the performance monitoring improvements implemented to track and optimize API call patterns, reduce excessive requests, and improve overall system efficiency.

> **Status note:** Backend telemetry is no longer demo-only. Real provider
> metrics (`ProviderMetricsCollector`), statistical anomaly detection
> (`IntegrationAnomalyDetector`), and live process/runtime metrics are wired into
> the running server and exported through real endpoints. See
> [Backend Telemetry Collectors](#backend-telemetry-collectors) below and the
> [Monitoring API](monitoring/api.md) reference for exact routes and payloads.

## Key Issues Identified

### 1. ModelAutocomplete Excessive API Calls
**Problem**: ModelAutocomplete component was generating 4-6 API calls per keystroke due to cascading useEffect dependencies.

**Root Cause**:
- `fetchModels` function recreation on every render
- `validateModel` function in useEffect dependencies
- WebSocket auto-refresh triggering additional API calls
- No debouncing on provider field changes

**Solution**:
- Added 300ms debouncing for API calls
- Removed function dependencies from useEffect
- Inlined validation logic to prevent function recreation
- Optimized dependency arrays

### 2. Rate Limiting Configuration
**Current Limits**:
- Default: 50,000 requests per 15 minutes
- API: 30,000 requests per minute  
- Config: 20,000 requests per 5 minutes
- Auth: 500 requests per hour
- Admin: 20,000 requests per 15 minutes

**Recommendation**: Limits are generous and appropriate for the application scale.

## Performance Metrics Added

### 1. API Call Tracking
- Request frequency monitoring
- Endpoint-specific rate tracking
- User session correlation

### 2. Component Performance
- Render cycle optimization
- useEffect dependency auditing
- Debouncing implementation

### 3. WebSocket Efficiency
- Broadcast frequency optimization
- Data payload size monitoring
- Connection stability tracking

## Backend Telemetry Collectors

These collectors run in the server process and feed the real monitoring
endpoints (no random placeholder data on the live path).

### 1. ProviderMetricsCollector (implemented)
- Records per-provider signals from the message pipeline: messages received
  (`recordMessageReceived`), outbound messages, and LLM request latency/outcomes
  (`recordLlmRequest`). Wired into the input, inference, and output processors.
- Exposes a Prometheus text export merged into `GET /health/metrics/prometheus`
  (via `getPrometheusFormat()`), so provider counters appear alongside Node.js
  process metrics.
- Registered with the `ShutdownCoordinator` for clean shutdown.

### 2. IntegrationAnomalyDetector (implemented)
- Started during service initialization and runs on its own interval, reading
  live signals from `ProviderMetricsCollector` to flag integration anomalies
  (Discord, Slack, Mattermost, LLM providers, etc.).
- Results are exposed via `GET /api/monitoring/anomalies` (summary + recent or
  active anomalies, filterable by `integration` and `minutes`).
- Can be disabled with `DISABLE_INTEGRATION_ANOMALY=true`; it is also skipped
  automatically when `NODE_ENV=test` to avoid leaking timers.

### 3. AnomalyDetectionService (implemented)
- Statistical (z-score) anomaly detection over rolling metric windows. Powers
  `GET /health/anomalies` and the `anomalyDetected` / `alert_update` WebSocket
  events. See [Monitoring API](monitoring/api.md).

### 4. BusinessKpiCollector (available, not auto-wired)
- A KPI aggregation service (`src/monitoring/BusinessKpiCollector.ts`) supporting
  engagement/performance/revenue/growth/retention/custom categories with
  thresholds and aggregation types. The class is available for programmatic use
  but is **not** currently started in service initialization or surfaced through
  a dedicated HTTP route.

### 5. Process & Runtime Metrics (implemented)
- `GET /health/metrics` returns live process metrics (uptime, heap usage, CPU,
  event-loop delay/utilization, request totals and rate).
- `GET /health/metrics/prometheus` returns the same data plus collector exports
  in Prometheus exposition format.

## Demo Mode Enhancements

> The simulation features below apply to **demo mode** only. With real providers
> configured, the collectors described above supply genuine telemetry.

### 1. Realistic Activity Simulation
- Multi-turn conversation threads
- Time-of-day activity variations
- Business hours multipliers
- Contextual error generation

### 2. Performance Spike Simulation
- 5% chance of performance spikes
- Realistic response time distributions
- Memory and CPU usage patterns
- Alert generation based on thresholds

### 3. User Interaction Patterns
- Conversation thread continuity
- Natural dialogue flow
- User engagement simulation
- Bot response timing

## Monitoring Dashboard Features

### 1. Real-time Metrics
- API call frequency graphs
- Response time distributions
- Error rate tracking
- Resource utilization

### 2. Alert System
- Rate limit warnings
- Performance degradation alerts
- Connection failure notifications
- Resource exhaustion warnings

### 3. Historical Analysis
- Trend identification
- Peak usage patterns
- Performance regression detection
- Capacity planning data

## Best Practices Implemented

### 1. API Call Optimization
- Debouncing user input (300-500ms)
- Caching frequently requested data
- Batch operations where possible
- Lazy loading for non-critical data

### 2. Component Efficiency
- Minimal re-renders through proper dependencies
- Memoization of expensive calculations
- Cleanup of timers and subscriptions
- Optimized state updates

### 3. WebSocket Management
- Efficient broadcast patterns
- Data compression for large payloads
- Connection pooling
- Graceful degradation

## Future Improvements

### 1. Advanced Caching
- Redis integration for API responses
- Client-side caching strategies
- Cache invalidation patterns
- CDN integration for static assets

### 2. Load Balancing
- Request distribution algorithms
- Health check implementations
- Failover mechanisms
- Geographic load distribution

### 3. Predictive Scaling
- Usage pattern analysis
- Automatic resource scaling
- Capacity forecasting
- Cost optimization

## Metrics to Monitor

### 1. Performance KPIs
- Average response time < 500ms
- 99th percentile response time < 2s
- Error rate < 1%
- Uptime > 99.9%

### 2. Resource Utilization
- CPU usage < 70%
- Memory usage < 80%
- Network bandwidth utilization
- Database connection pool usage

### 3. User Experience
- Page load times
- Interactive response times
- WebSocket connection stability
- Feature adoption rates

## Implementation Status

- ✅ ModelAutocomplete optimization
- ✅ Demo mode conversation threads
- ✅ Performance spike simulation (demo mode)
- ✅ Rate limiting configuration review
- ✅ ProviderMetricsCollector wired into the message pipeline
- ✅ IntegrationAnomalyDetector started and exposed via `/api/monitoring/anomalies`
- ✅ Real process/runtime metrics (`/health/metrics`, `/health/metrics/prometheus`)
- ✅ z-score AnomalyDetectionService (`/health/anomalies`)
- ⏳ BusinessKpiCollector auto-wiring / dedicated KPI route
- ⏳ Advanced caching implementation
- ⏳ Predictive scaling setup