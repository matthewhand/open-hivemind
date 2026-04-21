import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';

const debug = Debug('app:PanicModeService');

@singleton()
@injectable()
export class PanicModeService {
  private panicModeEnabled = false;

  public constructor() {}

  /**
   * Check if Panic Mode is enabled
   */
  public isPanicModeEnabled(): boolean {
    return this.panicModeEnabled;
  }

  /**
   * Set Panic Mode status
   */
  public setPanicMode(enabled: boolean): void {
    debug(`Panic Mode status changed: ${enabled}`);
    this.panicModeEnabled = enabled;
  }

  /**
   * Toggle Panic Mode
   */
  public togglePanicMode(): boolean {
    this.panicModeEnabled = !this.panicModeEnabled;
    debug(`Panic Mode toggled: ${this.panicModeEnabled}`);
    return this.panicModeEnabled;
  }
}
