import convict from 'convict';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:openWebUIConfig');

const openWebUIConfig = convict({
  OPEN_WEBUI_API_URL: {
    doc: 'Open WebUI API URL',
    format: String,
    default: 'http://host.docker.internal:3000/api/',
    env: 'OPEN_WEBUI_API_URL'
  },
  OPEN_WEBUI_USERNAME: {
    doc: 'Open WebUI username',
    format: String,
    default: 'admin',
    env: 'OPEN_WEBUI_USERNAME'
  },
  OPEN_WEBUI_PASSWORD: {
    doc: 'Open WebUI password',
    format: String,
    default: 'password123',
    env: 'OPEN_WEBUI_PASSWORD',
    sensitive: true
  },
  OPEN_WEBUI_KNOWLEDGE_FILE: {
    doc: 'Path to Open WebUI knowledge file',
    format: String,
    default: '',
    env: 'OPEN_WEBUI_KNOWLEDGE_FILE'
  },
  OPEN_WEBUI_MODEL: {
    doc: 'Default model for Open WebUI completions',
    format: String,
    default: 'llama3.2',
    env: 'OPEN_WEBUI_MODEL'
  }
});

openWebUIConfig.loadFile(path.join(__dirname, '../../config/providers/openwebui.json'));
openWebUIConfig.validate({ allowed: 'strict' });
debug('OpenWebUIConfig initialized:', openWebUIConfig.getProperties());

export default openWebUIConfig;
