# Performance Benchmarks & Scaling Guidelines

Navigation: [Docs Index](../README.md) | [Troubleshooting](troubleshooting-decision-trees.md) | [Monitoring Overview](../monitoring/overview.md)

---

## Overview

This guide provides performance benchmarks and recommendations for scaling Open-Hivemind deployments based on real-world testing and production deployments.

---

## Benchmark Results

### Single Bot Performance

| Metric | Value | Conditions |
|--------|-------|------------|
| **Startup Time** | 2-5 seconds | Cold start, all providers initialized |
| **Message Processing** | 50-200ms | OpenAI GPT-3.5, simple query |
| **Message Processing** | 200-800ms | OpenAI GPT-4, complex query |
| **Message Processing** | 100-400ms | Flowise (cached chatflow) |
| **Message Processing** | 500-3000ms | OpenWebUI (local Ollama) |
| **Memory Usage (idle)** | 150-250 MB | Single bot, no active conversations |
| **Memory Usage (active)** | 300-500 MB | 10 concurrent conversations |

### Multi-Bot (Swarm Mode)

| Bot Count | Memory | CPU (avg) | CPU (peak) | Notes |
|-----------|--------|-----------|------------|-------|
| 1 | 250 MB | 5% | 15% | Baseline |
| 3 | 500 MB | 12% | 25% | Light load |
| 5 | 750 MB | 20% | 40% | Moderate load |
| 10 | 1.5 GB | 35% | 70% | Heavy load |
| 20 | 3+ GB | 60% | 95% | Requires tuning |

### LLM Provider Latency

| Provider | Avg Latency | P95 Latency | Notes |
|----------|-------------|-------------|-------|
| OpenAI (GPT-3.5) | 150ms | 300ms | Fast, reliable |
| OpenAI (GPT-4) | 500ms | 1200ms | Slower, better quality |
| Flowise (cached) | 100ms | 250ms | Depends on chatflow complexity |
| OpenWebUI (7B) | 200ms | 500ms | Local, fast |
| OpenWebUI (70B) | 1500ms | 4000ms | Local, resource intensive |
| Perplexity | 800ms | 2000ms | Online search overhead |

---

## Scaling Guidelines

### Horizontal Scaling (Multiple Bots)

For deployments requiring more than 10 bots:

1. **Load Distribution**
   - Use multiple Discord bot tokens
   - Distribute across channels logically
   - Consider per-region bot deployments

2. **Resource Allocation**
   ```yaml
   # docker-compose.yml
   services:
     open-hivemind:
       deploy:
         resources:
           limits:
             memory: 4G
             cpus: '4'
   ```

3. **Rate Limiting**
   - Set per-channel limits: `MESSAGE_RATE_LIMIT_PER_CHANNEL=10`
   - Implement message queuing for high volume

### Vertical Scaling (Resource Increases)

| Current Load | Recommended Memory | Recommended CPU |
|--------------|-------------------|-----------------|
| 1-3 bots | 2 GB | 2 cores |
| 5-10 bots | 4 GB | 4 cores |
| 10-20 bots | 8 GB | 8 cores |
| 20+ bots | 16 GB+ | 16 cores+ |

### Database Scaling

- **SQLite** (default): Good for single-instance, less than 1000 messages per day
- **PostgreSQL**: For multi-instance, high volume
- **Connection Pooling**: Essential for PostgreSQL

---

## Performance Optimization

### Quick Wins

1. **Enable Response Caching**
   ```bash
   # At the LLM provider level
   FLOWISE_ENABLE_CACHE=true
   ```

2. **Reduce Message History**
   ```bash
   MESSAGE_HISTORY_MAX_MESSAGES=20  # Default: 50
   ```

3. **Use Faster Models**
   - GPT-3.5 Turbo over GPT-4 for simple tasks
   - Quantized local models (Q4_0, Q5_1)

4. **Optimize Rate Limits**
   ```bash
   MESSAGE_RATE_LIMIT_PER_CHANNEL=15
   MESSAGE_MIN_DELAY_MS=500
   ```

### Advanced Optimizations

1. **Connection Pooling**
   Configure database connection pooling for better throughput.

2. **Message Batching**
   Process multiple messages together to reduce overhead.

3. **Streaming Responses**
   Enable for better perceived latency and required for long responses.

4. **CDN for Static Assets**
   Serve WebUI assets from CDN to reduce main server load.

---

## Capacity Planning

### Message Volume Guidelines

| Daily Messages | Recommended Setup |
|----------------|-------------------|
| 0-1,000 | Single instance, SQLite |
| 1,000-10,000 | Single instance, PostgreSQL |
| 10,000-50,000 | Multi-instance, load balancer |
| 50,000+ | Distributed deployment, message queue |

### Resource Calculation

Use this formula to estimate requirements:

```
Memory = (BotCount * 200MB) + (ConcurrentUsers * 50MB) + 500MB
CPU = (BotCount * 10%) + (MessageRate * 0.5%)
```

Example: 5 bots, 20 concurrent users, 60 messages/minute:
- Memory: (5 * 200) + (20 * 50) + 500 = 2500MB
- CPU: (5 * 10%) + (60 * 0.5%) = 80% (account for peaks)

---

## Monitoring Performance

### Key Metrics to Track

1. **Response Latency**
   - Track P50, P95, P99 percentiles
   - Alert on P95 greater than 2 seconds

2. **Error Rate**
   - Target: less than 1%
   - Track by provider and endpoint

3. **Resource Utilization**
   - CPU: Target less than 70% sustained
   - Memory: Target less than 80% sustained
   - Disk: Target less than 50% used

4. **Queue Depth**
   - For async message processing
   - Alert when queue depth exceeds 100

### Health Check Endpoints

```bash
# Basic health
curl http://localhost:3028/api/health

# Detailed metrics
curl http://localhost:3028/api/health/metrics

# Prometheus format
curl http://localhost:3028/api/health/metrics/prometheus
```

---

## Optimization Checklist

Before deploying to production:

- [ ] Set appropriate rate limits
- [ ] Configure message history limits
- [ ] Enable logging and monitoring
- [ ] Set up health check alerts
- [ ] Configure database connection pooling (PostgreSQL)
- [ ] Test under expected load
- [ ] Set up backup strategy
- [ ] Configure proper timeouts
- [ ] Review security settings
- [ ] Document deployment configuration
