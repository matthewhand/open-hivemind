export class SwarmModeManager {
  private static locks = new Map<string, { acquiredAt: number; timeout: number }>();

  /**
   * Checks if swarm mode is enabled based on environment configuration.
   * Swarm mode is considered enabled if multiple bot tokens are configured.
   *
   * @returns True if swarm mode is enabled, false otherwise.
   */
  public static isSwarmModeEnabled(): boolean {
    const tokens = process.env.DISCORD_BOT_TOKEN?.split(',') || [];
    return tokens.length > 1;
  }

  /**
   * Attempts to acquire a lock for a specific key with a timeout.
   * This is a simple in-memory implementation for basic concurrency control.
   * In a production environment, this should use a distributed lock manager like Redis.
   *
   * @param key - The unique key for the lock.
   * @param timeoutMs - The timeout in milliseconds after which the lock expires.
   * @returns A promise resolving to true if the lock was acquired, false otherwise.
   */
  public static async acquireLock(key: string, timeoutMs: number): Promise<boolean> {
    const now = Date.now();
    const existingLock = this.locks.get(key);

    // Check if lock exists and hasn't expired
    if (existingLock && (now - existingLock.acquiredAt) < existingLock.timeout) {
      return false; // Lock is still held
    }

    // Acquire the lock
    this.locks.set(key, { acquiredAt: now, timeout: timeoutMs });
    return true;
  }

  /**
   * Releases a lock for a specific key.
   *
   * @param key - The unique key for the lock to release.
   */
  public static async releaseLock(key: string): Promise<void> {
    this.locks.delete(key);
  }

  /**
   * Cleans up expired locks. This should be called periodically in a production environment.
   */
  public static cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if ((now - lock.acquiredAt) >= lock.timeout) {
        this.locks.delete(key);
      }
    }
  }
}