export interface IToolInstaller {
  /**
   * Unique identifier for the tool (e.g., 'openswarm').
   */
  id: string;

  /**
   * Human-readable label for the tool.
   */
  label: string;

  /**
   * Checks if the tool's prerequisites are met (e.g., Python installed).
   */
  checkPrerequisites(): Promise<boolean>;

  /**
   * Checks if the tool is installed.
   */
  isInstalled(): Promise<boolean>;

  /**
   * Installs the tool.
   */
  install(): Promise<{ success: boolean; message: string }>;

  /**
   * Starts the tool service.
   */
  start(config?: any): Promise<{ success: boolean; message: string }>;

  /**
   * Returns the URL for the tool's Web UI, if any.
   */
  getWebUIUrl?(): string;
}
