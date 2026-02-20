/**
 * Global TypeScript declarations for Open Hivemind
 */

// Extend NodeJS namespace for custom environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    DEBUG?: string;
    DISCORD_BOT_TOKEN?: string;
    OPENAI_API_KEY?: string;
    LLM_PROVIDER?: string;
    OPENAI_MODEL?: string;
    HTTP_ENABLED?: string;
    HTTP_PORT?: string;
    SKIP_MESSENGERS?: string;
  }
}

// Allow importing JSON files
declare module '*.json' {
  const value: any;
  export default value;
}
