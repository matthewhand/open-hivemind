import { execFile } from 'child_process';
import fs from 'fs';
import util from 'util';
import Debug from 'debug';

const debug = Debug('app:utils');

/**
 * Executes a shell command safely with arguments array.
 * This is the recommended approach to prevent command injection.
 *
 * @param command - The command to execute (must be a single command, no shell metacharacters).
 * @param args - Array of arguments to pass to the command.
 * @param options - Optional spawn options.
 * @returns A promise that resolves to the command output.
 * @example
 * // Safe - arguments are passed as array, not concatenated
 * const output = await executeCommandSafe('ls', ['-la', '/tmp']);
 */
async function executeCommandSafe(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {}
): Promise<string> {
  debug('Executing command safely: ' + command + ' ' + args.join(' '));

  const execFilePromise = util.promisify(execFile);

  try {
    const { stdout, stderr } = await execFilePromise(command, args, {
      cwd: options.cwd,
      env: options.env,
      timeout: options.timeout || 30000,
      shell: false, // Never use shell - this prevents injection
    });

    if (stderr) {
      debug('Command stderr: ' + stderr);
    }
    debug('Command stdout: ' + stdout);
    return stdout;
  } catch (err: any) {
    debug('Command execution error: ' + err.message);
    throw err;
  }
}

/**
 * Reads a file and returns its content.
 *
 * @param filePath - The path to the file.
 * @returns A promise that resolves to the file content.
 */
export async function readFile(filePath: string): Promise<string> {
  debug('Reading file: ' + filePath);
  if (!filePath || filePath === '') {
    throw new Error('Invalid file path');
  }

  // Use async file operations for consistency
  const stat = fs.promises.stat;
  const readFileAsync = fs.promises.readFile;

  const stats = await stat(filePath);
  if (stats.isDirectory()) {
    throw new Error('Path is a directory, not a file');
  }

  const content = await fs.promises.readFile(filePath, 'utf8');
  debug('File content: ' + content);
  return content;
}
