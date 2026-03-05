import { type Command } from 'commander';

export interface CommandHandler {
  setup(program: Command): void;
}
