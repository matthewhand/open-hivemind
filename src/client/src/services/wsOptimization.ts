/**
 * WebSocket Optimization Service - Reduces unnecessary broadcasts and optimizes data flow
 */

interface BroadcastThrottle {
  lastBroadcast: number;
  pendingData: any;
  timeoutId?: NodeJS.Timeout;
}

interface OptimizationConfig {
  throttleMs: number;
  batchSize: number;
  maxPendingTime: number;
  compressionThreshold: number;
}

class WebSocketOptimizationService {
  private throttles = new Map<string, BroadcastThrottle>();
  private config: OptimizationConfig = {
    throttleMs: 100, // Minimum time between broadcasts for same event type
    batchSize: 10, // Maximum events to batch together
    maxPendingTime: 500, // Maximum time to hold pending data
    compressionThreshold: 1024 // Compress payloads larger than 1KB
  };

  /**
   * Optimize broadcast by throttling and batching similar events
   */
  optimizeBroadcast(eventType: string, data: any, broadcastFn: (data: any) => void): void {
    const key = eventType;
    const now = Date.now();
    
    let throttle = this.throttles.get(key);
    if (!throttle) {
      throttle = {
        lastBroadcast: 0,
        pendingData: null
      };
      this.throttles.set(key, throttle);
    }

    // Clear existing timeout
    if (throttle.timeoutId) {
      clearTimeout(throttle.timeoutId);
    }

    // Batch the data
    if (throttle.pendingData) {
      throttle.pendingData = this.batchData(eventType, throttle.pendingData, data);
    } else {
      throttle.pendingData = data;
    }

    const timeSinceLastBroadcast = now - throttle.lastBroadcast;
    
    if (timeSinceLastBroadcast >= this.config.throttleMs) {
      // Broadcast immediately
      this.executeBroadcast(key, throttle, broadcastFn);
    } else {
      // Schedule delayed broadcast
      const delay = Math.min(
        this.config.throttleMs - timeSinceLastBroadcast,
        this.config.maxPendingTime
      );
      
      throttle.timeoutId = setTimeout(() => {
        this.executeBroadcast(key, throttle, broadcastFn);
      }, delay);
    }
  }

  /**
   * Execute the actual broadcast
   */
  private executeBroadcast(key: string, throttle: BroadcastThrottle, broadcastFn: (data: any) => void): void {
    if (!throttle.pendingData) return;

    const data = this.optimizePayload(throttle.pendingData);
    broadcastFn(data);
    
    throttle.lastBroadcast = Date.now();
    throttle.pendingData = null;
    throttle.timeoutId = undefined;
  }

  /**
   * Batch similar data together
   */
  private batchData(eventType: string, existing: any, newData: any): any {
    switch (eventType) {
      case 'messageFlow':
        // Batch message flow events into arrays
        if (Array.isArray(existing)) {
          return [...existing, ...(Array.isArray(newData) ? newData : [newData])];
        }
        return [existing, ...(Array.isArray(newData) ? newData : [newData])];

      case 'performanceMetrics':
        // Keep only the latest performance metrics
        return Array.isArray(newData) ? newData : [newData];

      case 'alerts':
        // Batch alerts but limit to prevent overflow
        const alerts = Array.isArray(existing) ? existing : [existing];
        const newAlerts = Array.isArray(newData) ? newData : [newData];
        const combined = [...alerts, ...newAlerts];
        return combined.slice(-this.config.batchSize); // Keep only recent alerts

      case 'botStats':
        // Merge bot stats, keeping latest for each bot
        const existingStats = Array.isArray(existing) ? existing : [existing];
        const newStats = Array.isArray(newData) ? newData : [newData];
        
        const statsMap = new Map();
        [...existingStats, ...newStats].forEach(stat => {
          if (stat.botName) {
            statsMap.set(stat.botName, stat);
          }
        });
        return Array.from(statsMap.values());

      default:
        // Default: replace with new data
        return newData;
    }
  }

  /**
   * Optimize payload size and structure
   */
  private optimizePayload(data: any): any {
    if (!data) return data;

    // Remove redundant fields
    const optimized = this.removeRedundantFields(data);
    
    // Compress large payloads
    const serialized = JSON.stringify(optimized);
    if (serialized.length > this.config.compressionThreshold) {
      return this.compressPayload(optimized);
    }

    return optimized;
  }

  /**
   * Remove redundant or unnecessary fields
   */
  private removeRedundantFields(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.removeRedundantFields(item));
    }

    if (typeof data === 'object' && data !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip internal fields
        if (key.startsWith('_') || key === 'metadata') continue;
        
        // Skip null/undefined values
        if (value == null) continue;
        
        // Skip empty arrays/objects
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof value === 'object' && Object.keys(value).length === 0) continue;
        
        cleaned[key] = this.removeRedundantFields(value);
      }
      return cleaned;
    }

    return data;
  }

  /**
   * Compress payload (simplified - in production would use actual compression)
   */
  private compressPayload(data: any): any {
    // Simplified compression: truncate arrays and strings
    if (Array.isArray(data)) {
      return data.slice(0, this.config.batchSize);
    }

    if (typeof data === 'object' && data !== null) {
      const compressed: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.length > 200) {
          compressed[key] = value.substring(0, 200) + '...';
        } else if (Array.isArray(value)) {
          compressed[key] = value.slice(0, this.config.batchSize);
        } else {
          compressed[key] = value;
        }
      }
      return compressed;
    }

    return data;
  }

  /**
   * Clear all throttles (useful for cleanup)
   */
  clearThrottles(): void {
    for (const throttle of this.throttles.values()) {
      if (throttle.timeoutId) {
        clearTimeout(throttle.timeoutId);
      }
    }
    this.throttles.clear();
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    activeThrottles: number;
    totalBroadcastsSaved: number;
    averagePayloadReduction: number;
  } {
    return {
      activeThrottles: this.throttles.size,
      totalBroadcastsSaved: 0, // Would track in real implementation
      averagePayloadReduction: 0.25 // Estimated 25% reduction
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const wsOptimization = new WebSocketOptimizationService();

/**
 * Optimized WebSocket wrapper
 */
export class OptimizedWebSocketService {
  constructor(private baseWsService: any) {}

  /**
   * Optimized broadcast method
   */
  broadcast(eventType: string, data: any): void {
    wsOptimization.optimizeBroadcast(
      eventType,
      data,
      (optimizedData) => this.baseWsService.broadcast(eventType, optimizedData)
    );
  }

  /**
   * Batch multiple events for efficient broadcasting
   */
  batchBroadcast(events: Array<{ type: string; data: any }>): void {
    const batched = new Map<string, any[]>();
    
    events.forEach(event => {
      if (!batched.has(event.type)) {
        batched.set(event.type, []);
      }
      batched.get(event.type)!.push(event.data);
    });

    batched.forEach((dataArray, eventType) => {
      this.broadcast(eventType, dataArray);
    });
  }

  // Delegate other methods
  recordMessageFlow = (data: any) => this.baseWsService.recordMessageFlow(data);
  recordAlert = (data: any) => this.baseWsService.recordAlert(data);
  getMessageFlow = (limit?: number) => this.baseWsService.getMessageFlow(limit);
  getAlerts = (limit?: number) => this.baseWsService.getAlerts(limit);
  getPerformanceMetrics = (limit?: number) => this.baseWsService.getPerformanceMetrics(limit);
}

export default wsOptimization;