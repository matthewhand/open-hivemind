export type { MCPTool, ToolExecutionRecord, ToolResult, RecentToolUsage } from '../../components/mcp-tools';

export interface AlertState {
  type: 'success' | 'error';
  message: string;
}
