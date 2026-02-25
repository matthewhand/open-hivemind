export interface IToolInstallerCheckResult {
  ok: boolean;
  message?: string;
  details?: any;
}

export interface IToolInstaller {
  id: string;
  name: string;

  checkPrerequisites(): Promise<IToolInstallerCheckResult>;
  isInstalled(): Promise<boolean>;
  install(): Promise<IToolInstallerCheckResult>;
  start?(port?: number): Promise<IToolInstallerCheckResult>;
  getWebUIUrl?(): string;
}
