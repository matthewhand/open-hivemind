function parse(input: string): { command: string; args: string[] } | null {
  // Only process messages that start with the '!' prefix.
  if (!input.startsWith('!')) {
    return null;
  }
  const body: string = input.slice(1).trim();
  if (!body) return null;
  // Split the remaining text into command and arguments.
  const parts: string[] = body.split(/\s+/);
  const command: string = parts[0];
  const args: string[] = parts.slice(1);
  return { command, args };
}

export { parse };
