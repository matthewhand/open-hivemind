export function validateMCPCommand(command: string): { isValid: boolean; error?: string } {
  const trimmedCommand = command.trim();

  // Security validation: Block dangerous shell commands and interpreters
  const blockedCommands = [
    'sh', 'bash', 'zsh', 'dash', 'csh', 'ksh', 'tcsh',
    'cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh',
    'node', 'python', 'python3', 'ruby', 'perl', 'php'
  ];

  const isBlocked = blockedCommands.some((blocked) => {
    const lowerCommand = trimmedCommand.toLowerCase();
    if (lowerCommand === blocked) return true;
    const pattern = new RegExp(`[\\/\\\\]${blocked}$`);
    return pattern.test(lowerCommand);
  });

  if (isBlocked) {
    return { isValid: false, error: 'Command is not allowed for security reasons' };
  }

  const validCommandPatterns = [
    /^[a-zA-Z0-9\-_]+$/,
    /^\.\/[a-zA-Z0-9\-_\/.]+$/,
    /^\/[a-zA-Z0-9\-_\/.]+$/,
    /^[a-zA-Z]:\\[a-zA-Z0-9\-_\/.\\]+$/,
    /^npx [a-zA-Z0-9\-@/.]+$/,
    /^npm run [a-zA-Z0-9\-_]+$/,
  ];

  const isValidCommand = validCommandPatterns.some((pattern) => pattern.test(trimmedCommand));
  if (!isValidCommand) {
    return { isValid: false, error: 'Invalid command format' };
  }

  return { isValid: true };
}
