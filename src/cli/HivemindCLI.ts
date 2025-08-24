#!/usr/bin/env node

import { Command } from 'commander';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

const program = new Command();

program
  .name('hivemind')
  .description('Open-Hivemind CLI Management Tool')
  .version('1.0.0');

program
  .command('status')
  .description('Show bot status')
  .action(() => {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBotConfigs();
    console.log(`Active bots: ${bots.length}`);
    bots.forEach(bot => {
      console.log(`- ${bot.name}: ${bot.messageProvider} -> ${bot.llmProvider}`);
    });
  });

program
  .command('add-bot')
  .description('Add new bot configuration')
  .requiredOption('-n, --name <name>', 'Bot name')
  .requiredOption('-p, --provider <provider>', 'Message provider (discord|slack|mattermost)')
  .requiredOption('-l, --llm <llm>', 'LLM provider (openai|flowise|openwebui)')
  .action((options) => {
    console.log(`Adding bot: ${options.name}`);
    // TODO: Implement bot addition
  });

program
  .command('reload')
  .description('Reload configuration')
  .action(() => {
    console.log('Reloading configuration...');
    // TODO: Implement config reload
  });

program.parse();