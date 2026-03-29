import type { McpGuardConfig } from '@src/types/config';
import Logger from '@src/common/logger';

export class ToolUsageGuards {
  /**
   * Checks if a user is allowed to use a specific tool/command based on guard configuration.
   *
   * @param userId - The ID of the user requesting access.
   * @param toolName - The name of the tool/command being requested.
   * @param guardConfig - Optional MCP guard configuration to evaluate against.
   * @param ownerId - Optional owner ID (required for 'owner' type guards).
   * @returns A promise resolving to true if the user is allowed, false otherwise.
   */
  public static async isUserAllowed(
    userId: string,
    toolName: string,
    guardConfig?: McpGuardConfig | null,
    ownerId?: string
  ): Promise<boolean> {
    // If no guard configuration or guards are disabled, allow access
    if (!guardConfig || !guardConfig.enabled) {
      Logger.debug('ToolUsageGuards: No guard configuration or guards disabled, allowing access', {
        userId,
        toolName,
      });
      return true;
    }

    // Check user-level permissions first
    const userAllowed = await this.checkUserPermission(userId, guardConfig, ownerId);
    if (!userAllowed) {
      Logger.warn('ToolUsageGuards: User not allowed by guard configuration', {
        userId,
        toolName,
        guardType: guardConfig.type,
      });
      return false;
    }

    // Check tool-specific permissions
    const toolAllowed = this.checkToolPermission(toolName, guardConfig);
    if (!toolAllowed) {
      Logger.warn('ToolUsageGuards: Tool not allowed by guard configuration', {
        userId,
        toolName,
        allowedTools: guardConfig.allowedTools,
      });
      return false;
    }

    Logger.debug('ToolUsageGuards: Access granted', { userId, toolName });
    return true;
  }

  /**
   * Checks if a user is allowed to use any tools based on guard configuration.
   *
   * @param userId - The ID of the user requesting access.
   * @param guardConfig - Optional MCP guard configuration to evaluate against.
   * @param ownerId - Optional owner ID (required for 'owner' type guards).
   * @returns A promise resolving to true if the user is allowed to use tools, false otherwise.
   */
  public static async canUseTools(
    userId: string,
    guardConfig?: McpGuardConfig | null,
    ownerId?: string
  ): Promise<boolean> {
    // If no guard configuration or guards are disabled, allow access
    if (!guardConfig || !guardConfig.enabled) {
      Logger.debug('ToolUsageGuards: No guard configuration or guards disabled, allowing tools', {
        userId,
      });
      return true;
    }

    // Check user-level permissions
    const userAllowed = await this.checkUserPermission(userId, guardConfig, ownerId);
    if (!userAllowed) {
      Logger.warn('ToolUsageGuards: User not allowed to use tools by guard configuration', {
        userId,
        guardType: guardConfig.type,
      });
      return false;
    }

    Logger.debug('ToolUsageGuards: User allowed to use tools', { userId });
    return true;
  }

  /**
   * Checks if a user has permission based on the guard configuration.
   *
   * @param userId - The ID of the user.
   * @param guardConfig - The MCP guard configuration.
   * @param ownerId - Optional owner ID (required for 'owner' type guards).
   * @returns Whether the user has permission.
   */
  private static async checkUserPermission(
    userId: string,
    guardConfig: McpGuardConfig,
    ownerId?: string
  ): Promise<boolean> {
    // Check based on guard type
    switch (guardConfig.type) {
      case 'owner':
        // Only the owner can use tools
        if (!ownerId) {
          Logger.error('ToolUsageGuards: Owner ID required for owner-type guard but not provided', {
            userId,
          });
          return false;
        }
        return userId === ownerId;

      case 'custom':
        // Check against allowed users list
        if (!guardConfig.allowedUsers || !Array.isArray(guardConfig.allowedUsers)) {
          Logger.warn('ToolUsageGuards: Custom guard type but no allowedUsers list configured', {
            userId,
          });
          return false;
        }
        return guardConfig.allowedUsers.includes(userId);

      default:
        Logger.error('ToolUsageGuards: Unknown guard type', {
          userId,
          guardType: guardConfig.type,
        });
        return false;
    }
  }

  /**
   * Checks if a specific tool is allowed based on the guard configuration.
   *
   * @param toolName - The name of the tool.
   * @param guardConfig - The MCP guard configuration.
   * @returns Whether the tool is allowed.
   */
  private static checkToolPermission(toolName: string, guardConfig: McpGuardConfig): boolean {
    // If no tool restrictions are configured, allow all tools
    if (!guardConfig.allowedTools || !Array.isArray(guardConfig.allowedTools)) {
      return true;
    }

    // If allowedTools list is empty, allow all tools
    if (guardConfig.allowedTools.length === 0) {
      return true;
    }

    // Check if the tool is in the allowed list
    return guardConfig.allowedTools.includes(toolName);
  }
}