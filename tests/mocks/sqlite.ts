export class Database {
  private lastId: number = 1;
  private data: Map<string, any[]> = new Map();

  async exec(_sql: string): Promise<void> {
    return;
  }

  async run(sql: string, ...args: any[]): Promise<{ lastID: number; changes: number }> {
    // Simple mock for INSERT operations
    if (sql.includes('INSERT')) {
      const id = this.lastId++;
      // Store some mock data for retrieval
      if (sql.includes('bot_configurations')) {
        if (!this.data.has('bot_configurations')) {
          this.data.set('bot_configurations', []);
        }
        const configs = this.data.get('bot_configurations')!;
        configs.push({
          id,
          name: args[0],
          messageProvider: args[1],
          llmProvider: args[2],
          persona: args[3],
          systemInstruction: args[4],
          mcpServers: args[5],
          mcpGuard: args[6],
          discord: args[7],
          slack: args[8],
          mattermost: args[9],
          openai: args[10],
          flowise: args[11],
          openwebui: args[12],
          openswarm: args[13],
          isActive: args[14],
          createdAt: args[15],
          updatedAt: args[16],
          createdBy: args[17],
          updatedBy: args[18]
        });
      }
      return { lastID: id, changes: 1 };
    }
    return { lastID: 0, changes: 0 };
  }

  async all(sql: string, ...args: any[]): Promise<any[]> {
    if (sql.includes('SELECT') && sql.includes('bot_configurations')) {
      if (sql.includes('WHERE id =')) {
        const id = args[0];
        const configs = this.data.get('bot_configurations') || [];
        return configs.filter((config: any) => config.id === id);
      } else if (sql.includes('ORDER BY updatedAt DESC')) {
        return this.data.get('bot_configurations') || [];
      }
    }
    return [];
  }

  async get(sql: string, ...args: any[]): Promise<any> {
    if (sql.includes('SELECT') && sql.includes('bot_configurations')) {
      const configs = this.data.get('bot_configurations') || [];
      if (sql.includes('WHERE id =')) {
        const id = args[0];
        return configs.find((config: any) => config.id === id);
      } else if (sql.includes('WHERE name =')) {
        const name = args[0];
        return configs.find((config: any) => config.name === name);
      }
    }
    return undefined;
  }

  async close(): Promise<void> {
    return;
  }
}

export const open = async (_config: any): Promise<Database> => {
  return new Database();
};

export default {
  open,
  Database,
};
