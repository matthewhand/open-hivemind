import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:ToolPreferencesService');

export interface ToolPreference {
  toolId: string; // Format: serverName-toolName
  serverName: string;
  toolName: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

interface ToolPreferencesData {
  preferences: Record<string, ToolPreference>;
  lastUpdated: string;
}

export class ToolPreferencesService {
  private static instance: ToolPreferencesService;
  private dataFile: string;
  private data: ToolPreferencesData;
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    this.dataFile = path.join(dataDir, 'tool-preferences.json');
    this.data = {
      preferences: {},
      lastUpdated: new Date().toISOString(),
    };
    this.initializeData();
  }

  public static getInstance(): ToolPreferencesService {
    if (!ToolPreferencesService.instance) {
      ToolPreferencesService.instance = new ToolPreferencesService();
    }
    return ToolPreferencesService.instance;
  }

  private async initializeData(): Promise<void> {
    try {
      const dataDir = path.dirname(this.dataFile);
      await fs.promises.mkdir(dataDir, { recursive: true });

      // Try to load existing data
      try {
        const content = await fs.promises.readFile(this.dataFile, 'utf8');
        this.data = JSON.parse(content);
        debug('Loaded tool preferences from file');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          debug('No existing tool preferences file, starting fresh');
          await this.saveData();
        } else {
          throw error;
        }
      }
    } catch (error) {
      debug('Failed to initialize tool preferences data: %O', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      this.data.lastUpdated = new Date().toISOString();
      await fs.promises.writeFile(
        this.dataFile,
        JSON.stringify(this.data, null, 2),
        'utf8'
      );
      debug('Saved tool preferences to file');
    } catch (error) {
      debug('Failed to save tool preferences: %O', error);
      throw error;
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveData().catch(error => {
        debug('Failed to save tool preferences: %O', error);
      });
    }, 1000);
  }

  public async setToolEnabled(
    toolId: string,
    serverName: string,
    toolName: string,
    enabled: boolean,
    userId?: string
  ): Promise<ToolPreference> {
    const preference: ToolPreference = {
      toolId,
      serverName,
      toolName,
      enabled,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    this.data.preferences[toolId] = preference;
    this.debouncedSave();

    debug(`Set tool ${toolId} enabled=${enabled}`);
    return preference;
  }

  public async bulkSetToolsEnabled(
    tools: Array<{ toolId: string; serverName: string; toolName: string }>,
    enabled: boolean,
    userId?: string
  ): Promise<ToolPreference[]> {
    const preferences: ToolPreference[] = [];

    for (const tool of tools) {
      const preference: ToolPreference = {
        toolId: tool.toolId,
        serverName: tool.serverName,
        toolName: tool.toolName,
        enabled,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      this.data.preferences[tool.toolId] = preference;
      preferences.push(preference);
    }

    this.debouncedSave();

    debug(`Bulk set ${tools.length} tools enabled=${enabled}`);
    return preferences;
  }

  public getToolPreference(toolId: string): ToolPreference | null {
    return this.data.preferences[toolId] || null;
  }

  public getAllPreferences(): Record<string, ToolPreference> {
    return { ...this.data.preferences };
  }

  public getPreferencesByServer(serverName: string): ToolPreference[] {
    return Object.values(this.data.preferences).filter(
      pref => pref.serverName === serverName
    );
  }

  public isToolEnabled(toolId: string): boolean {
    const preference = this.data.preferences[toolId];
    // Default to enabled if no preference is set
    return preference ? preference.enabled : true;
  }

  public async deletePreference(toolId: string): Promise<boolean> {
    if (this.data.preferences[toolId]) {
      delete this.data.preferences[toolId];
      this.debouncedSave();
      debug(`Deleted preference for tool ${toolId}`);
      return true;
    }
    return false;
  }

  public async deletePreferencesByServer(serverName: string): Promise<number> {
    const toolIds = Object.keys(this.data.preferences).filter(
      toolId => this.data.preferences[toolId].serverName === serverName
    );

    for (const toolId of toolIds) {
      delete this.data.preferences[toolId];
    }

    if (toolIds.length > 0) {
      this.debouncedSave();
      debug(`Deleted ${toolIds.length} preferences for server ${serverName}`);
    }

    return toolIds.length;
  }

  public getStats(): {
    totalPreferences: number;
    enabledCount: number;
    disabledCount: number;
    serverCounts: Record<string, { enabled: number; disabled: number }>;
  } {
    const preferences = Object.values(this.data.preferences);
    const stats = {
      totalPreferences: preferences.length,
      enabledCount: preferences.filter(p => p.enabled).length,
      disabledCount: preferences.filter(p => !p.enabled).length,
      serverCounts: {} as Record<string, { enabled: number; disabled: number }>,
    };

    preferences.forEach(pref => {
      if (!stats.serverCounts[pref.serverName]) {
        stats.serverCounts[pref.serverName] = { enabled: 0, disabled: 0 };
      }
      if (pref.enabled) {
        stats.serverCounts[pref.serverName].enabled++;
      } else {
        stats.serverCounts[pref.serverName].disabled++;
      }
    });

    return stats;
  }
}
