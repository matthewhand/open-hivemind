export class CommandTestBuilder {
  private command = '';
  private args: string[] = [];
  private action = '';

  static create(): CommandTestBuilder {
    return new CommandTestBuilder();
  }

  withCommand(cmd: string): CommandTestBuilder {
    this.command = cmd;
    return this;
  }

  withAction(action: string): CommandTestBuilder {
    this.action = action;
    return this;
  }

  withArgs(...args: string[]): CommandTestBuilder {
    this.args = args;
    return this;
  }

  build(): string {
    let result = `!${this.command}`;
    if (this.action) result += `:${this.action}`;
    if (this.args.length > 0) result += ` ${this.args.join(' ')}`;
    return result;
  }

  buildParsed() {
    return {
      commandName: this.command,
      action: this.action,
      args: this.args,
    };
  }
}
