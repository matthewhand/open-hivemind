import crypto from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { ErrorUtils } from '../common/ErrorUtils';

const debug = Debug('app:ToolUsageGuardsManager');

export type GuardType = 'owner_only' | 'user_list' | 'role_based';

export interface ToolUsageGuard {
  id: string;
  name: string;
  description?: string;
  toolId: string;
  guardType: GuardType;
  allowedUsers: string[];
  allowedRoles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateToolUsageGuardRequest {
  name: string;
  description?: string;
  toolId: string;
  guardType: GuardType;
  allowedUsers?: string[];
  allowedRoles?: string[];
  isActive?: boolean;
}

export interface UpdateToolUsageGuardRequest {
  name: string;
  description?: string;
  toolId: string;
  guardType: GuardType;
  allowedUsers?: string[];
  allowedRoles?: string[];
  isActive?: boolean;
}

export class ToolUsageGuardsManager extends EventEmitter {
  private static instance: ToolUsageGuardsManager;
  private guards = new Map<string, ToolUsageGuard>();
  private guardsFilePath: string;

  private constructor() {
    super();
    this.guardsFilePath = path.join(process.cwd(), 'config', 'user', 'tool-usage-guards.json');
    this.loadGuards();
    debug('ToolUsageGuardsManager initialized');
  }

  public static getInstance(): ToolUsageGuardsManager {
    if (!ToolUsageGuardsManager.instance) {
      ToolUsageGuardsManager.instance = new ToolUsageGuardsManager();
    }
    return ToolUsageGuardsManager.instance;
  }

  private loadGuards(): void {
    try {
      // Clear existing guards (for reload functionality)
      this.guards.clear();

      if (fs.existsSync(this.guardsFilePath)) {
        const data = fs.readFileSync(this.guardsFilePath, 'utf8');
        const guardsData = JSON.parse(data);

        Object.values(guardsData).forEach((guard: any) => {
          if (guard.id) {
            this.guards.set(guard.id, guard);
          }
        });
        debug(`Loaded ${this.guards.size} tool usage guards`);
      } else {
        debug('No tool usage guards file found, starting with empty guards');
      }
    } catch (error: any) {
      debug('Error loading tool usage guards:', ErrorUtils.getMessage(error));
    }
  }

  /**
   * Reload guards from disk (useful for runtime refresh without restart)
   */
  public reloadGuards(): void {
    debug('Reloading tool usage guards from disk');
    this.loadGuards();
    this.emit('guardsReloaded');
  }

  private saveGuards(): void {
    try {
      const guardsDir = path.dirname(this.guardsFilePath);
      if (!fs.existsSync(guardsDir)) {
        fs.mkdirSync(guardsDir, { recursive: true });
      }

      const guardsData: Record<string, ToolUsageGuard> = {};
      for (const [id, guard] of this.guards.entries()) {
        guardsData[id] = guard;
      }

      fs.writeFileSync(this.guardsFilePath, JSON.stringify(guardsData, null, 2));
      debug(`Saved ${this.guards.size} tool usage guards`);
    } catch (error: any) {
      debug('Error saving tool usage guards:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError('Failed to save tool usage guards', 'configuration');
    }
  }

  public getAllGuards(): ToolUsageGuard[] {
    return Array.from(this.guards.values());
  }

  public getGuard(id: string): ToolUsageGuard | undefined {
    return this.guards.get(id);
  }

  public getGuardsByToolId(toolId: string): ToolUsageGuard[] {
    return Array.from(this.guards.values()).filter((guard) => guard.toolId === toolId);
  }

  public getActiveGuardsByToolId(toolId: string): ToolUsageGuard[] {
    return Array.from(this.guards.values()).filter(
      (guard) => guard.toolId === toolId && guard.isActive
    );
  }

  public createGuard(request: CreateToolUsageGuardRequest): ToolUsageGuard {
    const id = crypto.randomUUID();
    const newGuard: ToolUsageGuard = {
      id,
      name: request.name,
      description: request.description,
      toolId: request.toolId,
      guardType: request.guardType,
      allowedUsers: request.allowedUsers || [],
      allowedRoles: request.allowedRoles || [],
      isActive: request.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.guards.set(id, newGuard);
    this.saveGuards();
    this.emit('guardCreated', newGuard);
    return newGuard;
  }

  public updateGuard(id: string, updates: UpdateToolUsageGuardRequest): ToolUsageGuard {
    const existing = this.guards.get(id);
    if (!existing) {
      throw ErrorUtils.createError(`Tool usage guard with ID ${id} not found`, 'not_found');
    }

    const updated: ToolUsageGuard = {
      ...existing,
      name: updates.name,
      description: updates.description,
      toolId: updates.toolId,
      guardType: updates.guardType,
      allowedUsers: updates.allowedUsers || [],
      allowedRoles: updates.allowedRoles || [],
      isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
      updatedAt: new Date().toISOString(),
    };

    this.guards.set(id, updated);
    this.saveGuards();
    this.emit('guardUpdated', updated);
    return updated;
  }

  public deleteGuard(id: string): boolean {
    const existing = this.guards.get(id);
    if (!existing) {
      return false;
    }

    this.guards.delete(id);
    this.saveGuards();
    this.emit('guardDeleted', id);
    return true;
  }

  public toggleGuard(id: string, isActive: boolean): ToolUsageGuard {
    const existing = this.guards.get(id);
    if (!existing) {
      throw ErrorUtils.createError(`Tool usage guard with ID ${id} not found`, 'not_found');
    }

    const updated: ToolUsageGuard = {
      ...existing,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    this.guards.set(id, updated);
    this.saveGuards();
    this.emit('guardToggled', updated);
    return updated;
  }

  /**
   * Check if a user is allowed to use a specific tool based on active guards
   */
  public async isUserAllowedToUseTool(
    userId: string,
    toolId: string,
    userRoles: string[] = []
  ): Promise<{ allowed: boolean; reason?: string }> {
    const activeGuards = this.getActiveGuardsByToolId(toolId);

    // If no guards are configured for this tool, allow access
    if (activeGuards.length === 0) {
      return { allowed: true };
    }

    // Check each active guard
    for (const guard of activeGuards) {
      switch (guard.guardType) {
        case 'owner_only':
          // This would need to be integrated with actual ownership logic
          // For now, we'll check if the user is in the allowed users list
          if (guard.allowedUsers.length > 0 && guard.allowedUsers.includes(userId)) {
            return { allowed: true };
          }
          break;

        case 'user_list':
          if (guard.allowedUsers.includes(userId)) {
            return { allowed: true };
          }
          break;

        case 'role_based':
          const hasRequiredRole = guard.allowedRoles.some((role) => userRoles.includes(role));
          if (hasRequiredRole) {
            return { allowed: true };
          }
          break;
      }
    }

    // If we got here, no guard allowed the user
    return {
      allowed: false,
      reason: `Access denied: User does not have permission to use tool '${toolId}'`,
    };
  }
}
