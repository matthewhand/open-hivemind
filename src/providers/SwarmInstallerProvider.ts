import { SwarmInstaller } from '../integrations/openswarm/SwarmInstaller';
import { IToolInstaller } from '../types/IProvider';

export class SwarmInstallerProvider implements IToolInstaller {
  id = 'openswarm';
  label = 'OpenSwarm';
  type = 'tool' as const;

  private installer: SwarmInstaller;

  constructor() {
    this.installer = new SwarmInstaller();
  }

  getSchema() {
    return {};
  }

  getSensitiveKeys() {
    return [];
  }

  async checkPrerequisites() {
    return this.installer.checkPython();
  }

  async checkInstalled() {
    return this.installer.checkSwarmInstalled();
  }

  async install() {
    return this.installer.installSwarm();
  }

  async start(config?: any) {
    return this.installer.startSwarm(config?.port);
  }

  getWebUIUrl() {
    return this.installer.getSwarmWebUIUrl();
  }
}
