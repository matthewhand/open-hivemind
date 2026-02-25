export interface IToolInstaller {
  id: string;
  label: string;

  checkPrerequisites(): Promise<boolean>;
  install(): Promise<{ success: boolean; message: string }>;
  start(port?: number): Promise<{ success: boolean; message: string }>;
  checkInstalled(): Promise<boolean>;
  getWebUIUrl(): string;
}
