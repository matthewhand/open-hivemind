import { watch } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

export class ConfigWatcher extends EventEmitter {
  private watchers: Map<string, any> = new Map();
  
  watchConfig(configPath: string) {
    if (this.watchers.has(configPath)) return;
    
    const watcher = watch(configPath, (eventType) => {
      if (eventType === 'change') {
        this.emit('configChanged', configPath);
      }
    });
    
    this.watchers.set(configPath, watcher);
  }
  
  stopWatching(configPath?: string) {
    if (configPath) {
      const watcher = this.watchers.get(configPath);
      if (watcher) {
        watcher.close();
        this.watchers.delete(configPath);
      }
    } else {
      this.watchers.forEach(watcher => watcher.close());
      this.watchers.clear();
    }
  }
}

export const configWatcher = new ConfigWatcher();