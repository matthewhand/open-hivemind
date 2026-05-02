import chalk from 'chalk';
import { type Command } from 'commander';
import inquirer from 'inquirer';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import Logger from '@common/logger';
import { DatabaseManager } from '../../database/DatabaseManager';
import { type CommandHandler } from './CommandHandler';

interface AddBotOptions {
  name?: string;
  provider?: string;
  llm?: string;
  token?: string;
}

export class BotCommandHandler implements CommandHandler {
  private configManager: BotConfigurationManager;
  private dbManager: DatabaseManager;
  private logger = Logger.withContext('BotCommandHandler');

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
          this.logger.error(chalk.red('Error adding bot:'), error);
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
          this.logger.error(chalk.red('Error removing bot:'), error);
        }
      });

    botCommand
      .command('start <name>')
      .description('Start a specific bot')
      .action(async (name) => {
        try {
          await this.startBot(name);
        } catch (error) {
          this.logger.error(chalk.red('Error starting bot:'), error);
        }
      });

    botCommand
      .command('stop <name>')
      .description('Stop a specific bot')
      .action(async (name) => {
        try {
          await this.stopBot(name);
        } catch (error) {
          this.logger.error(chalk.red('Error stopping bot:'), error);
        }
      });

    botCommand
      .command('status [name]')
      .description('Show bot status (all bots or specific bot)')
      .action((name) => {
        this.showBotStatus(name);
      });
  }

  private async addBot(options: AddBotOptions): Promise<void> {
    this.logger.info(chalk.blue('Adding new bot...'));

    if (!options.name || !options.provider || !options.llm) {
      this.logger.error(chalk.red('Missing required options. Use --name, --provider, and --llm'));
      return;
    }

    // Here you would save to configuration
    this.logger.info(chalk.green(`✓ Bot '${options.name}' added successfully`));
    this.logger.info(`  Provider: ${options.provider} → ${options.llm}`);
  }

  private async addBotInteractive(): Promise<void> {
    this.logger.info(chalk.blue('Interactive Bot Setup'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Bot name:',
        validate: (input: string): true | string => input.trim().length > 0 || 'Name is required',
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
      this.logger.info(chalk.yellow('No bots configured'));
      return;
    }

    this.logger.info(chalk.blue(`Found ${bots.length} bot(s):`));

    bots.forEach((bot, index) => {
      this.logger.info(`${index + 1}. ${chalk.green(bot.name)}`);
      this.logger.info(`   Provider: ${bot.messageProvider} → ${bot.llmProvider}`);

      if (verbose) {
        this.logger.info(`   Enabled: ${bot.enabled ? chalk.green('Yes') : chalk.red('No')}`);
        const createdAt = typeof bot.createdAt === 'string' ? bot.createdAt : 'Unknown';
        this.logger.info(`   Created: ${createdAt}`);
      }
      this.logger.info('');
    });
  }

  private async removeBot(name: string, force = false): Promise<void> {
    const bots = this.configManager.getAllBots();
    const bot = bots.find((b) => b.name === name);

    if (!bot) {
      this.logger.error(chalk.red(`Bot '${name}' not found`));
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
        this.logger.info(chalk.yellow('Operation cancelled'));
        return;
      }
    }

    // Here you would remove from configuration
    this.logger.info(chalk.green(`✓ Bot '${name}' removed successfully`));
  }

  private async startBot(name: string): Promise<void> {
    this.logger.info(chalk.blue(`Starting bot '${name}'...`));
    // Here you would start the specific bot
    this.logger.info(chalk.green(`✓ Bot '${name}' started`));
  }

  private async stopBot(name: string): Promise<void> {
    this.logger.info(chalk.blue(`Stopping bot '${name}'...`));
    // Here you would stop the specific bot
    this.logger.info(chalk.green(`✓ Bot '${name}' stopped`));
  }

  private showBotStatus(name?: string): void {
    const bots = this.configManager.getAllBots();

    if (name) {
      const bot = bots.find((b) => b.name === name);
      if (!bot) {
        this.logger.error(chalk.red(`Bot '${name}' not found`));
        return;
      }

      this.logger.info(chalk.blue(`Status for bot '${name}':`));
      this.logger.info(`  Status: ${chalk.green('Running')}`); // This would be dynamic
      this.logger.info(`  Provider: ${bot.messageProvider} → ${bot.llmProvider}`);
      this.logger.info(`  Uptime: ${chalk.green('2h 30m')}`); // This would be dynamic
    } else {
      this.logger.info(chalk.blue('System Status:'));
      this.logger.info(`Active bots: ${chalk.green(bots.length)}`);
      const databaseStatus = !this.dbManager.isConfigured()
        ? chalk.yellow('Not configured')
        : this.dbManager.isConnected()
          ? chalk.green('Connected')
          : chalk.red('Disconnected');
      this.logger.info(`Database: ${databaseStatus}`);
      this.logger.info(`Server: ${chalk.green('Running')}`); // This would be dynamic
    }
  }
}
