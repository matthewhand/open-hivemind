import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MattermostSchema, type MattermostConfig } from './schemas/mattermostSchema';

export { MattermostConfig };
const debug = Debug('app:mattermostConfig');

/**
 * Loads and validates Mattermost configuration using Zod
 */
function loadMattermostConfig(): MattermostConfig {
  const configDir = process.env.NODE_CONFIG_DIR || './config/';
  const configPath = path.join(configDir, 'providers/mattermost.json');
  
   
   
   
  let fileConfig: Record<string, any> = {};
  
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(data);
    } else {
      debug(`Mattermost config file not found at ${configPath}, using environment variables and defaults`);
    }
  } catch (error) {
    debug(`Error reading mattermost config from ${configPath}:`, error);
  }

  // Map environment variables
    
   
   
  const envConfig: Record<string, any> = {};
   
   
    
    
   
   
   
   
  const mapEnv = (envKey: string, configKey: string, parser?: (val: string) => any) => {
    if (process.env[envKey] !== undefined) {
      const val = process.env[envKey] as string;
      envConfig[configKey] = parser ? parser(val) : val;
     
    }
  };

   
   
  const parseIntBase10 = (v: string) => parseInt(v, 10);

  mapEnv('MATTERMOST_SERVER_URL', 'MATTERMOST_SERVER_URL');
  mapEnv('MATTERMOST_TOKEN', 'MATTERMOST_TOKEN');
  mapEnv('MATTERMOST_CHANNEL', 'MATTERMOST_CHANNEL');
  mapEnv('MATTERMOST_TEAM', 'MATTERMOST_TEAM');
  mapEnv('MATTERMOST_WS_RECONNECT_INTERVAL', 'MATTERMOST_WS_RECONNECT_INTERVAL', parseIntBase10);
  mapEnv('MATTERMOST_MAX_MESSAGE_LENGTH', 'MATTERMOST_MAX_MESSAGE_LENGTH', parseIntBase10);

  const combinedConfig = {
    ...fileConfig,
    ...envConfig
  };

  const result = MattermostSchema.safeParse(combinedConfig);
  
  if (!result.success) {
    debug('Mattermost configuration validation failed:', result.error.format());
    if (process.env.NODE_ENV === 'test') {
      throw result.error;
    }
    return MattermostSchema.parse({});
  }

  return result.data;
}
 

const config = loadMattermostConfig();

 
 
const mattermostConfig = {
   
   
  get: (key: keyof MattermostConfig): any => config[key],
  getProperties: (): MattermostConfig => config,
   
   
  getSchema: (): any => zodToJsonSchema(MattermostSchema as any),
  validate: (_options: { allowed: 'strict' | 'warn' }): void => {
    MattermostSchema.parse(config);
  }
};

export default mattermostConfig;
