/**
 * IMCPService Interface
 *
 * Abstraction for the MCP (Model Context Protocol) Service singleton.
 * This interface allows for easier testing and decoupling from the concrete implementation.
 */

import { type MCPConfig as MCPServerConfig, type MCPTool } from '../../mcp/MCPService';

export interface IMCPService {
  /**
   * Connects to an MCP server
   * @param config - Server configuration
   * @returns true if connected successfully
   */
  connectToServer(config: MCPServerConfig): Promise<boolean>;

  /**
   * Disconnects from an MCP server
   * @param serverName - Name of the server to disconnect
   */
  disconnectFromServer(serverName: string): Promise<void>;

  /**
   * Gets all available tools from connected servers
   * @returns Map of server names to their tools
   */
  getAllTools(): Map<string, MCPTool[]>;

  /**
   * Gets tools for a specific server
   * @param serverName - Server name
   * @returns Array of tools or undefined
   */
  getToolsForServer(serverName: string): MCPTool[] | undefined;

  /**
   * Executes a tool
   * @param serverName - Server name
   * @param toolName - Tool name
   * @param args - Tool arguments
   * @returns Tool result
   */
  executeTool(serverName: string, toolName: string, args: Record<string, any>): Promise<any>;

  /**
   * Gets list of connected servers
   * @returns Array of server names
   */
  getConnectedServers(): string[];

  /**
   * Checks if a server is connected
   * @param serverName - Server name
   * @returns true if connected
   */
  isServerConnected(serverName: string): boolean;
}
