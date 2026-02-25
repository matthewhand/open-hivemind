import { IProvider } from './IProvider';

export interface IToolInstaller extends IProvider {
  checkPrerequisites(): Promise<{ success: boolean; message?: string }>;
  checkInstalled(): Promise<boolean>;
  install(): Promise<{ success: boolean; message: string }>;
  start?(port?: number): Promise<{ success: boolean; message: string }>;
  getWebUIUrl?(): string;
}
