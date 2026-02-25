import { IProvider } from './IProvider';

export interface IMessageProvider extends IProvider {
  type: 'message';
  getBotNames(): string[];
  getBotConfig(name: string): any;
  addBot(config: any): Promise<void>;
  testConnection(config: any): Promise<any>;
}
