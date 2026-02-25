import { SwarmInstaller } from '../integrations/openswarm/SwarmInstaller';
import { IToolInstaller } from '../types/IToolInstaller';

export class SwarmInstallerProvider implements IToolInstaller {
  public readonly id = 'swarm';
  public readonly label = 'OpenSwarm';
  private installer: SwarmInstaller;

  constructor() {
    this.installer = new SwarmInstaller();
  }

  async checkPrerequisites(): Promise<boolean | { success: boolean; message: string }> {
    const python = await this.installer.checkPython();
    if (!python) {
      return { success: false, message: 'Python not found' };
    }
    return true;
  }

  async checkInstalled(): Promise<boolean> {
    return this.installer.checkSwarmInstalled();
  }

  async install(): Promise<{ success: boolean; message: string }> {
    return this.installer.installSwarm();
  }

  async start(config?: any): Promise<{ success: boolean; message: string }> {
    const port = config?.port || 8000;
    return this.installer.startSwarm(port);
  }

  async getStatus(): Promise<any> {
    const installed = await this.checkInstalled();
    const python = await this.installer.checkPython();
    return {
      id: this.id,
      label: this.label,
      installed,
      pythonAvailable: python,
      webUIUrl: this.getWebUIUrl(),
    };
  }

  getWebUIUrl(): string {
    return this.installer.getSwarmWebUIUrl();
  }
}
