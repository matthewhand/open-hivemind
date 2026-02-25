import { IProvider } from './IProvider';

export interface IToolInstaller extends IProvider {
  type: 'tool';
  checkPrerequisites(): Promise<boolean>;
  isInstalled(): Promise<boolean>;
  install(): Promise<{ success: boolean; message: string }>;
  start(port?: number): Promise<{ success: boolean; message: string }>;
  getWebUIUrl?(): string;
}
