export class Database {
  async exec(_sql: string): Promise<void> {
    return;
  }

  async run(..._args: any[]): Promise<this> {
    return this;
  }

  async all(..._args: any[]): Promise<any[]> {
    return [];
  }

  async get(..._args: any[]): Promise<any> {
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
