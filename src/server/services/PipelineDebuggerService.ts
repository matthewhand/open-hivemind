import { EventEmitter } from 'events';
import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';

const debug = Debug('app:PipelineDebuggerService');

export interface Breakpoint {
  id: string;
  stage: string;

  context: any;
  timestamp: string;
}

@singleton()
@injectable()
export class PipelineDebuggerService extends EventEmitter {
  private activeBreakpoints = new Map<string, Breakpoint>();
  private pauseOnStages: string[] = []; // Stages where we should auto-pause

  /**
   * Toggle auto-pause on a specific stage
   */
  public toggleBreakpoint(stage: string): boolean {
    const index = this.pauseOnStages.indexOf(stage);
    if (index === -1) {
      this.pauseOnStages.push(stage);
      debug(`Breakpoint enabled for stage: ${stage}`);
      return true;
    } else {
      this.pauseOnStages.splice(index, 1);
      debug(`Breakpoint disabled for stage: ${stage}`);
      return false;
    }
  }

  /**
   * Check if we should pause on a stage
   */
  public shouldPause(stage: string): boolean {
    return this.pauseOnStages.includes(stage);
  }

  /**
   * Pause execution and wait for manual resume
   */

  public async pause(stage: string, context: any): Promise<any> {
    // eslint-disable-next-line no-restricted-properties
    const id = `bp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const breakpoint: Breakpoint = {
      id,
      stage,
      context,
      timestamp: new Date().toISOString(),
    };

    this.activeBreakpoints.set(id, breakpoint);
    this.emit('paused', breakpoint);
    debug(`Pipeline paused at ${stage}. Breakpoint ID: ${id}`);

    // Return a promise that resolves when 'resume' is called for this ID
    return new Promise((resolve) => {
      const onResume = (resumeId: string, updatedContext: any) => {
        if (resumeId === id) {
          this.off('resume', onResume);
          this.activeBreakpoints.delete(id);
          resolve(updatedContext || context);
        }
      };
      this.on('resume', onResume);
    });
  }

  /**
   * Resume execution for a breakpoint
   */

  public resume(id: string, updatedContext?: any): void {
    if (this.activeBreakpoints.has(id)) {
      debug(`Resuming pipeline for breakpoint: ${id}`);
      this.emit('resume', id, updatedContext);
    }
  }

  public getActiveBreakpoints(): Breakpoint[] {
    return Array.from(this.activeBreakpoints.values());
  }

  public getPausedStages(): string[] {
    return this.pauseOnStages;
  }
}
