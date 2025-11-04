export class Database {
  private _connected = false;

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
    this._connected = false;
    return;
  }

  configure(_options: any): void {
    // Mock configure method
  }

  get connected(): boolean {
    return this._connected;
  }

  set connected(value: boolean) {
    this._connected = value;
  }
}

export const open = async (_config: any): Promise<Database> => {
  return new Database();
};

export default {
  open,
  Database,
};
