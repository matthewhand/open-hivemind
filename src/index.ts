import ConfigurationManager from "@config/ConfigurationManager";

const clientId = ConfigurationManager.getConfig<string>('discord.clientId', 'default_client_id');

// rest of the index.ts code remains unchanged...
