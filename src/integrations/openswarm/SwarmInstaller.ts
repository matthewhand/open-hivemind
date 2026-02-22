import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

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
      if (!(await this.checkPython())) {
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

  async startSwarm(port = 8000): Promise<{ success: boolean; message: string }> {
    try {
      // Validate port
      const numericPort = typeof port === 'number' ? port : parseInt(String(port), 10);
      if (isNaN(numericPort) || numericPort < 1 || numericPort > 65535) {
        return { success: false, message: `Invalid port: ${port}` };
      }

      // Check if swarm-api command is available
      try {
        await execAsync('swarm-api --help');
      } catch {
        return {
          success: false,
          message: 'OpenSwarm not installed. Run pip install open-swarm first.',
        };
      }

      // Start swarm API server in background using spawn for security (avoid shell injection)
      const child = spawn('swarm-api', ['--port', numericPort.toString()], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      // Wait a moment for startup
      await new Promise((resolve) => setTimeout(resolve, 3000));

      return { success: true, message: `OpenSwarm API started on port ${numericPort}` };
    } catch (error: any) {
      return { success: false, message: `Failed to start: ${error.message}` };
    }
  }

  getSwarmWebUIUrl(): string {
    return process.env.OPENSWARM_WEBUI_URL || 'http://localhost:8002';
  }
}
