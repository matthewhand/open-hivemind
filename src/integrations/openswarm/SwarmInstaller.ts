import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class SwarmInstaller {
  private installPath: string;

  constructor() {
    this.installPath = path.join(process.cwd(), 'open-swarm');
  }

  async checkPython(): Promise<boolean> {
    try {
      await execAsync('python3 --version');
      return true;
    } catch {
      try {
        await execAsync('python --version');
        return true;
      } catch {
        return false;
      }
    }
  }

  async checkSwarmInstalled(): Promise<boolean> {
    try {
      await execAsync('swarm-cli --version');
      return true;
    } catch {
      return false;
    }
  }

  async installSwarm(): Promise<{ success: boolean; message: string }> {
    try {
      if (!await this.checkPython()) {
        return { success: false, message: 'Python not found. Please install Python 3.10+' };
      }

      if (await this.checkSwarmInstalled()) {
        return { success: true, message: 'OpenSwarm already installed' };
      }

      console.log('Installing OpenSwarm via pip...');
      await execAsync('pip install open-swarm');

      return { success: true, message: 'OpenSwarm installed successfully via pip' };
    } catch (error: any) {
      return { success: false, message: `Installation failed: ${error.message}` };
    }
  }

  async startSwarm(port: number = 8000): Promise<{ success: boolean; message: string }> {
    try {
      // Check if swarm-api command is available
      try {
        await execAsync('swarm-api --help');
      } catch {
        return { success: false, message: 'OpenSwarm not installed. Run pip install open-swarm first.' };
      }

      // Start swarm API server in background
      exec(`swarm-api --port ${port}`);
      
      // Wait a moment for startup
      await new Promise(resolve => setTimeout(resolve, 3000));

      return { success: true, message: `OpenSwarm API started on port ${port}` };
    } catch (error: any) {
      return { success: false, message: `Failed to start: ${error.message}` };
    }
  }

  getSwarmWebUIUrl(): string {
    return process.env.OPENSWARM_WEBUI_URL || 'http://localhost:8002';
  }
}