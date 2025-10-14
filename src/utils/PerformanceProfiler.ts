import Debug from 'debug';
import * as v8 from 'v8';
import * as fs from 'fs';
import * as path from 'path';

const debug = Debug('app:PerformanceProfiler');

interface PerformanceSnapshot {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  heapStatistics: v8.HeapInfo;
  cpuUsage?: NodeJS.CpuUsage;
}

interface MethodProfile {
  methodName: string;
  className?: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  lastExecutionTime: number;
  errorCount: number;
}

interface PerformanceReport {
  timestamp: number;
  duration: number;
  memory: {
    initial: PerformanceSnapshot;
    final: PerformanceSnapshot;
    delta: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
  };
  methods: MethodProfile[];
  alerts: string[];
}

export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private isProfiling = false;
  private snapshots: PerformanceSnapshot[] = [];
  private methodProfiles: Map<string, MethodProfile> = new Map();
  private startTime: number = 0;
  private profileName: string = 'default';
  private maxSnapshots: number = 50;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxProfileAge: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    // Start automatic cleanup
    this.startAutomaticCleanup();
  }

  public static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  /**
   * Start performance profiling
   */
  public startProfiling(profileName = 'default'): void {
    if (this.isProfiling) {
      debug('Profiling already in progress');
      return;
    }

    this.isProfiling = true;
    this.profileName = profileName;
    this.startTime = Date.now();
    this.snapshots = [];
    this.methodProfiles.clear();

    // Take initial snapshot
    this.takeSnapshot();

    debug(`Performance profiling started: ${profileName}`);
  }

  /**
   * Stop performance profiling and generate report
   */
  public stopProfiling(): PerformanceReport | null {
    if (!this.isProfiling) {
      debug('No profiling in progress');
      return null;
    }

    this.isProfiling = false;

    // Take final snapshot
    this.takeSnapshot();

    const report = this.generateReport();
    debug(`Performance profiling stopped: ${this.profileName}`);

    return report;
  }

  /**
   * Profile a method execution
   */
  public profileMethod<T>(
    methodName: string,
    fn: () => T,
    className?: string
  ): T {
    if (!this.isProfiling) {
      return fn();
    }

    const startTime = process.hrtime.bigint();
    let result: T;
    let error: Error | null = null;

    try {
      result = fn();
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      this.recordMethodExecution(methodName, className, executionTime, !!error);
    }

    return result;
  }

  /**
   * Profile an async method execution
   */
  public async profileMethodAsync<T>(
    methodName: string,
    fn: () => Promise<T>,
    className?: string
  ): Promise<T> {
    if (!this.isProfiling) {
      return fn();
    }

    const startTime = process.hrtime.bigint();
    let result: T;
    let error: Error | null = null;

    try {
      result = await fn();
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      this.recordMethodExecution(methodName, className, executionTime, !!error);
    }

    return result;
  }

  /**
   * Take a performance snapshot
   */
  public takeSnapshot(): void {
    const timestamp = Date.now();
    const memoryUsage = process.memoryUsage();

    // Get heap statistics if available
    let heapStatistics: v8.HeapInfo;
    try {
      heapStatistics = v8.getHeapStatistics();
    } catch (error) {
      // Fallback for environments where v8.getHeapStatistics is not available
      heapStatistics = {
        total_heap_size: memoryUsage.heapTotal,
        used_heap_size: memoryUsage.heapUsed,
        external_memory: memoryUsage.external,
        heap_size_limit: 0,
        malloced_memory: 0,
        peak_malloced_memory: 0,
        does_zap_garbage: false,
        number_of_native_contexts: 0,
        number_of_detached_contexts: 0
      } as any;
    }

    const snapshot: PerformanceSnapshot = {
      timestamp,
      memoryUsage,
      heapStatistics,
      cpuUsage: process.cpuUsage()
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    debug(`Performance snapshot taken at ${new Date(timestamp).toISOString()}`);
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): {
    memoryUsage: NodeJS.MemoryUsage;
    heapStatistics: v8.HeapInfo;
    methodProfiles: MethodProfile[];
  } {
    const memoryUsage = process.memoryUsage();
    let heapStatistics: v8.HeapInfo;

    try {
      heapStatistics = v8.getHeapStatistics();
    } catch (error) {
      heapStatistics = {
        total_heap_size: memoryUsage.heapTotal,
        used_heap_size: memoryUsage.heapUsed,
        external_memory: memoryUsage.external,
        heap_size_limit: 0,
        malloced_memory: 0,
        peak_malloced_memory: 0,
        does_zap_garbage: false,
        number_of_native_contexts: 0,
        number_of_detached_contexts: 0
      } as any;
    }

    return {
      memoryUsage,
      heapStatistics,
      methodProfiles: Array.from(this.methodProfiles.values())
    };
  }

  /**
   * Export performance data to file
   */
  public exportToFile(filename?: string): string {
    const exportData = {
      profileName: this.profileName,
      startTime: this.startTime,
      snapshots: this.snapshots,
      methodProfiles: Array.from(this.methodProfiles.entries()),
      currentMetrics: this.getCurrentMetrics()
    };

    const fileName = filename || `performance-profile-${this.profileName}-${Date.now()}.json`;
    const filePath = path.join(process.cwd(), 'logs', fileName);

    // Ensure logs directory exists
    const logsDir = path.dirname(filePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    debug(`Performance data exported to: ${filePath}`);

    return filePath;
  }

  
  private recordMethodExecution(
    methodName: string,
    className: string | undefined,
    executionTime: number,
    hadError: boolean
  ): void {
    const key = className ? `${className}.${methodName}` : methodName;

    if (!this.methodProfiles.has(key)) {
      this.methodProfiles.set(key, {
        methodName,
        className,
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        minExecutionTime: Number.MAX_VALUE,
        maxExecutionTime: 0,
        lastExecutionTime: 0,
        errorCount: 0
      });
    }

    const profile = this.methodProfiles.get(key)!;
    profile.executionCount++;
    profile.totalExecutionTime += executionTime;
    profile.averageExecutionTime = profile.totalExecutionTime / profile.executionCount;
    profile.minExecutionTime = Math.min(profile.minExecutionTime, executionTime);
    profile.maxExecutionTime = Math.max(profile.maxExecutionTime, executionTime);
    profile.lastExecutionTime = executionTime;

    if (hadError) {
      profile.errorCount++;
    }
  }

  private generateReport(): PerformanceReport {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const initialSnapshot = this.snapshots[0];
    const finalSnapshot = this.snapshots[this.snapshots.length - 1];

    const memoryDelta = {
      rss: finalSnapshot.memoryUsage.rss - initialSnapshot.memoryUsage.rss,
      heapTotal: finalSnapshot.memoryUsage.heapTotal - initialSnapshot.memoryUsage.heapTotal,
      heapUsed: finalSnapshot.memoryUsage.heapUsed - initialSnapshot.memoryUsage.heapUsed,
      external: finalSnapshot.memoryUsage.external - initialSnapshot.memoryUsage.external,
      arrayBuffers: finalSnapshot.memoryUsage.arrayBuffers - initialSnapshot.memoryUsage.arrayBuffers
    };

    const alerts: string[] = [];

    // Generate alerts for performance issues
    if (memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB increase
      alerts.push(`High memory usage increase: +${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check for slow methods
    const slowMethods = Array.from(this.methodProfiles.values())
      .filter(profile => profile.averageExecutionTime > 1000) // Methods taking > 1 second on average
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime);

    if (slowMethods.length > 0) {
      alerts.push(`Slow methods detected: ${slowMethods.slice(0, 3).map(m => `${m.methodName} (${m.averageExecutionTime.toFixed(2)}ms)`).join(', ')}`);
    }

    // Check for methods with high error rates
    const errorProneMethods = Array.from(this.methodProfiles.values())
      .filter(profile => profile.executionCount > 10 && (profile.errorCount / profile.executionCount) > 0.1) // > 10% error rate
      .sort((a, b) => (b.errorCount / b.executionCount) - (a.errorCount / a.executionCount));

    if (errorProneMethods.length > 0) {
      alerts.push(`Error-prone methods: ${errorProneMethods.slice(0, 3).map(m => `${m.methodName} (${((m.errorCount / m.executionCount) * 100).toFixed(1)}% errors)`).join(', ')}`);
    }

    return {
      timestamp: endTime,
      duration,
      memory: {
        initial: initialSnapshot,
        final: finalSnapshot,
        delta: memoryDelta
      },
      methods: Array.from(this.methodProfiles.values()),
      alerts
    };
  }
}

/**
 * Decorator for profiling method execution
 */
export function Profile(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  const className = target.constructor.name;

  descriptor.value = function (...args: any[]) {
    const profiler = PerformanceProfiler.getInstance();
    return profiler.profileMethod(propertyName, () => method.apply(this, args), className);
  };
}

/**
 * Decorator for profiling async method execution
 */
export function ProfileAsync(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  const className = target.constructor.name;

  descriptor.value = async function (...args: any[]) {
    const profiler = PerformanceProfiler.getInstance();
    return profiler.profileMethodAsync(propertyName, () => method.apply(this, args), className);
  };
}

/**
   * Start automatic cleanup interval
   */
  private startAutomaticCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hour

    debug('Automatic cleanup started');
  }

  /**
   * Stop automatic cleanup interval
   */
  private stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      debug('Automatic cleanup stopped');
    }
  }

  /**
   * Clean up old performance data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const cutoffTime = now - this.maxProfileAge;
    let cleanedSnapshots = 0;
    let cleanedProfiles = 0;

    // Clean old snapshots
    const originalSnapshotLength = this.snapshots.length;
    this.snapshots = this.snapshots.filter(snapshot => snapshot.timestamp > cutoffTime);
    cleanedSnapshots = originalSnapshotLength - this.snapshots.length;

    // Clean old method profiles
    const originalProfileCount = this.methodProfiles.size;
    for (const [key, profile] of this.methodProfiles.entries()) {
      if (profile.lastExecutionTime < cutoffTime) {
        this.methodProfiles.delete(key);
        cleanedProfiles++;
      }
    }

    if (cleanedSnapshots > 0 || cleanedProfiles > 0) {
      debug(`Cleanup completed: ${cleanedSnapshots} snapshots, ${cleanedProfiles} profiles removed`);
    }
  }

  /**
   * Force cleanup of old data
   */
  public forceCleanup(): void {
    this.cleanupOldData();
  }

  /**
   * Set cleanup configuration
   */
  public setCleanupConfig(config: {
    maxSnapshots?: number;
    maxProfileAge?: number;
    cleanupIntervalMinutes?: number;
  }): void {
    if (config.maxSnapshots !== undefined) {
      this.maxSnapshots = config.maxSnapshots;
    }

    if (config.maxProfileAge !== undefined) {
      this.maxProfileAge = config.maxProfileAge;
    }

    if (config.cleanupIntervalMinutes !== undefined) {
      this.stopAutomaticCleanup();
      if (config.cleanupIntervalMinutes > 0) {
        this.cleanupInterval = setInterval(() => {
          this.cleanupOldData();
        }, config.cleanupIntervalMinutes * 60 * 1000);
      }
    }

    debug(`Cleanup config updated: maxSnapshots=${this.maxSnapshots}, maxAge=${this.maxProfileAge}ms`);
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryUsage(): {
    snapshotsCount: number;
    profilesCount: number;
    estimatedMemoryUsage: number;
  } {
    const snapshotSize = JSON.stringify(this.snapshots).length * 2; // Rough estimate
    const profilesSize = Array.from(this.methodProfiles.entries())
      .reduce((size, [key, profile]) => size + key.length + JSON.stringify(profile).length * 2, 0);

    return {
      snapshotsCount: this.snapshots.length,
      profilesCount: this.methodProfiles.size,
      estimatedMemoryUsage: snapshotSize + profilesSize
    };
  }

  /**
   * Cleanup method for graceful shutdown
   */
  public destroy(): void {
    this.stopAutomaticCleanup();
    this.clear();
    debug('PerformanceProfiler destroyed');
  }

  /**
   * Enhanced clear method with better cleanup
   */
  public clear(): void {
    this.snapshots = [];
    this.methodProfiles.clear();
    this.startTime = 0;
    debug('Performance profiling data cleared');
  }

export default PerformanceProfiler;