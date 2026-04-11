import { TTLCache } from '../utils/TTLCache';

export class SwarmCoordinator {
  private static instance: SwarmCoordinator;
  private cache: TTLCache<string, string>;

  private constructor() {
    this.cache = new TTLCache<string, string>(1000 * 60 * 5, 'SwarmCoordinator');
  }

  public static getInstance(): SwarmCoordinator {
    if (!SwarmCoordinator.instance) {
      SwarmCoordinator.instance = new SwarmCoordinator();
    }
    return SwarmCoordinator.instance;
  }

  public claimMessage(messageId: string, botName: string): boolean {
    const existingClaim = this.cache.get(messageId);
    if (existingClaim === undefined) {
      this.cache.set(messageId, botName);
      return true;
    }
    return existingClaim === botName;
  }

  public getClaim(messageId: string): string | undefined {
    return this.cache.get(messageId);
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
