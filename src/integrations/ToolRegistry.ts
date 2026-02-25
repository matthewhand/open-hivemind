import { IToolInstaller } from '../types/IToolInstaller';

class ToolRegistry {
  private installers: Map<string, IToolInstaller> = new Map();

  register(installer: IToolInstaller) {
    console.log(`[ToolRegistry] Registering tool installer: ${installer.id}`);
    this.installers.set(installer.id, installer);
  }

  get(id: string): IToolInstaller | undefined {
    return this.installers.get(id);
  }

  getAll(): IToolInstaller[] {
    return Array.from(this.installers.values());
  }
}

export const toolRegistry = new ToolRegistry();
