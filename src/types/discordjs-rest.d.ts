declare module '@discordjs/rest' {
  export class REST {
    constructor(options?: { version?: string });
    setToken(token: string): this;
    get(endpoint: string, options?: any): Promise<any>;
    post(endpoint: string, options?: any): Promise<any>;
    put(endpoint: string, options?: any): Promise<any>;
    patch(endpoint: string, options?: any): Promise<any>;
    delete(endpoint: string, options?: any): Promise<any>;
  }

  export const Routes: {
    applicationCommands(applicationId: string): string;
    applicationGuildCommands(applicationId: string, guildId: string): string;
  };
}