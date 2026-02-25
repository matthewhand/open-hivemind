export interface IToolInstaller {
  checkPrerequisites(): Promise<boolean>;
  isInstalled(): Promise<boolean>;
  install(): Promise<{ success: boolean; message: string }>;
  start(port?: number): Promise<{ success: boolean; message: string }>;
  getWebUIUrl(): string;
}
