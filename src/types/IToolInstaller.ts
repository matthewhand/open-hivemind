export interface IToolInstaller {
  id: string;
  label: string;
  description?: string;

  /**
   * Check if prerequisites for this tool are met
   */
  checkPrerequisites(): Promise<boolean | { success: boolean; message: string }>;

  /**
   * Check if the tool is already installed
   */
  checkInstalled(): Promise<boolean>;

  /**
   * Install the tool
   */
  install(): Promise<{ success: boolean; message: string }>;

  /**
   * Start the tool (if applicable)
   */
  start(config?: any): Promise<{ success: boolean; message: string }>;

  /**
   * Get the status of the tool
   */
  getStatus(): Promise<any>;

  /**
   * Get the URL for the tool's Web UI (if applicable)
   */
  getWebUIUrl?(): string;
}
