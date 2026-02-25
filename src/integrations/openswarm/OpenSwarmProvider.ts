import { SwarmInstaller } from './SwarmInstaller';
import { IToolInstaller } from '../../registry/IToolInstaller';
import { ProviderMetadata } from '../../registry/IProvider';

export class OpenSwarmProvider implements IToolInstaller {
  id = 'openswarm';
  label = 'OpenSwarm';
  type = 'tool' as const;

  private installer: SwarmInstaller;

  constructor() {
    this.installer = new SwarmInstaller();
  }

  getMetadata(): ProviderMetadata {
    return {
      id: 'openswarm',
      label: 'OpenSwarm',
      docsUrl: 'https://github.com/hivemind/open-swarm',
      helpText: 'OpenSwarm is a tool orchestration platform.',
      sensitiveFields: ['apiKey'],
    };
  }

  async getStatus(): Promise<any> {
    const pythonAvailable = await this.installer.checkPython();
    const swarmInstalled = await this.installer.checkSwarmInstalled();
    return {
      pythonAvailable,
      swarmInstalled,
      webUIUrl: this.getWebUIUrl(),
    };
  }

  async checkPrerequisites(): Promise<boolean> {
    return this.installer.checkPython();
  }

  async isInstalled(): Promise<boolean> {
    return this.installer.checkSwarmInstalled();
  }

  async install(): Promise<{ success: boolean; message: string }> {
    return this.installer.installSwarm();
  }

  async start(port?: number): Promise<{ success: boolean; message: string }> {
    return this.installer.startSwarm(port);
  }

  getWebUIUrl(): string {
    return this.installer.getSwarmWebUIUrl();
  }
}
