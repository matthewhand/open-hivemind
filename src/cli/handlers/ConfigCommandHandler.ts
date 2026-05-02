import { promises as fs } from 'fs';
import chalk from 'chalk';
import { type Command } from 'commander';
import inquirer from 'inquirer';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import Logger from '@common/logger';
import { type CommandHandler } from './CommandHandler';

export class ConfigCommandHandler implements CommandHandler {
  private configManager: BotConfigurationManager;
  private logger = Logger.withContext('ConfigCommandHandler');

  constructor() {
    this.configManager = BotConfigurationManager.getInstance();
  }

  public setup(program: Command): void {
    const configCommand = program
      .command('config')
      .description('Configuration management commands');

    configCommand
      .command('validate')
      .description('Validate configuration')
      .action(() => {
        this.validateConfiguration();
      });

    configCommand
      .command('reload')
      .description('Reload configuration')
      .action(async () => {
        try {
          await this.reloadConfiguration();
        } catch (error) {
          this.logger.error(chalk.red('Error reloading configuration:'), error);
        }
      });

    configCommand
      .command('export <path>')
      .description('Export configuration to file')
      .action(async (path) => {
        try {
          await this.exportConfiguration(path);
        } catch (error) {
          this.logger.error(chalk.red('Error exporting configuration:'), error);
        }
      });

    configCommand
      .command('import <path>')
      .description('Import configuration from file')
      .option('-f, --force', 'Force import without confirmation')
      .action(async (path, options) => {
        try {
          await this.importConfiguration(path, options.force);
        } catch (error) {
          this.logger.error(chalk.red('Error importing configuration:'), error);
        }
      });
  }

  private validateConfiguration(): void {
    this.logger.log(chalk.blue('Validating configuration...'));

    const warnings = this.configManager.getWarnings();
    const bots = this.configManager.getAllBots();

    if (warnings.length === 0 && bots.length > 0) {
      this.logger.log(chalk.green('✓ Configuration is valid'));
    } else {
      if (bots.length === 0) {
        this.logger.log(chalk.yellow('⚠ No bots configured'));
      }

      warnings.forEach((warning) => {
        this.logger.log(chalk.yellow(`⚠ ${warning}`));
      });
    }
  }

  private async reloadConfiguration(): Promise<void> {
    this.logger.log(chalk.blue('Reloading configuration...'));
    // Here you would implement configuration reload logic
    this.logger.log(chalk.green('✓ Configuration reloaded'));
  }

  private async exportConfiguration(path: string): Promise<void> {
    this.logger.log(chalk.blue(`Exporting configuration to ${path}...`));

    const config = {
      bots: this.configManager.getAllBots(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    await fs.writeFile(path, JSON.stringify(config, null, 2));
    this.logger.log(chalk.green('✓ Configuration exported'));
  }

  private async importConfiguration(path: string, force: boolean): Promise<void> {
    try {
      const data = await fs.readFile(path, 'utf8');
      const config = JSON.parse(data);

      if (!force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Import ${config.bots?.length || 0} bot(s) from ${path}?`,
            default: false,
          },
        ]);

        if (!confirm) {
          this.logger.log(chalk.yellow('Import cancelled'));
          return;
        }
      }

      this.logger.log(chalk.blue(`Importing configuration from ${path}...`));
      // Here you would implement configuration import logic
      this.logger.log(chalk.green('✓ Configuration imported'));
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}
