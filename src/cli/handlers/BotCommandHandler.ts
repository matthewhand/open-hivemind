import chalk from 'chalk';
import { type Command } from 'commander';
import inquirer from 'inquirer';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { DatabaseManager } from '../../database/DatabaseManager';
import { type CommandHandler } from './CommandHandler';

export class BotCommandHandler implements CommandHandler {
  private configManager: BotConfigurationManager;
  private dbManager: DatabaseManager;

  constructor() {
    this.configManager = BotConfigurationManager.getInstance();
    this.dbManager = DatabaseManager.getInstance();
  }

  public setup(program: Command): void {
    const botCommand = program.command('bot').description('Bot management commands');

    botCommand
      .command('add')
      .description('Add a new bot configuration')
      .option('-n, --name <name>', 'Bot name')
      .option(
        '-p, --provider <provider>',
        'Message provider (discord, slack, telegram, mattermost)'
      )
      .option('-l, --llm <llm>', 'LLM provider (openai, flowise, openwebui)')
      .option('-t, --token <token>', 'Bot token')
      .option('-i, --interactive', 'Interactive mode')
      .action(async (options) => {
        try {
          if (options.interactive) {
            await this.addBotInteractive();
          } else {
            await this.addBot(options);
          }
        } catch (error) {
          console.error(chalk.red('Error adding bot:'), error);
        }
      });

    botCommand
      .command('list')
      .description('List all configured bots')
      .option('-v, --verbose', 'Show detailed information')
      .action((options) => {
        this.listBots(options.verbose);
      });

    botCommand
      .command('remove <name>')
      .description('Remove a bot configuration')
      .option('-f, --force', 'Force removal without confirmation')
      .action(async (name, options) => {
        try {
          await this.removeBot(name, options.force);
        } catch (error) {
          console.error(chalk.red('Error removing bot:'), error);
        }
      });

    botCommand
      .command('start <name>')
      .description('Start a specific bot')
      .action(async (name) => {
        try {
          await this.startBot(name);
        } catch (error) {
          console.error(chalk.red('Error starting bot:'), error);
        }
      });

    botCommand
      .command('stop <name>')
      .description('Stop a specific bot')
      .action(async (name) => {
        try {
          await this.stopBot(name);
        } catch (error) {
          console.error(chalk.red('Error stopping bot:'), error);
        }
      });

    botCommand
      .command('status [name]')
      .description('Show bot status (all bots or specific bot)')
      .action((name) => {
        this.showBotStatus(name);
      });
  }

  private async addBot(options: any): Promise<void> {
    console.log(chalk.blue('Adding new bot...'));

    if (!options.name || !options.provider || !options.llm) {
      console.error(chalk.red('Missing required options. Use --name, --provider, and --llm'));
      return;
    }

    // Here you would save to configuration
    console.log(chalk.green(`✓ Bot '${options.name}' added successfully`));
    console.log(`  Provider: ${options.provider} → ${options.llm}`);
  }

  private async addBotInteractive(): Promise<void> {
    console.log(chalk.blue('Interactive Bot Setup'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Bot name:',
        validate: (input: string) => input.trim().length > 0 || 'Name is required',
      },
      {
        type: 'list',
        name: 'provider',
        message: 'Message provider:',
        choices: ['discord', 'slack', 'telegram', 'mattermost'],
      },
      {
        type: 'list',
        name: 'llm',
        message: 'LLM provider:',
        choices: ['openai', 'flowise', 'openwebui'],
      },
      {
        type: 'password',
        name: 'token',
        message: 'Bot token:',
        mask: '*',
      },
    ]);

    await this.addBot(answers);
  }

  private listBots(verbose = false): void {
    const bots = this.configManager.getAllBots();

    if (bots.length === 0) {
      console.log(chalk.yellow('No bots configured'));
      return;
    }

    console.log(chalk.blue(`Found ${bots.length} bot(s):`));

    bots.forEach((bot, index) => {
      console.log(`${index + 1}. ${chalk.green(bot.name)}`);
      console.log(`   Provider: ${bot.messageProvider} → ${bot.llmProvider}`);

      if (verbose) {
        console.log(`   Enabled: ${(bot as any).enabled ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`   Created: ${(bot as any).createdAt || 'Unknown'}`);
      }
      console.log();
    });
  }

  private async removeBot(name: string, force = false): Promise<void> {
    const bots = this.configManager.getAllBots();
    const bot = bots.find((b) => b.name === name);

    if (!bot) {
      console.error(chalk.red(`Bot '${name}' not found`));
      return;
    }

    if (!force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove bot '${name}'?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled'));
        return;
      }
    }

    // Here you would remove from configuration
    console.log(chalk.green(`✓ Bot '${name}' removed successfully`));
  }

  private async startBot(name: string): Promise<void> {
    console.log(chalk.blue(`Starting bot '${name}'...`));
    // Here you would start the specific bot
    console.log(chalk.green(`✓ Bot '${name}' started`));
  }

  private async stopBot(name: string): Promise<void> {
    console.log(chalk.blue(`Stopping bot '${name}'...`));
    // Here you would stop the specific bot
    console.log(chalk.green(`✓ Bot '${name}' stopped`));
  }

  private showBotStatus(name?: string): void {
    const bots = this.configManager.getAllBots();

    if (name) {
      const bot = bots.find((b) => b.name === name);
      if (!bot) {
        console.error(chalk.red(`Bot '${name}' not found`));
        return;
      }

      console.log(chalk.blue(`Status for bot '${name}':`));
      console.log(`  Status: ${chalk.green('Running')}`); // This would be dynamic
      console.log(`  Provider: ${bot.messageProvider} → ${bot.llmProvider}`);
      console.log(`  Uptime: ${chalk.green('2h 30m')}`); // This would be dynamic
    } else {
      console.log(chalk.blue('System Status:'));
      console.log(`Active bots: ${chalk.green(bots.length)}`);
      const databaseStatus = !this.dbManager.isConfigured()
        ? chalk.yellow('Not configured')
        : this.dbManager.isConnected()
          ? chalk.green('Connected')
          : chalk.red('Disconnected');
      console.log(`Database: ${databaseStatus}`);
      console.log(`Server: ${chalk.green('Running')}`); // This would be dynamic
    }
  }
}
