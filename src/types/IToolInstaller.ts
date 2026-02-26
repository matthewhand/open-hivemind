export interface IToolInstaller {
  id: string;
  label: string;

  checkPrerequisites(): Promise<boolean>;
  checkInstalled(): Promise<boolean>;
  install(): Promise<{ success: boolean; message: string }>;
  start(config?: any): Promise<{ success: boolean; message: string }>;
  getWebUIUrl?(): string;
}
