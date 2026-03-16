#!/usr/bin/env node
import { Command } from 'commander';
import { BotCommandHandler } from './handlers/BotCommandHandler';
import { ConfigCommandHandler } from './handlers/ConfigCommandHandler';
import { DatabaseCommandHandler } from './handlers/DatabaseCommandHandler';
import { ServerCommandHandler } from './handlers/ServerCommandHandler';

export class HivemindCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program.name('hivemind').description('Hivemind AI Bot Management CLI').version('1.0.0');

    // Bot management commands
    new BotCommandHandler().setup(this.program);

    // Database commands
    new DatabaseCommandHandler().setup(this.program);

    // Server management commands
    new ServerCommandHandler().setup(this.program);

    // Configuration commands
    new ConfigCommandHandler().setup(this.program);
  }

  public run(argv: string[]): void {
    this.program.parse(argv);
  }
}

// Create and export CLI instance for direct usage
const cli = new HivemindCLI();

// If this file is run directly, execute the CLI
if (require.main === module) {
  cli.run(process.argv);
}

export default cli;
