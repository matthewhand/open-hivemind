export interface MCPGuardConfig {
  /**
   * Whether MCP tool usage is guarded
   */
  enabled: boolean;
  
  /**
   * Type of guard to apply
   * - 'owner': Only the forum owner can use MCP tools
   * - 'custom': Only users in the allowedUserIds list can use MCP tools
   */
  type: 'owner' | 'custom';
  
  /**
   * List of user IDs allowed to use MCP tools (used when type is 'custom')
   */
  allowedUserIds?: string[];
}

export class MCPGuard {
  /**
   * Check if a user is allowed to use MCP tools based on the guard configuration
   * 
   * @param userId - The ID of the user attempting to use an MCP tool
   * @param forumOwnerId - The ID of the forum owner
   * @param guardConfig - The MCP guard configuration
   * @returns Whether the user is allowed to use MCP tools
   */
  public static isUserAllowed(userId: string, forumOwnerId: string, guardConfig: MCPGuardConfig): boolean {
    // If guards are disabled, allow all users
    if (!guardConfig.enabled) {
      return true;
    }
    
    // Check based on guard type
    switch (guardConfig.type) {
    case 'owner':
      // Only the forum owner can use MCP tools
      return userId === forumOwnerId;
        
    case 'custom':
      // Only users in the allowed list can use MCP tools
      return !!guardConfig.allowedUserIds && guardConfig.allowedUserIds.includes(userId);
        
    default:
      // Default to denying access if configuration is invalid
      return false;
    }
  }
  
  /**
   * Validate MCP guard configuration
   * 
   * @param guardConfig - The MCP guard configuration to validate
   * @returns Whether the configuration is valid
   */
  public static validateConfig(guardConfig: MCPGuardConfig): boolean {
    // Guard must have a valid type
    if (!guardConfig.type || !['owner', 'custom'].includes(guardConfig.type)) {
      return false;
    }
    
    // If using custom guard, must have allowedUserIds array
    if (guardConfig.type === 'custom' && (!guardConfig.allowedUserIds || !Array.isArray(guardConfig.allowedUserIds))) {
      return false;
    }
    
    return true;
  }
}